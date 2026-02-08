"""
Audit Log API Endpoints
Track all changes to bookings, guests, inventory, and payments
"""
from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List
from datetime import datetime

from ..models.database import db
from ..models.schemas import (
    AuditLogResponse,
    AuditLogListResponse
)

router = APIRouter(prefix="/audit", tags=["Audit Logs"])


@router.get("")
async def get_audit_logs(
    entity_type: Optional[str] = Query(None, description="Filter by entity type (booking, guest, inventory, payment)"),
    entity_id: Optional[str] = Query(None, description="Filter by entity ID"),
    event_id: Optional[str] = Query(None, description="Filter by event ID"),
    booking_id: Optional[str] = Query(None, description="Filter by booking ID"),
    action: Optional[str] = Query(None, description="Filter by action (CREATE, UPDATE, DELETE, etc.)"),
    performed_by: Optional[str] = Query(None, description="Filter by user who performed action"),
    start_date: Optional[datetime] = Query(None, description="Filter logs after this date"),
    end_date: Optional[datetime] = Query(None, description="Filter logs before this date"),
    limit: int = Query(100, ge=1, le=500, description="Max number of logs to return"),
    offset: int = Query(0, ge=0, description="Number of logs to skip")
):
    """
    Get all audit logs with optional filtering.
    Returns paginated results sorted by timestamp (most recent first).
    """
    logs = db.get_audit_logs(
        entity_type=entity_type,
        entity_id=entity_id,
        event_id=event_id,
        booking_id=booking_id,
        action=action,
        performed_by=performed_by,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )

    # Get total count (without pagination)
    total_logs = db.get_audit_logs(
        entity_type=entity_type,
        entity_id=entity_id,
        event_id=event_id,
        booking_id=booking_id,
        action=action,
        performed_by=performed_by,
        start_date=start_date,
        end_date=end_date,
        limit=10000,
        offset=0
    )

    # Convert datetime to ISO string for JSON serialization
    formatted_logs = []
    for log in logs:
        log_copy = log.copy()
        if "timestamp" in log_copy and hasattr(log_copy["timestamp"], "isoformat"):
            log_copy["timestamp"] = log_copy["timestamp"].isoformat()
        formatted_logs.append(log_copy)

    return {
        "logs": formatted_logs,
        "total": len(total_logs),
        "limit": limit,
        "offset": offset
    }


@router.get("/entity/{entity_type}/{entity_id}")
async def get_entity_audit_history(
    entity_type: str,
    entity_id: str
):
    """
    Get complete audit history for a specific entity.

    - **entity_type**: Type of entity (booking, guest, inventory, payment, event)
    - **entity_id**: UUID of the entity
    """
    logs = db.get_entity_history(entity_type, entity_id)
    formatted_logs = []
    for log in logs:
        log_copy = log.copy()
        if "timestamp" in log_copy and hasattr(log_copy["timestamp"], "isoformat"):
            log_copy["timestamp"] = log_copy["timestamp"].isoformat()
        formatted_logs.append(log_copy)
    return formatted_logs


@router.get("/booking/{booking_id}")
async def get_booking_audit_history(booking_id: str):
    """
    Get all audit logs related to a specific booking.
    Includes booking changes, payments, and status updates.
    """
    # First verify booking exists or existed
    booking = db.get_booking(booking_id)

    logs = db.get_booking_history(booking_id)

    if not logs and not booking:
        raise HTTPException(status_code=404, detail="Booking not found and no audit history exists")

    formatted_logs = []
    for log in logs:
        log_copy = log.copy()
        if "timestamp" in log_copy and hasattr(log_copy["timestamp"], "isoformat"):
            log_copy["timestamp"] = log_copy["timestamp"].isoformat()
        formatted_logs.append(log_copy)
    return formatted_logs


@router.get("/event/{event_id}")
async def get_event_audit_logs(
    event_id: str,
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    action: Optional[str] = Query(None, description="Filter by action"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """
    Get all audit logs for a specific event.
    Includes all bookings, guests, inventory changes, and payments.
    """
    logs = db.get_audit_logs(
        event_id=event_id,
        entity_type=entity_type,
        action=action,
        limit=limit,
        offset=offset
    )

    total_logs = db.get_audit_logs(
        event_id=event_id,
        entity_type=entity_type,
        action=action,
        limit=10000,
        offset=0
    )

    formatted_logs = []
    for log in logs:
        log_copy = log.copy()
        if "timestamp" in log_copy and hasattr(log_copy["timestamp"], "isoformat"):
            log_copy["timestamp"] = log_copy["timestamp"].isoformat()
        formatted_logs.append(log_copy)

    return {
        "logs": formatted_logs,
        "total": len(total_logs),
        "limit": limit,
        "offset": offset
    }


@router.get("/summary/{event_id}")
async def get_audit_summary(event_id: str):
    """
    Get a summary of audit activity for an event.
    Returns counts by action type and entity type.
    """
    all_logs = db.get_audit_logs(event_id=event_id, limit=10000)

    # Count by action
    action_counts = {}
    for log in all_logs:
        action = log["action"]
        action_counts[action] = action_counts.get(action, 0) + 1

    # Count by entity type
    entity_counts = {}
    for log in all_logs:
        entity = log["entity_type"]
        entity_counts[entity] = entity_counts.get(entity, 0) + 1

    # Recent activity (last 10)
    recent = all_logs[:10]

    return {
        "event_id": event_id,
        "total_logs": len(all_logs),
        "by_action": action_counts,
        "by_entity": entity_counts,
        "recent_activity": recent
    }
