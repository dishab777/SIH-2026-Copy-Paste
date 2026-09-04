from typing import List, Dict, Any
from fastapi import HTTPException, status
from api.core.config import get_supabase_admin_client


async def match_startups_for_challenge(challenge_id: str) -> List[Dict[str, Any]]:
    """
    Finds top 5 verified startups whose tech_tags match the challenge tags.
    Scores startups by the intersection of challenge.tags and startup.tech_tags.
    """
    supabase = get_supabase_admin_client()

    # 1. Fetch the challenge
    challenge_res = (
        supabase.table("challenges")
        .select("id, tags, problem_statement, status")
        .eq("id", challenge_id)
        .limit(1)
        .execute()
    )

    if not challenge_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Challenge with ID '{challenge_id}' not found",
        )

    challenge = challenge_res.data[0]
    raw_challenge_tags: List[str] = challenge.get("tags") or []
    normalized_challenge_tags = {tag.strip().lower(): tag.strip() for tag in raw_challenge_tags if tag.strip()}

    if not normalized_challenge_tags:
        # If challenge has no tags, return empty or unranked verified startups
        return []

    # 2. Query verified startups
    startups_res = (
        supabase.table("users")
        .select("id, full_name, dpiit_number, tech_tags, is_verified, role")
        .eq("role", "STARTUP")
        .eq("is_verified", True)
        .execute()
    )

    startups = startups_res.data or []
    scored_startups = []

    # 3. Calculate tag intersection score for each startup
    for startup in startups:
        raw_tech_tags: List[str] = startup.get("tech_tags") or []
        normalized_startup_tags = {t.strip().lower(): t.strip() for t in raw_tech_tags if t.strip()}

        # Intersection on lowercase keys
        intersection_keys = set(normalized_challenge_tags.keys()) & set(normalized_startup_tags.keys())
        match_score = len(intersection_keys)

        if match_score > 0:
            matched_tags = [normalized_challenge_tags[k] for k in intersection_keys]
            scored_startups.append({
                "startup_id": startup["id"],
                "startup_name": startup["full_name"],
                "dpiit_number": startup.get("dpiit_number"),
                "tech_tags": raw_tech_tags,
                "is_verified": startup.get("is_verified", False),
                "match_score": match_score,
                "matched_tags": matched_tags,
                "match_percentage": round((match_score / len(normalized_challenge_tags)) * 100, 1),
            })

    # 4. Sort descending by match_score, then by match_percentage
    scored_startups.sort(key=lambda s: (s["match_score"], s["match_percentage"]), reverse=True)

    # Return top 5 matches
    return scored_startups[:5]
