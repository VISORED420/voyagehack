"""
Vercel Serverless Function - FastAPI Handler
This wraps the FastAPI app for Vercel's serverless environment
"""
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta
from mangum import Mangum
import os
import uuid
import httpx
import base64
import logging

logger = logging.getLogger(__name__)

# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Group Booking Dashboard API",
    description="API for managing group hotel bookings with TBO integration",
    version="1.0.0"
)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# IN-MEMORY DATABASE (for demo - use real DB in production)
# ============================================================

class InMemoryDB:
    def __init__(self):
        self._events: Dict[str, dict] = {}
        self._inventory: Dict[str, dict] = {}
        self._bookings: Dict[str, dict] = {}
        self._load_sample_data()

    def _load_sample_data(self):
        event_id = "33333333-3333-3333-3333-333333333333"
        self._events[event_id] = {
            "id": event_id,
            "name": "Sharma-Gupta Wedding",
            "event_code": "WED-2025-SG",
            "event_type": "Wedding",
            "start_date": "2025-03-15",
            "end_date": "2025-03-18",
            "destination": "Udaipur, Rajasthan",
            "status": "active",
        }

        inv1_id = "44444444-4444-4444-4444-444444444444"
        inv2_id = "55555555-5555-5555-5555-555555555555"
        inv3_id = "66666666-6666-6666-6666-666666666666"

        self._inventory[inv1_id] = {
            "id": inv1_id,
            "event_id": event_id,
            "hotel_name": "Taj Lake Palace",
            "room_type": "Deluxe Lake View",
            "total_rooms_blocked": 30,
            "rooms_booked": 24,
            "negotiated_rate": 18000.00,
            "rack_rate": 25000.00,
            "valid_from": "2025-03-14",
            "valid_to": "2025-03-19",
            "release_date": "2025-03-10",
            "inclusions": ["Breakfast Buffet", "Airport Transfer", "Wi-Fi"],
            "meal_plan": "CP"
        }

        self._inventory[inv2_id] = {
            "id": inv2_id,
            "event_id": event_id,
            "hotel_name": "Taj Lake Palace",
            "room_type": "Luxury Suite",
            "total_rooms_blocked": 10,
            "rooms_booked": 7,
            "negotiated_rate": 35000.00,
            "rack_rate": 50000.00,
            "valid_from": "2025-03-14",
            "valid_to": "2025-03-19",
            "release_date": "2025-03-10",
            "inclusions": ["Breakfast Buffet", "Airport Transfer", "Wi-Fi", "Butler Service"],
            "meal_plan": "CP"
        }

        self._inventory[inv3_id] = {
            "id": inv3_id,
            "event_id": event_id,
            "hotel_name": "Oberoi Udaivilas",
            "room_type": "Premier Room",
            "total_rooms_blocked": 10,
            "rooms_booked": 7,
            "negotiated_rate": 22000.00,
            "rack_rate": 32000.00,
            "valid_from": "2025-03-14",
            "valid_to": "2025-03-19",
            "release_date": "2025-03-08",
            "inclusions": ["Breakfast", "Airport Pickup", "Wi-Fi"],
            "meal_plan": "CP"
        }

        # Sample bookings
        self._bookings = {
            "b1": {
                "id": "b1",
                "event_id": event_id,
                "booking_reference": "WED-SG-001",
                "guest_name": "Rajesh Kumar",
                "guest_email": "rajesh@email.com",
                "guest_phone": "+91-9876543210",
                "hotel_name": "Taj Lake Palace",
                "room_type": "Deluxe Lake View",
                "check_in_date": "2025-03-15",
                "check_out_date": "2025-03-18",
                "num_rooms": 2,
                "total_amount": 108000,
                "amount_paid": 54000,
                "status": "confirmed",
                "payment_status": "partial"
            }
        }

    def get_event(self, event_id: str):
        return self._events.get(event_id)

    def get_inventory(self, event_id: str):
        return [inv for inv in self._inventory.values() if inv["event_id"] == event_id]

    def get_inventory_item(self, inventory_id: str):
        return self._inventory.get(inventory_id)

    def create_inventory(self, data: dict):
        inv_id = str(uuid.uuid4())
        data["id"] = inv_id
        data["rooms_booked"] = 0
        self._inventory[inv_id] = data
        return data

    def get_bookings(self, event_id: str):
        return [b for b in self._bookings.values() if b["event_id"] == event_id]


