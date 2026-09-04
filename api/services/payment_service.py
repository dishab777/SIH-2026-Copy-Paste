from decimal import Decimal
from typing import Dict, Any
from fastapi import HTTPException, status
from api.core.config import get_supabase_admin_client


async def approve_milestone_payment(
    pilot_id: str,
    milestone_id: str,
    approver_id: str
) -> Dict[str, Any]:
    """
    Executes the milestone payment state machine:
    1. Fetches milestone & parent pilot.
    2. Validates existence and authorization state.
    3. Calculates authorized payout = (pilot.total_value * milestone.payment_percentage) / 100.
    4. Updates milestone to APPROVED and payment_authorized = True.
    5. Writes an immutable audit log entry.
    """
    supabase = get_supabase_admin_client()

    # 1. Fetch milestone
    milestone_res = (
        supabase.table("milestones")
        .select("id, pilot_id, title, payment_percentage, status, payment_authorized, evidence_url")
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

    # Verify that milestone belongs to the specified pilot
    if str(milestone["pilot_id"]) != str(pilot_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Milestone '{milestone_id}' does not belong to pilot '{pilot_id}'",
        )

    # 2. Fetch parent pilot
    pilot_res = (
        supabase.table("pilots")
        .select("id, challenge_id, startup_id, total_value")
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

    # Check if already approved
    if milestone.get("payment_authorized") or milestone.get("status") == "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Milestone '{milestone_id}' payment has already been authorized",
        )

    # 3. Calculate payment amount: (pilot.total_value * milestone.payment_percentage) / 100
    try:
        total_value = Decimal(str(pilot["total_value"]))
        percentage = Decimal(str(milestone["payment_percentage"]))
        payment_amount = (total_value * percentage) / Decimal("100")
        payment_amount_float = float(round(payment_amount, 2))
    except Exception as calc_err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate milestone payment amount: {str(calc_err)}",
        )

    # 4. Update milestones table: set status = 'APPROVED', payment_authorized = True
    update_res = (
        supabase.table("milestones")
        .update({
            "status": "APPROVED",
            "payment_authorized": True,
        })
        .eq("id", milestone_id)
        .execute()
    )

    if not update_res.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update milestone status in database",
        )

    updated_milestone = update_res.data[0]

    # 5. Create an entry in audit_logs
    audit_payload = {
        "actor_id": approver_id,
        "action": "PAYMENT_AUTHORIZED",
        "entity_type": "MILESTONE",
        "entity_id": milestone_id,
        "metadata": {
            "pilot_id": pilot_id,
            "startup_id": pilot["startup_id"],
            "payment_percentage": float(percentage),
            "total_pilot_value": float(total_value),
            "payment_authorized_amount": payment_amount_float,
        },
    }

    supabase.table("audit_logs").insert(audit_payload).execute()

    return {
        "message": "Milestone approved and payment authorized successfully",
        "milestone_id": milestone_id,
        "pilot_id": pilot_id,
        "status": updated_milestone["status"],
        "payment_authorized": updated_milestone["payment_authorized"],
        "payment_percentage": float(percentage),
        "total_pilot_value": float(total_value),
        "authorized_payout_amount": payment_amount_float,
    }
