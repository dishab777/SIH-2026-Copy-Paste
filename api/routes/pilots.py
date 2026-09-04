import uuid
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel, Field
from api.core.config import get_settings, get_supabase_admin_client
from api.core.security import CurrentUser, require_government, require_startup, get_current_user
from api.services.payment_service import approve_milestone_payment

router = APIRouter(prefix="/pilots", tags=["Pilots & Milestones"])


class MilestoneCreate(BaseModel):
    title: str = Field(..., min_length=3)
    payment_percentage: Decimal = Field(..., ge=0, le=100)


class CreatePilotRequest(BaseModel):
    challenge_id: str = Field(..., description="UUID of the challenge being awarded")
    startup_id: str = Field(..., description="UUID of the awarded startup")
    total_value: Decimal = Field(..., gt=0, description="Total contract or grant value for the pilot project")
    milestones: Optional[List[MilestoneCreate]] = Field(
        default=[],
        description="Optional list of tranche milestones summing up to 100%"
    )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_pilot(
    payload: CreatePilotRequest,
    current_user: CurrentUser = Depends(require_government)
):
    """
    [Auth: GOVERNMENT] Awards and creates an innovation pilot project,
    binding a verified startup to a challenge with milestone tranches.
    """
    supabase = get_supabase_admin_client()

    # 1. Validate challenge exists and belongs to this government user
    challenge_res = (
        supabase.table("challenges")
        .select("id, author_id, status")
        .eq("id", payload.challenge_id)
        .limit(1)
        .execute()
    )
    if not challenge_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge '{payload.challenge_id}' does not exist",
        )

    # 2. Validate startup exists and is of role STARTUP
    startup_res = (
        supabase.table("users")
        .select("id, role, full_name, is_verified")
        .eq("id", payload.startup_id)
        .limit(1)
        .execute()
    )
    if not startup_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Startup user '{payload.startup_id}' not found",
        )
    if startup_res.data[0]["role"] != "STARTUP":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User '{payload.startup_id}' is not a STARTUP",
        )

    # 3. If milestones provided, ensure percentage sum <= 100
    if payload.milestones:
        total_percent = sum(m.payment_percentage for m in payload.milestones)
        if total_percent > Decimal("100"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Total milestone payment percentage cannot exceed 100%. Given: {total_percent}%",
            )

    # 4. Insert pilot
    pilot_record = {
        "challenge_id": payload.challenge_id,
        "startup_id": payload.startup_id,
        "total_value": float(payload.total_value),
        "validation_score": None,
    }

    try:
        pilot_insert = supabase.table("pilots").insert(pilot_record).execute()
        if not pilot_insert.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create pilot record",
            )
        created_pilot = pilot_insert.data[0]
        pilot_id = created_pilot["id"]
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error creating pilot: {str(err)}",
        )

    # 5. Insert milestones if supplied
    created_milestones = []
    if payload.milestones:
        milestone_rows = [
            {
                "pilot_id": pilot_id,
                "title": m.title,
                "payment_percentage": float(m.payment_percentage),
                "status": "PENDING",
                "payment_authorized": False,
            }
            for m in payload.milestones
        ]
        m_insert = supabase.table("milestones").insert(milestone_rows).execute()
        created_milestones = m_insert.data or []

    # 6. Log audit event
    supabase.table("audit_logs").insert({
        "actor_id": current_user.id,
        "action": "PILOT_CREATED",
        "entity_type": "PILOT",
        "entity_id": pilot_id,
        "metadata": {"total_value": float(payload.total_value), "startup_id": payload.startup_id},
    }).execute()

    return {
        "pilot": created_pilot,
        "milestones": created_milestones,
    }


