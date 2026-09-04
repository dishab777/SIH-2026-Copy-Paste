from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from api.core.config import get_supabase_admin_client
from api.core.security import CurrentUser, require_evaluator, get_current_user

router = APIRouter(prefix="/validation", tags=["Validation & Scale-Up Readiness"])


class ScoreValidationRequest(BaseModel):
    validation_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Independent evaluator score between 0 and 100 assessing pilot technical readiness"
    )
    remarks: Optional[str] = Field(None, description="Evaluator qualitative assessment or recommendations")
    kpi_evaluations: Optional[List[Dict[str, Any]]] = Field(
        default=[],
        description="List of KPI target vs actual evaluations, e.g. [{'metric': 'turnaround', 'target': '2 hrs', 'actual': '1.5 hrs', 'met': True}]"
    )


@router.post("/{pilot_id}/score")
async def update_pilot_validation_score(
    pilot_id: str,
    payload: ScoreValidationRequest,
    current_user: CurrentUser = Depends(require_evaluator)
):
    """
    [Auth: EVALUATOR] Updates the independent pilot validation score (0-100),
    records KPI actual performance metrics, and generates an audit record.
    """
    supabase = get_supabase_admin_client()

    # 1. Fetch pilot
    pilot_res = (
        supabase.table("pilots")
        .select("id, total_value, startup_id, challenge_id")
        .eq("id", pilot_id)
        .limit(1)
        .execute()
    )

    if not pilot_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pilot project '{pilot_id}' not found",
        )

    # 2. Update validation score on pilot
    update_res = (
        supabase.table("pilots")
        .update({
            "validation_score": payload.validation_score,
        })
        .eq("id", pilot_id)
        .execute()
    )

    if not update_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update pilot validation score in database",
        )

    # 3. Create Audit Log
    supabase.table("audit_logs").insert({
        "actor_id": current_user.id,
        "action": "VALIDATION_SCORE_UPDATED",
        "entity_type": "PILOT",
        "entity_id": pilot_id,
        "metadata": {
            "validation_score": payload.validation_score,
            "remarks": payload.remarks,
            "kpi_evaluations": payload.kpi_evaluations,
        },
    }).execute()

    return {
        "message": "Validation score updated successfully",
        "pilot_id": pilot_id,
        "validation_score": payload.validation_score,
        "remarks": payload.remarks,
    }


@router.get("/{pilot_id}/report")
async def get_scale_up_readiness_report(
    pilot_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    [Auth: Authenticated] Generates the Scale-Up Readiness Report
    comparing Challenge KPIs vs Pilot Milestones & Evaluator Validation.
    """
    supabase = get_supabase_admin_client()

    # 1. Fetch pilot with challenge and startup
    pilot_res = (
        supabase.table("pilots")
        .select("*, challenges(*), users:startup_id(*)")
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
    challenge = pilot.get("challenges") or {}
    startup = pilot.get("users") or {}

    # 2. Fetch milestones
    milestones_res = (
        supabase.table("milestones")
        .select("*")
        .eq("pilot_id", pilot_id)
        .order("created_at", desc=False)
        .execute()
    )
    milestones = milestones_res.data or []

    # 3. Fetch latest evaluation audit log if present
    audit_res = (
        supabase.table("audit_logs")
        .select("metadata, timestamp")
        .eq("entity_id", pilot_id)
        .eq("action", "VALIDATION_SCORE_UPDATED")
        .order("timestamp", desc=True)
        .limit(1)
        .execute()
    )
    eval_log = audit_res.data[0] if audit_res.data else None
    eval_metadata = eval_log.get("metadata", {}) if eval_log else {}

    # 4. Synthesize calculations
    total_milestones = len(milestones)
    approved_milestones = [m for m in milestones if m.get("status") == "APPROVED"]
    submitted_milestones = [m for m in milestones if m.get("status") == "SUBMITTED"]
    pending_milestones = [m for m in milestones if m.get("status") == "PENDING"]

    total_value = float(pilot.get("total_value", 0.0))
    approved_percent = sum(float(m.get("payment_percentage", 0)) for m in approved_milestones)
    total_paid_out = round((total_value * approved_percent) / 100.0, 2)
    remaining_value = round(total_value - total_paid_out, 2)

    val_score = pilot.get("validation_score")

    # Determine Readiness Tier
    if val_score is None:
        readiness_status = "EVALUATION_PENDING"
        readiness_grade = "PENDING"
        recommendation = "Awaiting formal evaluation from designated technical committee."
    elif val_score >= 85 and approved_percent >= 100:
        readiness_status = "READY_FOR_COMMERCIAL_SCALE_UP"
        readiness_grade = "A+"
        recommendation = "Highly Recommended for national public procurement scale-up and government framework contract."
    elif val_score >= 70 and approved_percent >= 70:
        readiness_status = "PROVISIONAL_SCALE_UP"
        readiness_grade = "B"
        recommendation = "Approved for phased regional deployment subject to remaining milestone tranches."
    elif val_score < 50:
        readiness_status = "REMEDIAL_ACTION_REQUIRED"
        readiness_grade = "D"
        recommendation = "Pilot performance failed critical validation thresholds. Startup must address architectural gaps."
    else:
        readiness_status = "IN_PROGRESS"
        readiness_grade = "C"
        recommendation = "Pilot progressing within normal parameters. Complete outstanding milestones."

    # 5. Format comprehensive report
    report = {
        "report_title": "Nexus Pilot Scale-Up Readiness Report",
        "pilot_id": pilot_id,
        "challenge_summary": {
            "challenge_id": challenge.get("id"),
            "problem_statement": challenge.get("problem_statement"),
            "target_tags": challenge.get("tags", []),
            "target_kpis": challenge.get("kpis", []),
        },
        "startup_profile": {
            "startup_id": startup.get("id"),
            "full_name": startup.get("full_name"),
            "dpiit_number": startup.get("dpiit_number"),
            "tech_tags": startup.get("tech_tags", []),
            "is_verified": startup.get("is_verified", False),
        },
        "financial_summary": {
            "total_contract_value": total_value,
            "total_funds_released": total_paid_out,
            "funds_remaining": remaining_value,
            "completion_percentage": round(approved_percent, 1),
        },
        "milestones_breakdown": {
            "total_count": total_milestones,
            "approved_count": len(approved_milestones),
            "submitted_count": len(submitted_milestones),
            "pending_count": len(pending_milestones),
            "items": milestones,
        },
        "validation_evaluation": {
            "validation_score": val_score,
            "evaluator_remarks": eval_metadata.get("remarks"),
            "kpi_performance_matrix": eval_metadata.get("kpi_evaluations", []),
        },
        "scale_up_verdict": {
            "status": readiness_status,
            "grade": readiness_grade,
            "recommendation": recommendation,
        },
    }

    return report
