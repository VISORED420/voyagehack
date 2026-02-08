"""
TBO Hotels API Client (REST API)
Handles authentication, hotel search, availability, booking, and cancellation
"""
import asyncio
import base64
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ..config import settings
from .cache import cache_service

logger = logging.getLogger(__name__)


class TBOError(Exception):
    """Base exception for TBO API errors"""
    def __init__(self, message: str, error_code: str = None, details: dict = None):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class TBOAuthenticationError(TBOError):
    """Authentication failed"""
    pass


class TBOAvailabilityError(TBOError):
    """Room not available"""
    pass


class TBOBookingError(TBOError):
    """Booking failed"""
    pass


class TBOTimeoutError(TBOError):
    """Request timeout"""
    pass


class TBOSessionExpiredError(TBOError):
    """Session expired"""
    pass


class BookingStatus(str, Enum):
    CONFIRMED = "Confirmed"
    VOUCHERED = "Vouchered"
    CANCELLED = "Cancelled"
    FAILED = "Failed"
    PENDING = "Pending"


@dataclass
class TBOSession:
    """TBO API Session"""
    session_id: str
    token_id: str
    created_at: datetime
    expires_at: datetime

    @property
    def is_expired(self) -> bool:
        return datetime.now() >= self.expires_at

    @property
    def time_remaining(self) -> int:
        """Returns remaining time in seconds"""
        delta = self.expires_at - datetime.now()
        return max(0, int(delta.total_seconds()))


@dataclass
class BookingResult:
    """Booking result"""
    success: bool
    booking_id: Optional[str]
    confirmation_no: Optional[str]
    booking_status: BookingStatus
    hotel_name: str
    room_type: str
    check_in: str
    check_out: str
    total_fare: float
    currency: str
    error_message: Optional[str] = None