db = InMemoryDB()

# ============================================================
# TBO API CLIENT
# ============================================================

TBO_BASE_URL = "https://affiliate.tektravels.com/HotelAPI/V1/Rest"
TBO_USERNAME = os.environ.get("TBO_USERNAME", "")
TBO_PASSWORD = os.environ.get("TBO_PASSWORD", "")


def get_tbo_auth_header():
    credentials = f"{TBO_USERNAME}:{TBO_PASSWORD}"
    encoded = base64.b64encode(credentials.encode()).decode()
    return {"Authorization": f"Basic {encoded}"}


async def tbo_request(endpoint: str, payload: dict = None, method: str = "POST"):
    async with httpx.AsyncClient(timeout=30.0) as client:
        url = f"{TBO_BASE_URL}/{endpoint}"
        headers = get_tbo_auth_header()
        headers["Content-Type"] = "application/json"

        if method == "GET":
            response = await client.get(url, headers=headers)
        else:
            response = await client.post(url, json=payload, headers=headers)

        response.raise_for_status()
        return response.json()


# ============================================================
# SCHEMAS
# ============================================================

class InventoryCreate(BaseModel):
    event_id: str
    hotel_name: str
    room_type: str
    total_rooms_blocked: int
    negotiated_rate: float
    valid_from: str
    valid_to: str
    rack_rate: Optional[float] = None
    release_date: Optional[str] = None
    inclusions: Optional[List[str]] = []
    meal_plan: Optional[str] = "CP"
    tbo_hotel_code: Optional[str] = None


class HotelSearchRequest(BaseModel):
    hotel_codes: List[str]
    check_in: str
    check_out: str
    rooms: int = 1
    adults: int = 2


# ============================================================
# API ROUTES
# ============================================================

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}


@app.get("/api/events/{event_id}")
async def get_event(event_id: str):
    event = db.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@app.get("/api/dashboard/event/{event_id}/stats")
async def get_dashboard_stats(event_id: str):
    event = db.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    inventory = db.get_inventory(event_id)
    bookings = db.get_bookings(event_id)

    total_blocked = sum(inv["total_rooms_blocked"] for inv in inventory)
    total_booked = sum(inv["rooms_booked"] for inv in inventory)
    total_value = sum(b.get("total_amount", 0) for b in bookings)
    collected = sum(b.get("amount_paid", 0) for b in bookings)

    return {
        "event": event,
        "inventory": inventory,
        "bookings": bookings,
        "stats": {
            "totalRooms": total_blocked,
            "bookedRooms": total_booked,
            "totalGuests": len(bookings),
            "occupancyRate": round((total_booked / total_blocked * 100), 1) if total_blocked > 0 else 0,
            "totalValue": total_value,
            "collected": collected,
            "pendingAmount": total_value - collected,
            "collectionRate": round((collected / total_value * 100), 1) if total_value > 0 else 0
        }
    }


@app.get("/api/inventory/event/{event_id}")
async def get_event_inventory(event_id: str):
    inventory = db.get_inventory(event_id)
    result = []
    for inv in inventory:
        inv_copy = inv.copy()
        inv_copy["rooms_available"] = inv["total_rooms_blocked"] - inv["rooms_booked"]
        result.append(inv_copy)
    return result


