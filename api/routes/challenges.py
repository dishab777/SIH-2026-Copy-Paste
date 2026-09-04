from enum import Enum
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from api.core.config import get_supabase_admin_client
from api.core.security import CurrentUser, require_government, get_current_user
from api.services.ai_service import generate_challenge_from_pain_point, GeneratedChallenge
from api.services.matching_service import match_startups_for_challenge

router = APIRouter(prefix="/challenges", tags=["Challenges"])


class ChallengeStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    CLOSED = "CLOSED"


class GenerateChallengeRequest(BaseModel):
    department_pain_point: str = Field(
        ...,
        min_length=10,
        description="Raw narrative description of the operational pain point or innovation need",
        example="We have massive delays at municipal water quality inspection checkpoints. Field technicians submit paper logs and test results take 10 days to verify, causing contamination risks."
    )


class CreateChallengeRequest(BaseModel):
    problem_statement: str = Field(..., min_length=10)
    kpis: List[Dict[str, Any]] = Field(
        default=[],
        description="List of KPI dictionaries with metric and target fields"
    )
    tags: List[str] = Field(
        default=[],
        description="List of technical/domain tags"
    )
    status: ChallengeStatus = Field(default=ChallengeStatus.DRAFT)


@router.post("/generate", response_model=GeneratedChallenge)
async def generate_challenge(
    payload: GenerateChallengeRequest,
    current_user: CurrentUser = Depends(require_government)
):
    """
    [Auth: GOVERNMENT] Converts an unstructured departmental pain point
    into a formal public procurement challenge using LLM AI.
    """
    try:
        challenge_data = await generate_challenge_from_pain_point(payload.department_pain_point)
        return challenge_data
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI generation failed: {str(err)}",
        )


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_challenge(
    payload: CreateChallengeRequest,
    current_user: CurrentUser = Depends(require_government)
):
    """
    [Auth: GOVERNMENT] Persists a drafted or published innovation challenge in the database.
    """
    supabase = get_supabase_admin_client()

    new_challenge = {
        "author_id": current_user.id,
        "problem_statement": payload.problem_statement,
        "kpis": payload.kpis,
        "tags": [t.strip() for t in payload.tags if t.strip()],
        "status": payload.status.value,
    }

    try:
        insert_res = supabase.table("challenges").insert(new_challenge).execute()
        if not insert_res.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save challenge to database",
            )
        return insert_res.data[0]
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while saving challenge: {str(err)}",
        )


@router.get("/{id}/matches")
async def get_challenge_matches(
    id: str,
    current_user: CurrentUser = Depends(require_government)
):
    """
    [Auth: GOVERNMENT] Returns the top 5 verified startups matching the challenge tags.
    """
    try:
        matches = await match_startups_for_challenge(challenge_id=id)
        return {
            "challenge_id": id,
            "total_matches": len(matches),
            "matches": matches,
        }
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Matchmaking query failed: {str(err)}",
        )


@router.get("")
async def list_challenges(
    status_filter: Optional[ChallengeStatus] = Query(None, alias="status"),
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves challenges. Government users see their own and all published ones.
    Startups and evaluators see all published challenges.
    """
    supabase = get_supabase_admin_client()
    query = supabase.table("challenges").select("*, users:author_id(id, full_name, department_name)")

    if status_filter:
        query = query.eq("status", status_filter.value)
    elif current_user.role != "GOVERNMENT":
        query = query.eq("status", "PUBLISHED")

    res = query.order("created_at", desc=True).execute()
    return res.data or []


@router.get("/{id}")
async def get_challenge_detail(
    id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """
    Retrieves single challenge details.
    """
    supabase = get_supabase_admin_client()
    res = (
        supabase.table("challenges")
        .select("*, users:author_id(id, full_name, department_name)")
        .eq("id", id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge '{id}' not found",
        )
    return res.data[0]
