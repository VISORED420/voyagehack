"""
TBO Hotels REST API Routes
Endpoints for hotel search, availability, and booking via TBO API
"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import date
import logging

from ..services.tbo_client import (
    tbo_client,
    TBOError,
    TBOAuthenticationError,
    TBOTimeoutError
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tbo", tags=["TBO Hotels API"])


# ============================================================
# REQUEST/RESPONSE MODELS
# ============================================================

class HotelSearchRequest(BaseModel):
    """Hotel search request"""
    hotel_codes: List[str] = Field(..., description="List of TBO hotel codes")
    check_in: str = Field(..., description="Check-in date (YYYY-MM-DD)")
    check_out: str = Field(..., description="Check-out date (YYYY-MM-DD)")
    rooms: int = Field(1, ge=1, le=10, description="Number of rooms")
    adults: int = Field(2, ge=1, le=6, description="Adults per room")
    children: int = Field(0, ge=0, le=4, description="Children per room")
    child_ages: Optional[List[int]] = Field(None, description="Ages of children")
    nationality: str = Field("IN", description="Guest nationality code")
    currency: str = Field("INR", description="Preferred currency")


class AvailabilityRequest(BaseModel):
    """Availability check request"""
    hotel_code: str = Field(..., description="TBO hotel code")
    check_in: str = Field(..., description="Check-in date (YYYY-MM-DD)")
    check_out: str = Field(..., description="Check-out date (YYYY-MM-DD)")
    room_type_code: str = Field(..., description="Room type code")
    rate_plan_code: str = Field(..., description="Rate plan code")
    rooms: int = Field(1, description="Number of rooms")
    adults: int = Field(2, description="Adults per room")
    children: int = Field(0, description="Children per room")
    child_ages: Optional[List[int]] = Field(None, description="Ages of children")
    nationality: str = Field("IN", description="Guest nationality code")
    currency: str = Field("INR", description="Preferred currency")


class GuestInfo(BaseModel):
    """Guest information for booking"""
    salutation: str = Field("Mr", description="Mr, Mrs, Ms, Dr")
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    is_lead: bool = Field(False, description="Is lead guest")


class BookingRequest(BaseModel):
    """TBO booking request"""
    hotel_code: str = Field(..., description="TBO hotel code")
    check_in: str = Field(..., description="Check-in date (YYYY-MM-DD)")
    check_out: str = Field(..., description="Check-out date (YYYY-MM-DD)")
    room_type_code: str = Field(..., description="Room type code")
    rate_plan_code: str = Field(..., description="Rate plan code")
    client_reference: str = Field(..., description="Client reference number")
    guests: List[GuestInfo] = Field(..., description="Guest details")
    rooms: int = Field(1, description="Number of rooms")
    total_fare: float = Field(0, description="Total fare")
    nationality: str = Field("IN", description="Guest nationality")
    currency: str = Field("INR", description="Currency")
    special_requests: Optional[str] = Field(None, description="Special requests")


class CancelRequest(BaseModel):
    """Booking cancellation request"""
    booking_id: str = Field(..., description="TBO booking ID")
    remarks: str = Field("Cancelled by guest", description="Cancellation reason")


class SessionResponse(BaseModel):
    """Session status response"""
    session_id: str
    is_valid: bool
    time_remaining_seconds: int
    expires_at: str


# ============================================================
# ENDPOINTS
# ============================================================

@router.get("/session", response_model=SessionResponse)
async def get_session_status():
    """Get current TBO session status"""
    try:
        session = await tbo_client.get_session()
        return SessionResponse(
            session_id=session.session_id,
            is_valid=not session.is_expired,
            time_remaining_seconds=session.time_remaining,
            expires_at=session.expires_at.isoformat()
        )
    except TBOAuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e.message))
    except TBOError as e:
        raise HTTPException(status_code=500, detail=str(e.message))


@router.post("/session/refresh", response_model=SessionResponse)
async def refresh_session():
    """Force refresh TBO session"""
    try:
        session = await tbo_client.get_session(force_refresh=True)
        return SessionResponse(
            session_id=session.session_id,
            is_valid=not session.is_expired,
            time_remaining_seconds=session.time_remaining,
            expires_at=session.expires_at.isoformat()
        )
    except TBOAuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e.message))
    except TBOError as e:
        raise HTTPException(status_code=500, detail=str(e.message))


@router.get("/hotels/codes")
async def get_hotel_codes(limit: int = Query(100, description="Max number of codes to return")):
    """Get list of available TBO hotel codes"""
    try:
        codes = await tbo_client.get_hotel_codes()
        return {
            "total": len(codes),
            "codes": codes[:limit]
        }
    except TBOError as e:
        raise HTTPException(status_code=400, detail=str(e.message))


@router.get("/hotels/by-city/{city_code}")
async def get_hotels_by_city(
    city_code: str,
    limit: int = Query(20, description="Max number of hotels to return")
):
    """Get list of hotels in a specific city"""
    try:
        result = await tbo_client.get_hotels_by_city(city_code, limit)
        return result
    except TBOError as e:
        logger.error(f"Failed to get hotels by city: {e.message}")
        raise HTTPException(status_code=400, detail=str(e.message))


@router.post("/hotels/search")
async def search_hotels(request: HotelSearchRequest):
    """
    Search for hotels using TBO HotelSearch API

    Requires hotel_codes - use /hotels/codes to get available codes first
    """
    try:
        result = await tbo_client.search_hotels(
            hotel_codes=request.hotel_codes,
            check_in=request.check_in,
            check_out=request.check_out,
            rooms=request.rooms,
            adults=request.adults,
            children=request.children,
            child_ages=request.child_ages,
            nationality=request.nationality,
            currency=request.currency
        )
        return result
    except TBOTimeoutError as e:
        raise HTTPException(status_code=504, detail="Search request timed out. Please try again.")
    except TBOAuthenticationError as e:
        raise HTTPException(status_code=401, detail=str(e.message))
    except TBOError as e:
        logger.error(f"Hotel search failed: {e.message}")
        raise HTTPException(status_code=400, detail=str(e.message))


@router.post("/hotels/availability")
async def check_availability(request: AvailabilityRequest):
    """
    Check real-time availability and pricing (MANDATORY before booking)
    """
    try:
        result = await tbo_client.check_availability_and_pricing(
            hotel_code=request.hotel_code,
            check_in=request.check_in,
            check_out=request.check_out,
            room_type_code=request.room_type_code,
            rate_plan_code=request.rate_plan_code,
            rooms=request.rooms,
            adults=request.adults,
            children=request.children,
            child_ages=request.child_ages,
            nationality=request.nationality,
            currency=request.currency
        )

        if not result.get('available') and 'error' not in result:
            raise HTTPException(
                status_code=400,
                detail="Selected room is no longer available"
            )

        return result
    except TBOTimeoutError as e:
        raise HTTPException(status_code=504, detail="Availability check timed out. Please try again.")
    except TBOError as e:
        logger.error(f"Availability check failed: {e.message}")
        raise HTTPException(status_code=400, detail=str(e.message))


@router.post("/hotels/book")
async def create_booking(request: BookingRequest):
    """
    Create hotel booking via TBO HotelBook API

    IMPORTANT: Must call /hotels/availability before booking to verify price
    """
    try:
        guests = [g.model_dump() for g in request.guests]

        result = await tbo_client.create_booking(
            hotel_code=request.hotel_code,
            check_in=request.check_in,
            check_out=request.check_out,
            room_type_code=request.room_type_code,
            rate_plan_code=request.rate_plan_code,
            client_reference=request.client_reference,
            guests=guests,
            rooms=request.rooms,
            total_fare=request.total_fare,
            nationality=request.nationality,
            currency=request.currency,
            special_requests=request.special_requests
        )

        if not result.success:
            raise HTTPException(
                status_code=400,
                detail=result.error_message or "Booking failed"
            )

        return {
            "success": True,
            "booking_id": result.booking_id,
            "confirmation_no": result.confirmation_no,
            "booking_status": result.booking_status.value,
            "hotel_name": result.hotel_name,
            "room_type": result.room_type,
            "check_in": result.check_in,
            "check_out": result.check_out,
            "total_fare": result.total_fare,
            "currency": result.currency
        }
    except TBOTimeoutError as e:
        raise HTTPException(status_code=504, detail="Booking request timed out. Please check booking status.")
    except TBOError as e:
        logger.error(f"Booking error: {e.message}")
        raise HTTPException(status_code=500, detail=str(e.message))


@router.get("/bookings/{booking_id}")
async def get_booking_details(booking_id: str):
    """Get booking details from TBO"""
    try:
        result = await tbo_client.get_booking_details(booking_id)
        return result
    except TBOError as e:
        logger.error(f"Failed to get booking details: {e.message}")
        raise HTTPException(status_code=400, detail=str(e.message))


@router.post("/bookings/cancel")
async def cancel_booking(request: CancelRequest):
    """Cancel a TBO booking"""
    try:
        result = await tbo_client.cancel_booking(
            booking_id=request.booking_id,
            remarks=request.remarks
        )

        if not result['success']:
            raise HTTPException(
                status_code=400,
                detail=result.get('message', 'Cancellation failed')
            )

        return result
    except TBOError as e:
        logger.error(f"Cancellation failed: {e.message}")
        raise HTTPException(status_code=400, detail=str(e.message))


@router.get("/cities")
async def get_city_codes():
    """Get common TBO city codes - India and International destinations"""
    return {
        "cities": [
            # India
            {"code": "115936", "name": "Udaipur", "state": "Rajasthan", "country": "India"},
            {"code": "130443", "name": "Jaipur", "state": "Rajasthan", "country": "India"},
            {"code": "127343", "name": "Jodhpur", "state": "Rajasthan", "country": "India"},
            {"code": "111124", "name": "Mumbai", "state": "Maharashtra", "country": "India"},
            {"code": "105859", "name": "Delhi", "state": "Delhi", "country": "India"},
            {"code": "126632", "name": "Goa", "state": "Goa", "country": "India"},
            {"code": "127105", "name": "Agra", "state": "Uttar Pradesh", "country": "India"},
            {"code": "119805", "name": "Bangalore", "state": "Karnataka", "country": "India"},
            {"code": "108185", "name": "Chennai", "state": "Tamil Nadu", "country": "India"},
            {"code": "114418", "name": "Hyderabad", "state": "Telangana", "country": "India"},
            {"code": "117378", "name": "Kolkata", "state": "West Bengal", "country": "India"},
            {"code": "115182", "name": "Kochi", "state": "Kerala", "country": "India"},
            {"code": "115810", "name": "Shimla", "state": "Himachal Pradesh", "country": "India"},
            {"code": "112661", "name": "Manali", "state": "Himachal Pradesh", "country": "India"},
            {"code": "111397", "name": "Ooty", "state": "Tamil Nadu", "country": "India"},
            {"code": "110256", "name": "Mussoorie", "state": "Uttarakhand", "country": "India"},
            {"code": "117887", "name": "Rishikesh", "state": "Uttarakhand", "country": "India"},
            {"code": "133325", "name": "Varanasi", "state": "Uttar Pradesh", "country": "India"},
            # UAE
            {"code": "101214", "name": "Dubai", "state": "Dubai", "country": "UAE"},
            {"code": "100556", "name": "Abu Dhabi", "state": "Abu Dhabi", "country": "UAE"},
            # Thailand
            {"code": "100237", "name": "Bangkok", "state": "Bangkok", "country": "Thailand"},
            {"code": "113960", "name": "Phuket", "state": "Phuket", "country": "Thailand"},
            {"code": "113441", "name": "Pattaya", "state": "Chonburi", "country": "Thailand"},
            # Singapore
            {"code": "115488", "name": "Singapore", "state": "Singapore", "country": "Singapore"},
            # Malaysia
            {"code": "109381", "name": "Kuala Lumpur", "state": "Kuala Lumpur", "country": "Malaysia"},
            {"code": "109519", "name": "Langkawi", "state": "Kedah", "country": "Malaysia"},
            # Indonesia
            {"code": "100239", "name": "Bali", "state": "Bali", "country": "Indonesia"},
            {"code": "108893", "name": "Jakarta", "state": "Jakarta", "country": "Indonesia"},
            # Maldives
            {"code": "110088", "name": "Male", "state": "Male", "country": "Maldives"},
            # Sri Lanka
            {"code": "100800", "name": "Colombo", "state": "Western", "country": "Sri Lanka"},
            # Egypt
            {"code": "100435", "name": "Cairo", "state": "Cairo", "country": "Egypt"},
            {"code": "115305", "name": "Sharm El Sheikh", "state": "South Sinai", "country": "Egypt"},
            # Turkey
            {"code": "108831", "name": "Istanbul", "state": "Istanbul", "country": "Turkey"},
            {"code": "100171", "name": "Antalya", "state": "Antalya", "country": "Turkey"},
            # Europe
            {"code": "112131", "name": "London", "state": "England", "country": "United Kingdom"},
            {"code": "113407", "name": "Paris", "state": "Ile-de-France", "country": "France"},
            {"code": "100126", "name": "Amsterdam", "state": "North Holland", "country": "Netherlands"},
            {"code": "100245", "name": "Barcelona", "state": "Catalonia", "country": "Spain"},
            {"code": "114505", "name": "Rome", "state": "Lazio", "country": "Italy"},
            # USA
            {"code": "111856", "name": "New York", "state": "New York", "country": "USA"},
            {"code": "109833", "name": "Las Vegas", "state": "Nevada", "country": "USA"},
            {"code": "110041", "name": "Los Angeles", "state": "California", "country": "USA"},
            {"code": "110485", "name": "Miami", "state": "Florida", "country": "USA"}
        ]
    }


@router.get("/hotels/{hotel_code}/details")
async def get_hotel_details(hotel_code: str):
    """Get detailed information about a specific hotel"""
    try:
        result = await tbo_client.get_hotel_details(hotel_code)
        return result
    except TBOError as e:
        logger.error(f"Failed to get hotel details: {e.message}")
        raise HTTPException(status_code=400, detail=str(e.message))


@router.get("/health")
async def tbo_health_check():
    """Check TBO API connectivity and session status"""
    try:
        session = await tbo_client.get_session()
        return {
            "status": "healthy",
            "tbo_configured": bool(tbo_client.username and tbo_client.password),
            "session_valid": not session.is_expired,
            "session_remaining_seconds": session.time_remaining
        }
    except TBOAuthenticationError:
        return {
            "status": "unhealthy",
            "tbo_configured": False,
            "error": "TBO credentials not configured"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "tbo_configured": bool(tbo_client.username and tbo_client.password),
            "error": str(e)
        }