@app.post("/api/inventory")
async def create_inventory(inventory: InventoryCreate):
    event = db.get_event(inventory.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    data = inventory.model_dump()
    created = db.create_inventory(data)
    created["rooms_available"] = created["total_rooms_blocked"] - created["rooms_booked"]
    return created


@app.put("/api/inventory/{inventory_id}")
async def update_inventory(inventory_id: str, update: dict):
    inventory = db.get_inventory_item(inventory_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")

    allowed_fields = [
        "hotel_name", "room_type", "total_rooms_blocked",
        "negotiated_rate", "rack_rate", "valid_from", "valid_to",
        "release_date", "inclusions", "meal_plan"
    ]
    for field in allowed_fields:
        if field in update:
            inventory[field] = update[field]

    inventory["rooms_available"] = inventory["total_rooms_blocked"] - inventory["rooms_booked"]
    return inventory


# ============================================================
# TBO API ROUTES
# ============================================================

@app.get("/api/tbo/health")
async def tbo_health():
    return {
        "status": "configured" if TBO_USERNAME else "not_configured",
        "base_url": TBO_BASE_URL
    }


@app.get("/api/tbo/cities")
async def get_cities():
    return {
        "cities": [
            {"code": "115936", "name": "Udaipur", "country": "India"},
            {"code": "111124", "name": "Mumbai", "country": "India"},
            {"code": "105859", "name": "Delhi", "country": "India"},
            {"code": "101214", "name": "Dubai", "country": "UAE"},
            {"code": "100237", "name": "Bangkok", "country": "Thailand"},
            {"code": "115488", "name": "Singapore", "country": "Singapore"},
            {"code": "100239", "name": "Bali", "country": "Indonesia"},
            {"code": "112131", "name": "London", "country": "United Kingdom"},
            {"code": "113407", "name": "Paris", "country": "France"},
        ]
    }


@app.get("/api/tbo/hotels/{hotel_code}/details")
async def get_hotel_details(hotel_code: str):
    try:
        result = await tbo_request("HotelDetails", {"Hotelcodes": hotel_code, "Language": "EN"})
        hotels = result.get("Hotels", [])
        if hotels:
            hotel = hotels[0]
            return {
                "hotel_code": str(hotel.get("HotelCode", "")),
                "hotel_name": hotel.get("HotelName", ""),
                "star_rating": hotel.get("StarRating", 0),
                "address": hotel.get("Address", ""),
                "city": hotel.get("CityName", ""),
                "country": hotel.get("CountryName", ""),
                "description": hotel.get("Description", "")
            }
        raise HTTPException(status_code=404, detail="Hotel not found")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tbo/hotels/search")
async def search_hotels(request: HotelSearchRequest):
    try:
        payload = {
            "HotelCodes": ",".join(request.hotel_codes),
            "CheckIn": request.check_in,
            "CheckOut": request.check_out,
            "GuestNationality": "IN",
            "PreferredCurrencyCode": "INR",
            "NoOfRooms": request.rooms,
            "PaxRooms": [{"Adults": request.adults, "Children": 0, "ChildAge": []}],
            "ResponseTime": 23,
            "IsDetailedResponse": True
        }
        result = await tbo_request("HotelSearch", payload)
        hotels = result.get("Hotels", {})
        if isinstance(hotels, dict):
            hotels = hotels.get("Hotel", [])
        return {"hotels": hotels}
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tbo/hotels/by-city/{city_code}")
async def get_hotels_by_city(city_code: str, limit: int = 20):
    try:
        result = await tbo_request("CityHotelList", {"CityCode": city_code, "Language": "EN"})
        hotels = result.get("Hotels", [])[:limit]
        return {
            "hotels": [
                {
                    "hotel_code": str(h.get("HotelCode", "")),
                    "hotel_name": h.get("HotelName", ""),
                    "star_rating": h.get("StarRating", 0),
                    "address": h.get("Address", ""),
                    "city": h.get("CityName", ""),
                    "country": h.get("CountryName", "")
                }
                for h in hotels
            ],
            "total": len(hotels)
        }
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# VERCEL HANDLER
# ============================================================

handler = Mangum(app, lifespan="off")