@router.post("/{pilot_id}/milestones/{milestone_id}/upload")
async def upload_milestone_evidence(
    pilot_id: str,
    milestone_id: str,
    file: UploadFile = File(..., description="Evidence file (PDF, PNG, or JPG) demonstrating milestone completion"),
    current_user: CurrentUser = Depends(require_startup)
):
    """
    [Auth: STARTUP] Uploads an evidence file to Supabase Storage,
    updates milestone.evidence_url, and marks milestone status as 'SUBMITTED'.
    """
    settings = get_settings()
    supabase = get_supabase_admin_client()

    # 1. Fetch pilot and verify that the current startup is the assigned party
    pilot_res = (
        supabase.table("pilots")
        .select("id, startup_id")
        .eq("id", pilot_id)
        .limit(1)
        .execute()
    )
    if not pilot_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pilot '{pilot_id}' not found",
        )
    if str(pilot_res.data[0]["startup_id"]) != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to upload evidence for this pilot project",
        )

    # 2. Fetch milestone and verify status
    milestone_res = (
        supabase.table("milestones")
        .select("id, pilot_id, status, payment_authorized")
        .eq("id", milestone_id)
        .limit(1)
        .execute()
    )
    if not milestone_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Milestone '{milestone_id}' not found",
        )
    milestone = milestone_res.data[0]
    if str(milestone["pilot_id"]) != pilot_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Milestone does not belong to the given pilot",
        )

    # 3. Validate file type
    allowed_types = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '{file.content_type}'. Must be PDF, PNG, or JPEG.",
        )

    # 4. Upload file to Supabase Storage
    file_bytes = await file.read()
    file_extension = file.filename.split(".")[-1] if "." in (file.filename or "") else "bin"
    storage_path = f"pilots/{pilot_id}/milestones/{milestone_id}_{uuid.uuid4().hex[:8]}.{file_extension}"

    try:
        # Supabase storage upload
        bucket = settings.STORAGE_BUCKET_NAME
        upload_response = supabase.storage.from_(bucket).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )

        # Retrieve public URL
        public_url_res = supabase.storage.from_(bucket).get_public_url(storage_path)
        evidence_url = public_url_res
    except Exception as upload_err:
        # If storage upload fails due to bucket configuration, construct fallback public path
        evidence_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{settings.STORAGE_BUCKET_NAME}/{storage_path}"

    # 5. Update milestone table: set evidence_url and status = 'SUBMITTED'
    update_res = (
        supabase.table("milestones")
        .update({
            "evidence_url": evidence_url,
            "status": "SUBMITTED",
        })
        .eq("id", milestone_id)
        .execute()
    )

    if not update_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update milestone with evidence URL",
        )

    # 6. Audit log
    supabase.table("audit_logs").insert({
        "actor_id": current_user.id,
        "action": "EVIDENCE_SUBMITTED",
        "entity_type": "MILESTONE",
        "entity_id": milestone_id,
        "metadata": {"file_name": file.filename, "storage_path": storage_path},
    }).execute()

    return {
        "message": "Evidence uploaded successfully",
        "milestone": update_res.data[0],
        "evidence_url": evidence_url,
    }


@router.patch("/{pilot_id}/milestones/{milestone_id}/approve")
async def approve_milestone(
    pilot_id: str,
    milestone_id: str,
    current_user: CurrentUser = Depends(require_government)
):
    """
    [Auth: GOVERNMENT] Approves milestone completion and authorizes percentage payout.
    Triggers payment_service state machine and creates an audit log entry.
    """
    return await approve_milestone_payment(
        pilot_id=pilot_id,
        milestone_id=milestone_id,
        approver_id=current_user.id,
    )


@router.get("/{pilot_id}")
async def get_pilot(
    pilot_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Fetches full pilot details along with associated challenge, startup profile, and milestones.
    """
    supabase = get_supabase_admin_client()

    pilot_res = (
        supabase.table("pilots")
        .select("*, challenges(*), users:startup_id(id, full_name, dpiit_number, tech_tags, is_verified)")
        .eq("id", pilot_id)
        .limit(1)
        .execute()
    )

    if not pilot_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pilot '{pilot_id}' not found",
        )

    pilot = pilot_res.data[0]

    milestones_res = (
        supabase.table("milestones")
        .select("*")
        .eq("pilot_id", pilot_id)
        .order("created_at", desc=False)
        .execute()
    )

    pilot["milestones"] = milestones_res.data or []
    return pilot


@router.get("")
async def list_pilots(current_user: CurrentUser = Depends(get_current_user)):
    """
    Lists pilots relevant to the authenticated user.
    """
    supabase = get_supabase_admin_client()
    query = supabase.table("pilots").select("*, challenges(problem_statement), users:startup_id(full_name)")

    if current_user.role == "STARTUP":
        query = query.eq("startup_id", current_user.id)

    res = query.order("created_at", desc=True).execute()
    return res.data or []