class TBOHotelsClient:
    """
    TBO Hotels REST API Client

    Handles all TBO API interactions including:
    - Authentication (Basic Auth)
    - Hotel search
    - Availability and pricing verification
    - Hotel booking
    - Booking cancellation
    - Booking details retrieval
    """

    SESSION_DURATION_MINUTES = 30
    SESSION_REFRESH_THRESHOLD_MINUTES = 5

    def __init__(self):
        self.base_url = settings.TBO_API_URL.rstrip('/')
        self.username = settings.TBO_USERNAME
        self.password = settings.TBO_PASSWORD
        self._session: Optional[TBOSession] = None
        self._http_client: Optional[httpx.AsyncClient] = None

    def _get_auth_header(self) -> Dict[str, str]:
        """Get Basic Auth header"""
        if not self.username or not self.password:
            raise TBOAuthenticationError("TBO credentials not configured", "AUTH_NOT_CONFIGURED")

        credentials = f"{self.username}:{self.password}"
        encoded = base64.b64encode(credentials.encode()).decode()
        return {
            "Authorization": f"Basic {encoded}",
            "Content-Type": "application/json"
        }

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(60.0, connect=10.0),
                limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
            )
        return self._http_client

    async def close(self):
        """Close HTTP client"""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
            self._http_client = None

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        reraise=True
    )
    async def _make_request(self, endpoint: str, payload: Dict[str, Any], method: str = "POST") -> Dict[str, Any]:
        """
        Make API request to TBO with retry logic

        Implements:
        - Exponential backoff retry (3 attempts)
        - Timeout handling
        - Error response parsing
        """
        client = await self._get_http_client()
        url = f"{self.base_url}/{endpoint}"
        headers = self._get_auth_header()

        try:
            logger.info(f"TBO API Request: {endpoint}")

            if method == "GET":
                response = await client.get(url, headers=headers)
            else:
                response = await client.post(url, json=payload, headers=headers)

            response.raise_for_status()
            result = response.json()

            # Check for TBO error response
            if "Status" in result:
                status = result["Status"]
                code = status.get("Code")
                # Code 200/0 = success, Code 201 = no availability (valid response)
                if code not in [200, 0, 201, None]:
                    error_code = str(code or "UNKNOWN")
                    error_msg = status.get("Description", "Unknown error")

                    if error_code == "401":
                        raise TBOAuthenticationError(error_msg, error_code)
                    raise TBOError(error_msg, error_code)

            return result

        except httpx.TimeoutException as e:
            logger.error(f"TBO API Timeout: {endpoint} - {str(e)}")
            raise TBOTimeoutError(f"Request timeout for {endpoint}", "TIMEOUT")
        except httpx.NetworkError as e:
            logger.error(f"TBO API Network Error: {endpoint} - {str(e)}")
            raise TBOError(f"Network error for {endpoint}: {str(e)}", "NETWORK_ERROR")
        except httpx.HTTPStatusError as e:
            logger.error(f"TBO API HTTP Error: {endpoint} - {e.response.status_code}")
            raise TBOError(f"HTTP error {e.response.status_code}", "HTTP_ERROR")

    # ============================================================
    # SESSION MANAGEMENT
    # ============================================================

    async def get_session(self, force_refresh: bool = False) -> TBOSession:
        """
        Get or create TBO session with 30-minute expiry
        """
        cache_key = "tbo:session"

        if not force_refresh and self._session and not self._session.is_expired:
            if self._session.time_remaining > self.SESSION_REFRESH_THRESHOLD_MINUTES * 60:
                return self._session

        if not force_refresh and cache_service.is_connected:
            cached = await cache_service.get(cache_key)
            if cached:
                self._session = TBOSession(
                    session_id=cached['session_id'],
                    token_id=cached['token_id'],
                    created_at=datetime.fromisoformat(cached['created_at']),
                    expires_at=datetime.fromisoformat(cached['expires_at'])
                )
                if not self._session.is_expired and self._session.time_remaining > self.SESSION_REFRESH_THRESHOLD_MINUTES * 60:
                    logger.info(f"Using cached TBO session, {self._session.time_remaining}s remaining")
                    return self._session

        logger.info("Creating new TBO session...")
        self._session = await self._authenticate()

        if cache_service.is_connected:
            await cache_service.set(
                cache_key,
                {
                    'session_id': self._session.session_id,
                    'token_id': self._session.token_id,
                    'created_at': self._session.created_at.isoformat(),
                    'expires_at': self._session.expires_at.isoformat()
                },
                ttl=self.SESSION_DURATION_MINUTES * 60
            )

        return self._session

    async def _authenticate(self) -> TBOSession:
        """Authenticate with TBO API (using Basic Auth - session is tracked locally)"""
        if not self.username or not self.password:
            raise TBOAuthenticationError(
                "TBO credentials not configured",
                "AUTH_NOT_CONFIGURED"
            )

        now = datetime.now()
        session = TBOSession(
            session_id=str(uuid.uuid4()),
            token_id=str(uuid.uuid4()),
            created_at=now,
            expires_at=now + timedelta(minutes=self.SESSION_DURATION_MINUTES)
        )

        logger.info(f"TBO session created: {session.session_id[:8]}... expires in {self.SESSION_DURATION_MINUTES} minutes")
        return session

    async def ensure_session(self) -> str:
        """Ensure valid session exists and return session ID"""
        session = await self.get_session()
        if session.is_expired:
            session = await self.get_session(force_refresh=True)
        return session.session_id

    # ============================================================
    # HOTEL CODE LIST
    # ============================================================

    async def get_hotel_codes(self) -> List[int]:
        """Get list of all available hotel codes"""
        await self.ensure_session()

        client = await self._get_http_client()
        url = f"{self.base_url}/Hotelcodelist"
        headers = self._get_auth_header()

        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            result = response.json()
            return result.get("HotelCodes", [])
        except Exception as e:
            logger.error(f"Failed to get hotel codes: {e}")
            return []

    async def get_hotels_by_city(self, city_code: str, limit: int = 20) -> Dict[str, Any]:
        """Get hotels for a specific city using TBO CityHotelList API"""
        await self.ensure_session()

        client = await self._get_http_client()
        url = f"{self.base_url}/CityHotelList"
        headers = self._get_auth_header()

        payload = {
            "CityCode": city_code,
            "Language": "EN"
        }

        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()

            # Check for errors
            if result.get("Status", {}).get("Code") != 200:
                logger.warning(f"City hotel list returned non-200: {result.get('Status')}")
                # Return empty list on error
                return {"hotels": [], "total": 0}

            hotels = result.get("Hotels", [])
            # Limit results
            limited_hotels = hotels[:limit] if len(hotels) > limit else hotels

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
                    for h in limited_hotels
                ],
                "total": len(hotels)
            }
        except Exception as e:
            logger.error(f"Failed to get hotels by city: {e}")
            # Return empty on error
            return {"hotels": [], "total": 0}

    async def get_hotel_details(self, hotel_code: str) -> Dict[str, Any]:
        """Get detailed information about a specific hotel"""
        await self.ensure_session()

        client = await self._get_http_client()
        url = f"{self.base_url}/HotelDetails"
        headers = self._get_auth_header()

        payload = {
            "Hotelcodes": hotel_code,
            "Language": "EN"
        }

        try:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()

            # Check for errors
            if result.get("Status", {}).get("Code") != 200:
                raise TBOError(
                    result.get("Status", {}).get("Description", "Failed to get hotel details"),
                    str(result.get("Status", {}).get("Code", "UNKNOWN"))
                )

            hotels = result.get("HotelDetails", [])
            if not hotels:
                raise TBOError(f"Hotel {hotel_code} not found", "NOT_FOUND")

            hotel = hotels[0]
            return {
                "hotel_code": hotel.get("HotelCode"),
                "hotel_name": hotel.get("HotelName"),
                "description": hotel.get("Description"),
                "address": hotel.get("Address"),
                "city": hotel.get("CityName"),
                "country": hotel.get("CountryName"),
                "star_rating": hotel.get("StarRating"),
                "latitude": hotel.get("Latitude"),
                "longitude": hotel.get("Longitude"),
                "hotel_facilities": hotel.get("HotelFacilities", []),
                "images": hotel.get("Images", []),
                "check_in_time": hotel.get("CheckInTime"),
                "check_out_time": hotel.get("CheckOutTime")
            }
        except TBOError:
            raise
        except Exception as e:
            logger.error(f"Failed to get hotel details: {e}")
            raise TBOError(f"Failed to get hotel details: {str(e)}", "API_ERROR")

    # ============================================================
    # HOTEL SEARCH
    # ============================================================

    async def search_hotels(
        self,
        hotel_codes: List[str],
        check_in: str,
        check_out: str,
        rooms: int = 1,
        adults: int = 2,
        children: int = 0,
        child_ages: List[int] = None,
        nationality: str = "IN",
        currency: str = "INR"
    ) -> Dict[str, Any]:
        """
        Search for hotels using TBO HotelSearch API

        Args:
            hotel_codes: List of hotel codes to search (required)
            check_in: Check-in date (YYYY-MM-DD)
            check_out: Check-out date (YYYY-MM-DD)
            rooms: Number of rooms
            adults: Number of adults per room
            children: Number of children per room
            child_ages: List of child ages
            nationality: Guest nationality code
            currency: Preferred currency

        Returns:
            Dictionary with hotel search results
        """
        await self.ensure_session()

        # Build room guests - TBO API uses Adults/Children format
        room_guests = []
        for i in range(rooms):
            guest = {
                "Adults": adults,
                "Children": children,
                "ChildAge": child_ages[:children] if children > 0 and child_ages else []
            }
            room_guests.append(guest)

        payload = {
            "HotelCodes": ",".join(str(code) for code in hotel_codes),
            "CheckIn": check_in,  # ISO format YYYY-MM-DD
            "CheckOut": check_out,  # ISO format YYYY-MM-DD
            "GuestNationality": nationality,
            "PreferredCurrencyCode": currency,
            "NoOfRooms": rooms,
            "PaxRooms": room_guests,
            "ResponseTime": 23,
            "IsDetailedResponse": True
        }

        result = await self._make_request("HotelSearch", payload)

        return {
            'session_id': self._session.session_id if self._session else '',
            'hotels': result.get('Hotels', {}).get('Hotel', []) if isinstance(result.get('Hotels'), dict) else result.get('Hotels', [])
        }

    # ============================================================
    # AVAILABILITY AND PRICING
    # ============================================================

    async def check_availability_and_pricing(
        self,
        hotel_code: str,
        check_in: str,
        check_out: str,
        room_type_code: str,
        rate_plan_code: str,
        rooms: int = 1,
        adults: int = 2,
        children: int = 0,
        child_ages: List[int] = None,
        nationality: str = "IN",
        currency: str = "INR"
    ) -> Dict[str, Any]:
        """
        Check real-time availability and pricing (MANDATORY before booking)
        """
        await self.ensure_session()

        # Build room guests - TBO API uses Adults/Children format
        room_guests = []
        for i in range(rooms):
            guest = {
                "Adults": adults,
                "Children": children,
                "ChildAge": child_ages[:children] if children > 0 and child_ages else []
            }
            room_guests.append(guest)

        payload = {
            "HotelCode": hotel_code,
            "CheckIn": check_in,  # ISO format YYYY-MM-DD
            "CheckOut": check_out,  # ISO format YYYY-MM-DD
            "GuestNationality": nationality,
            "PreferredCurrencyCode": currency,
            "NoOfRooms": rooms,
            "RoomTypeCode": room_type_code,
            "RatePlanCode": rate_plan_code,
            "PaxRooms": room_guests
        }

        try:
            result = await self._make_request("AvailabilityAndPricing", payload)

            hotel_result = result.get('HotelResult', {})
            rooms_data = hotel_result.get('Rooms', {}).get('Room', [])
            if not isinstance(rooms_data, list):
                rooms_data = [rooms_data] if rooms_data else []

            is_available = len(rooms_data) > 0

            return {
                'available': is_available,
                'price_changed': result.get('IsPriceChanged', False),
                'hotel_code': hotel_code,
                'hotel_name': hotel_result.get('HotelName', ''),
                'rooms': rooms_data,
                'total_fare': sum(float(r.get('TotalFare', 0)) for r in rooms_data),
                'currency': currency
            }
        except TBOError as e:
            logger.error(f"Availability check failed: {e.message}")
            return {
                'available': False,
                'price_changed': False,
                'error': e.message
            }

    # ============================================================
    # HOTEL BOOKING
    # ============================================================

    async def create_booking(
        self,
        hotel_code: str,
        check_in: str,
        check_out: str,
        room_type_code: str,
        rate_plan_code: str,
        client_reference: str,
        guests: List[Dict[str, str]],
        rooms: int = 1,
        total_fare: float = 0,
        nationality: str = "IN",
        currency: str = "INR",
        special_requests: str = None
    ) -> BookingResult:
        """
        Create hotel booking via TBO HotelBook API
        """
        await self.ensure_session()

        # Build guest info
        pax_rooms = []
        adults_list = []

        for i, guest in enumerate(guests):
            adult = {
                "Title": guest.get('salutation', 'Mr'),
                "FirstName": guest['first_name'],
                "LastName": guest['last_name'],
                "IsLeadPax": guest.get('is_lead', i == 0)
            }
            adults_list.append(adult)

        # Distribute guests to rooms
        guests_per_room = len(adults_list) // rooms if rooms > 0 else len(adults_list)
        for i in range(rooms):
            start_idx = i * guests_per_room
            end_idx = start_idx + guests_per_room if i < rooms - 1 else len(adults_list)
            room_adults = adults_list[start_idx:end_idx]

            pax_rooms.append({
                "Adults": room_adults,
                "Children": []
            })

        payload = {
            "HotelCode": hotel_code,
            "CheckIn": check_in,  # ISO format YYYY-MM-DD
            "CheckOut": check_out,  # ISO format YYYY-MM-DD
            "GuestNationality": nationality,
            "PreferredCurrencyCode": currency,
            "NoOfRooms": rooms,
            "RoomTypeCode": room_type_code,
            "RatePlanCode": rate_plan_code,
            "ClientReferenceNumber": client_reference,
            "TotalFare": total_fare,
            "PaxRooms": pax_rooms,
            "PaymentMode": "Limit"
        }

        if special_requests:
            payload["SpecialRequest"] = special_requests

        try:
            result = await self._make_request("HotelBook", payload)

            booking_status = result.get('Status', {})
            is_success = booking_status.get('Code') in [200, 0]

            return BookingResult(
                success=is_success,
                booking_id=str(result.get('BookingId', '')),
                confirmation_no=result.get('ConfirmationNumber', result.get('ConfirmationNo', '')),
                booking_status=BookingStatus.CONFIRMED if is_success else BookingStatus.FAILED,
                hotel_name=result.get('HotelName', ''),
                room_type=room_type_code,
                check_in=check_in,
                check_out=check_out,
                total_fare=float(result.get('TotalFare', total_fare)),
                currency=currency,
                error_message=booking_status.get('Description') if not is_success else None
            )
        except TBOError as e:
            logger.error(f"TBO Booking failed: {e.message}")
            return BookingResult(
                success=False,
                booking_id=None,
                confirmation_no=None,
                booking_status=BookingStatus.FAILED,
                hotel_name='',
                room_type=room_type_code,
                check_in=check_in,
                check_out=check_out,
                total_fare=0,
                currency=currency,
                error_message=e.message
            )

    # ============================================================
    # BOOKING MANAGEMENT
    # ============================================================

    async def get_booking_details(self, booking_id: str) -> Dict[str, Any]:
        """Get booking details by booking ID"""
        await self.ensure_session()

        payload = {
            "BookingId": booking_id
        }

        result = await self._make_request("BookingDetail", payload)
        return result

    async def cancel_booking(
        self,
        booking_id: str,
        remarks: str = "Cancelled by guest"
    ) -> Dict[str, Any]:
        """Cancel a hotel booking"""
        await self.ensure_session()

        payload = {
            "BookingId": booking_id,
            "Remarks": remarks,
            "RequestType": "Cancellation"
        }

        try:
            result = await self._make_request("CancelBooking", payload)

            status = result.get('Status', {})
            is_cancelled = status.get('Code') in [200, 0]

            return {
                'success': is_cancelled,
                'booking_id': booking_id,
                'status': 'Cancelled' if is_cancelled else 'Failed',
                'refund_amount': float(result.get('RefundAmount', 0)),
                'cancellation_charges': float(result.get('CancellationCharges', 0)),
                'message': status.get('Description', '')
            }
        except TBOError as e:
            return {
                'success': False,
                'booking_id': booking_id,
                'status': 'Failed',
                'message': e.message
            }

    # ============================================================
    # UTILITY METHODS
    # ============================================================

    def generate_client_reference(self, event_code: str) -> str:
        """Generate TBO client reference number"""
        timestamp = datetime.now().strftime("%d%m%y%H%M%S%f")[:18]
        suffix = event_code[:4].upper()
        return f"{timestamp}#{suffix}"


# Global TBO client instance
tbo_client = TBOHotelsClient()


async def get_tbo_client() -> TBOHotelsClient:
    """Dependency injection helper for FastAPI"""
    return tbo_client
