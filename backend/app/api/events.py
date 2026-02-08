"""
Events API Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
from datetime import date
from ..models.database import db
from ..models.schemas import EventCreate, EventResponse

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("", response_model=List[dict])
async def get_events():
    """Get all events"""
    events = db.get_events()
    result = []
    for event in events:
        days_to_event = (event["start_date"] - date.today()).days
        result.append({
            **event,
            "days_to_event": max(0, days_to_event),
            "start_date": event["start_date"].isoformat(),
            "end_date": event["end_date"].isoformat(),
            "booking_deadline": event["booking_deadline"].isoformat() if event.get("booking_deadline") else None,
            "created_at": event["created_at"].isoformat()
        })
    return result


@router.get("/{event_id}")
async def get_event(event_id: str):
    """Get event by ID"""
    event = db.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    days_to_event = (event["start_date"] - date.today()).days
    return {
        **event,
        "days_to_event": max(0, days_to_event),
        "start_date": event["start_date"].isoformat(),
        "end_date": event["end_date"].isoformat(),
        "booking_deadline": event["booking_deadline"].isoformat() if event.get("booking_deadline") else None,
        "created_at": event["created_at"].isoformat()
    }


@router.post("", response_model=dict)
async def create_event(event: EventCreate):
    """Create a new event"""
    event_data = event.model_dump()
    created = db.create_event(event_data)
    return created


@router.put("/{event_id}")
async def update_event(event_id: str, event_update: dict):
    """Update an event"""
    event = db.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.update(event_update)
    return event


@router.delete("/{event_id}")
async def delete_event(event_id: str):
    """Delete an event"""
    event = db.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # In a real app, check for related bookings before deletion
    del db._events[event_id]
    return {"message": "Event deleted successfully"}
