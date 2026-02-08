"""
Inventory API Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
import logging
from ..models.database import db
from ..models.schemas import InventoryCreate, InventoryResponse
from ..services.cache import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def format_inventory_response(inv: dict) -> dict:
    """Format inventory data for response"""
    return {
        "id": inv["id"],
        "event_id": inv["event_id"],
        "hotel_name": inv["hotel_name"],
        "room_type": inv["room_type"],
        "room_type_code": inv.get("room_type_code", ""),
        "tbo_hotel_code": inv.get("tbo_hotel_code"),
        "tbo_room_type_code": inv.get("tbo_room_type_code"),
        "tbo_rate_plan_code": inv.get("tbo_rate_plan_code"),
        "total_rooms_blocked": inv["total_rooms_blocked"],
        "rooms_booked": inv["rooms_booked"],
        "rooms_available": inv["total_rooms_blocked"] - inv["rooms_booked"],
        "negotiated_rate": inv["negotiated_rate"],
        "rack_rate": inv.get("rack_rate"),
        "valid_from": inv["valid_from"].isoformat() if hasattr(inv["valid_from"], "isoformat") else inv["valid_from"],
        "valid_to": inv["valid_to"].isoformat() if hasattr(inv["valid_to"], "isoformat") else inv["valid_to"],
        "release_date": inv["release_date"].isoformat() if inv.get("release_date") and hasattr(inv["release_date"], "isoformat") else inv.get("release_date"),
        "inclusions": inv.get("inclusions", []),
        "meal_plan": inv.get("meal_plan"),
        "utilization_percent": round((inv["rooms_booked"] / inv["total_rooms_blocked"]) * 100, 1) if inv["total_rooms_blocked"] > 0 else 0
    }


@router.get("/event/{event_id}", response_model=List[dict])
async def get_event_inventory(event_id: str):
    """Get all inventory for an event"""
    inventory = db.get_inventory(event_id)
    return [format_inventory_response(inv) for inv in inventory]


@router.get("/{inventory_id}")
async def get_inventory_item(inventory_id: str):
    """Get a specific inventory item"""
    inventory = db.get_inventory_item(inventory_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    return format_inventory_response(inventory)


@router.post("", response_model=dict)
async def create_inventory(inventory: InventoryCreate):
    """Add new room block to inventory"""
    # Verify event exists
    event = db.get_event(inventory.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    inventory_data = inventory.model_dump()
    created = db.create_inventory(inventory_data)

    # Invalidate cache for this event
    await cache_service.invalidate_event_cache(inventory.event_id)
    logger.info(f"Cache invalidated for event {inventory.event_id} after inventory creation")

    return format_inventory_response(created)


@router.put("/{inventory_id}")
async def update_inventory(inventory_id: str, update: dict):
    """Update inventory item"""
    inventory = db.get_inventory_item(inventory_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")

    # Update allowed fields
    allowed_fields = [
        "hotel_name", "room_type", "room_type_code",
        "total_rooms_blocked", "negotiated_rate", "rack_rate",
        "valid_from", "valid_to", "release_date",
        "inclusions", "meal_plan",
        "tbo_hotel_code", "tbo_room_type_code", "tbo_rate_plan_code"
    ]
    for field in allowed_fields:
        if field in update:
            inventory[field] = update[field]

    # Invalidate cache for this event
    event_id = inventory.get("event_id")
    if event_id:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after inventory update")

    return format_inventory_response(inventory)


@router.delete("/{inventory_id}")
async def delete_inventory(inventory_id: str):
    """Remove inventory item"""
    inventory = db.get_inventory_item(inventory_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")

    # Check if any bookings exist for this inventory
    bookings = [b for b in db._bookings.values() if b.get("inventory_id") == inventory_id and b["status"] != "cancelled"]
    if bookings:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete inventory with {len(bookings)} active bookings"
        )

    event_id = inventory.get("event_id")
    del db._inventory[inventory_id]

    # Invalidate cache for this event
    if event_id:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after inventory deletion")

    return {"message": "Inventory removed successfully"}


@router.get("/event/{event_id}/summary")
async def get_inventory_summary(event_id: str):
    """Get inventory summary for an event"""
    inventory = db.get_inventory(event_id)

    total_blocked = sum(inv["total_rooms_blocked"] for inv in inventory)
    total_booked = sum(inv["rooms_booked"] for inv in inventory)
    total_available = total_blocked - total_booked

    hotels = {}
    for inv in inventory:
        hotel = inv["hotel_name"]
        if hotel not in hotels:
            hotels[hotel] = {"blocked": 0, "booked": 0, "rooms": []}
        hotels[hotel]["blocked"] += inv["total_rooms_blocked"]
        hotels[hotel]["booked"] += inv["rooms_booked"]
        hotels[hotel]["rooms"].append({
            "room_type": inv["room_type"],
            "blocked": inv["total_rooms_blocked"],
            "booked": inv["rooms_booked"],
            "available": inv["total_rooms_blocked"] - inv["rooms_booked"],
            "rate": inv["negotiated_rate"]
        })

    return {
        "total_rooms_blocked": total_blocked,
        "total_rooms_booked": total_booked,
        "total_rooms_available": total_available,
        "occupancy_rate": round((total_booked / total_blocked) * 100, 1) if total_blocked > 0 else 0,
        "hotels": hotels
    }
