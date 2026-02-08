"""
Guests API Routes
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from typing import List, Optional
import logging
from ..models.database import db
from ..models.schemas import GuestCreate, GuestResponse
from ..services.cache import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/guests", tags=["Guests"])


@router.get("/event/{event_id}", response_model=List[dict])
async def get_event_guests(event_id: str):
    """Get all guests for an event"""
    guests = db.get_guests(event_id)
    return [{
        **g,
        "created_at": g["created_at"].isoformat() if g.get("created_at") else None
    } for g in guests]


@router.get("/{guest_id}")
async def get_guest(guest_id: str):
    """Get a specific guest"""
    guest = db.get_guest(guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")
    return {
        **guest,
        "created_at": guest["created_at"].isoformat() if guest.get("created_at") else None
    }


@router.post("", response_model=dict)
async def create_guest(guest: GuestCreate):
    """Add a new guest"""
    guest_data = guest.model_dump()
    created = db.create_guest(guest_data)

    # Log audit entry
    db.log_audit(
        entity_type="guest",
        entity_id=created.get("id"),
        action="CREATE",
        new_value={"name": guest.name, "email": guest.email, "category": guest.category},
        event_id=guest.event_id,
        performed_by="dashboard_user",
        notes=f"Guest '{guest.name}' added to event"
    )

    # Invalidate cache for this event
    event_id = guest.event_id
    await cache_service.invalidate_event_cache(event_id)
    logger.info(f"Cache invalidated for event {event_id} after guest creation")

    return created


@router.put("/{guest_id}")
async def update_guest(guest_id: str, update: dict):
    """Update a guest"""
    guest = db.get_guest(guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    # Store old values for audit
    old_values = {k: guest.get(k) for k in update.keys()}

    updated = db.update_guest(guest_id, update)

    # Log audit entry
    event_id = guest.get("event_id")
    changes = {k: {"old": old_values.get(k), "new": v} for k, v in update.items() if old_values.get(k) != v}
    if changes:
        db.log_audit(
            entity_type="guest",
            entity_id=guest_id,
            action="UPDATE",
            changes=changes,
            old_value=old_values,
            new_value=update,
            event_id=event_id,
            performed_by="dashboard_user",
            notes=f"Guest '{guest.get('name', 'Unknown')}' updated"
        )

    # Invalidate cache for this event
    if event_id:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after guest update")

    return updated


@router.delete("/{guest_id}")
async def delete_guest(guest_id: str):
    """Remove a guest"""
    guest = db.get_guest(guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    event_id = guest.get("event_id")
    guest_name = guest.get("name", "Unknown")

    # Log audit entry before deletion
    db.log_audit(
        entity_type="guest",
        entity_id=guest_id,
        action="DELETE",
        old_value={"name": guest_name, "email": guest.get("email"), "rsvp_status": guest.get("rsvp_status")},
        event_id=event_id,
        performed_by="dashboard_user",
        notes=f"Guest '{guest_name}' removed from event"
    )

    del db._guests[guest_id]

    # Invalidate cache for this event
    if event_id:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after guest deletion")

    return {"message": "Guest removed successfully"}


@router.post("/{guest_id}/rsvp")
async def update_rsvp(guest_id: str, rsvp_status: str = Query(..., description="RSVP status")):
    """Update guest RSVP status"""
    guest = db.get_guest(guest_id)
    if not guest:
        raise HTTPException(status_code=404, detail="Guest not found")

    valid_statuses = ["pending", "confirmed", "declined", "attending", "not_attending", "maybe", "tentative"]
    if rsvp_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid RSVP status. Must be one of: {valid_statuses}")

    old_status = guest.get("rsvp_status", "pending")
    updated = db.update_guest(guest_id, {"rsvp_status": rsvp_status})

    # Log audit entry for RSVP change
    event_id = guest.get("event_id")
    db.log_audit(
        entity_type="guest",
        entity_id=guest_id,
        action="RSVP_UPDATE",
        changes={"rsvp_status": {"old": old_status, "new": rsvp_status}},
        event_id=event_id,
        performed_by="dashboard_user",
        notes=f"RSVP status changed from '{old_status}' to '{rsvp_status}' for guest '{guest.get('name', 'Unknown')}'"
    )

    # Invalidate cache for this event
    if event_id:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after RSVP update")

    return updated


@router.post("/event/{event_id}/import")
async def import_guests(event_id: str, file: UploadFile = File(...)):
    """Import guests from Excel/CSV file"""
    # Verify event exists
    event = db.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # In production, parse the file and create guests
    # For demo, return a mock response
    return {
        "message": "Guests imported successfully",
        "imported": 10,
        "skipped": 2,
        "errors": []
    }


@router.post("/event/{event_id}/send-invitations")
async def send_invitations(event_id: str, guest_ids: List[str] = None):
    """Send invitations to guests"""
    event = db.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    guests = db.get_guests(event_id)

    if guest_ids:
        guests = [g for g in guests if g["id"] in guest_ids]

    sent = 0
    for guest in guests:
        if guest.get("email"):
            # In production, integrate with notification service
            db.update_guest(guest["id"], {"invitation_status": "sent"})
            sent += 1

    # Invalidate cache for this event (guest statuses changed)
    if sent > 0:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after sending {sent} invitations")

    return {
        "message": f"Invitations sent to {sent} guests",
        "sent": sent,
        "total": len(guests)
    }
