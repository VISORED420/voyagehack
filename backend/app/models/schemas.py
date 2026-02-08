"""
Pydantic Schemas for API Request/Response
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


# ============================================================
# ENUMS
# ============================================================

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    WAITLISTED = "waitlisted"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"
    CHECKED_IN = "checked_in"
    CHECKED_OUT = "checked_out"
    EXPIRED = "expired"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PARTIAL = "partial"
    PAID = "paid"
    REFUNDED = "refunded"
    FAILED = "failed"


class BookingSource(str, Enum):
    MICROSITE = "Microsite"
    WHATSAPP = "WhatsApp"
    EMAIL = "Email"
    AGENT = "Agent"
    PHONE = "Phone"


class RSVPStatus(str, Enum):
    PENDING = "pending"
    ATTENDING = "attending"
    NOT_ATTENDING = "not_attending"
    MAYBE = "maybe"


class GuestCategory(str, Enum):
    FAMILY = "Family"
    FRIEND = "Friend"
    COLLEAGUE = "Colleague"
    VIP = "VIP"
    OTHER = "Other"


class GuestSide(str, Enum):
    BRIDE = "Bride"
    GROOM = "Groom"


# ============================================================
# EVENT SCHEMAS
# ============================================================

class EventBase(BaseModel):
    name: str
    event_code: str
    event_type: str
    start_date: date
    end_date: date
    destination: str
    booking_deadline: Optional[date] = None


class EventCreate(EventBase):
    host_name: Optional[str] = None
    host_email: Optional[EmailStr] = None
    host_phone: Optional[str] = None


class EventResponse(EventBase):
    id: str
    status: str
    days_to_event: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# GUEST SCHEMAS
# ============================================================

class GuestBase(BaseModel):
    salutation: Optional[str] = None
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    category: Optional[GuestCategory] = None
    side: Optional[GuestSide] = None
    dietary_requirements: Optional[List[str]] = []


class GuestCreate(GuestBase):
    event_id: str


class GuestResponse(GuestBase):
    id: str
    event_id: str
    rsvp_status: RSVPStatus = RSVPStatus.PENDING
    invitation_status: str = "not_sent"
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# INVENTORY SCHEMAS
# ============================================================

class InventoryBase(BaseModel):
    hotel_name: str
    room_type: str
    total_rooms_blocked: int
    negotiated_rate: float
    valid_from: date
    valid_to: date


class InventoryCreate(InventoryBase):
    event_id: str
    tbo_hotel_code: Optional[str] = None
    room_type_code: Optional[str] = None
    tbo_room_type_code: Optional[str] = None
    tbo_rate_plan_code: Optional[str] = None
    rack_rate: Optional[float] = None  # TBO rate as reference
    release_date: Optional[date] = None
    inclusions: Optional[List[str]] = []
    meal_plan: Optional[str] = None


class InventoryResponse(InventoryBase):
    id: str
    event_id: str
    rooms_booked: int = 0
    rooms_available: int
    release_date: Optional[date] = None

    class Config:
        from_attributes = True


# ============================================================
# BOOKING SCHEMAS
# ============================================================

class BookingBase(BaseModel):
    guest_name: str
    guest_email: Optional[EmailStr] = None
    guest_phone: Optional[str] = None
    check_in_date: date
    check_out_date: date
    num_rooms: int = 1
    num_adults: int = 2
    num_children: int = 0


class BookingCreate(BookingBase):
    event_id: str
    guest_id: Optional[str] = None
    inventory_id: str
    room_type: str
    rate_per_night: float
    special_requests: Optional[str] = None
    source: BookingSource = BookingSource.MICROSITE
    category: Optional[GuestCategory] = None
    side: Optional[GuestSide] = None
    dietary_requirements: Optional[List[str]] = []


class BookingUpdate(BaseModel):
    status: Optional[BookingStatus] = None
    payment_status: Optional[PaymentStatus] = None
    amount_paid: Optional[float] = None
    special_requests: Optional[str] = None


class BookingResponse(BookingBase):
    id: str
    event_id: str
    booking_reference: str
    room_type: str
    hotel: str
    nights: int
    total: float
    paid: float
    due: float
    payment_status: PaymentStatus
    status: BookingStatus
    source: str
    category: Optional[str] = None
    side: Optional[str] = None
    dietary: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True


class BookingListItem(BaseModel):
    """Simplified booking for list views"""
    id: int
    ref: str
    guest: str
    email: str
    phone: str
    hotel: str
    room: str
    checkIn: str
    checkOut: str
    nights: int
    rooms: int
    adults: int
    children: int
    total: float
    paid: float
    due: float
    paymentStatus: str
    status: str
    category: str
    side: str
    dietary: List[str]
    source: str


# ============================================================
# PAYMENT SCHEMAS
# ============================================================

class PaymentBase(BaseModel):
    amount: float
    payment_method: str


class PaymentCreate(PaymentBase):
    booking_id: str
    gateway_transaction_id: Optional[str] = None


class PaymentResponse(PaymentBase):
    id: str
    booking_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================
# DASHBOARD SCHEMAS
# ============================================================

class DashboardStats(BaseModel):
    totalGuests: int
    attending: int
    declined: int
    pending: int
    totalBookings: int
    confirmedBookings: int
    pendingBookings: int
    cancelledBookings: int
    totalRooms: int
    bookedRooms: int
    availableRooms: int
    occupancyRate: float
    totalValue: float
    collected: float
    pendingAmount: float
    collectionRate: float


class EventDashboard(BaseModel):
    event: EventResponse
    stats: DashboardStats
    bookings: List[BookingListItem]


# ============================================================
# COMMUNICATION SCHEMAS
# ============================================================

class SendReminderRequest(BaseModel):
    booking_ids: List[str]
    message_type: str = "payment_reminder"


class BulkActionRequest(BaseModel):
    booking_ids: List[str]
    action: str  # "send_reminder", "cancel", "confirm"


class BulkActionResponse(BaseModel):
    success: int
    failed: int
    errors: List[str] = []


# ============================================================
# AUDIT LOG SCHEMAS
# ============================================================

class AuditAction(str, Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    STATUS_CHANGE = "STATUS_CHANGE"
    PAYMENT = "PAYMENT"
    CANCELLATION = "CANCELLATION"
    CONFIRMATION = "CONFIRMATION"


class AuditEntityType(str, Enum):
    BOOKING = "booking"
    GUEST = "guest"
    INVENTORY = "inventory"
    PAYMENT = "payment"
    EVENT = "event"


class AuditLogBase(BaseModel):
    entity_type: str
    entity_id: str
    action: str
    changes: Optional[dict] = None
    old_value: Optional[dict] = None
    new_value: Optional[dict] = None
    performed_by: Optional[str] = None
    ip_address: Optional[str] = None
    event_id: Optional[str] = None
    booking_id: Optional[str] = None
    notes: Optional[str] = None


class AuditLogResponse(AuditLogBase):
    id: str
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogListResponse(BaseModel):
    logs: List[AuditLogResponse]
    total: int
    limit: int
    offset: int


class AuditLogFilter(BaseModel):
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    event_id: Optional[str] = None
    booking_id: Optional[str] = None
    action: Optional[str] = None
    performed_by: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = 100
    offset: int = 0
