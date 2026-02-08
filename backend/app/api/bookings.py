"""
Bookings API Routes
Integrated with TBO Hotels API and Notification Service
"""
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import List, Optional
from datetime import date, timedelta
import logging

from ..models.database import db
from ..models.schemas import BookingCreate, BookingUpdate, BookingListItem, BulkActionRequest, BulkActionResponse
from ..services.cache import cache_service
from ..services.tbo_client import tbo_client, TBOError, TBOBookingError
from ..services.notification import notification_service, NotificationChannel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/bookings", tags=["Bookings"])


def format_booking_for_response(booking: dict) -> dict:
    """Format booking data for frontend"""
    return {
        "id": booking.get("id", ""),
        "ref": booking.get("booking_reference", ""),
        "guest": booking.get("guest_name", ""),
        "email": booking.get("guest_email", ""),
        "phone": booking.get("guest_phone", ""),
        "hotel": booking.get("hotel", ""),
        "room": booking.get("room_type", ""),
        "checkIn": booking["check_in_date"].strftime("%d %b") if hasattr(booking["check_in_date"], "strftime") else booking["check_in_date"],
        "checkOut": booking["check_out_date"].strftime("%d %b") if hasattr(booking["check_out_date"], "strftime") else booking["check_out_date"],
        "nights": booking.get("num_nights", 0),
        "rooms": booking.get("num_rooms", 1),
        "adults": booking.get("num_adults", 2),
        "children": booking.get("num_children", 0),
        "total": booking.get("total_amount", 0),
        "paid": booking.get("amount_paid", 0),
        "due": booking.get("amount_due", 0),
        "paymentStatus": booking.get("payment_status", "pending"),
        "status": booking.get("status", "pending"),
        "category": booking.get("category", ""),
        "side": booking.get("side", ""),
        "dietary": booking.get("dietary_requirements", []),
        "source": booking.get("booking_source", "Microsite"),
        "tboBookingId": booking.get("tbo_booking_id"),
        "tboConfirmationNo": booking.get("tbo_confirmation_no")
    }


@router.get("/event/{event_id}", response_model=List[dict])
async def get_event_bookings(
    event_id: str,
    status: Optional[str] = Query(None, description="Filter by status"),
    payment_status: Optional[str] = Query(None, description="Filter by payment status"),
    search: Optional[str] = Query(None, description="Search query")
):
    """Get all bookings for an event"""
    filters = {
        "status": status,
        "payment_status": payment_status,
        "search": search
    }
    bookings = db.get_bookings(event_id, filters)
    return [format_booking_for_response(b) for b in bookings]


@router.get("/{booking_id}")
async def get_booking(booking_id: str):
    """Get a specific booking"""
    booking = db.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return format_booking_for_response(booking)


@router.get("/reference/{reference}")
async def get_booking_by_reference(reference: str):
    """Get booking by reference number"""
    booking = db.get_booking_by_reference(reference)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return format_booking_for_response(booking)


@router.post("", response_model=dict)
async def create_booking(booking: BookingCreate, background_tasks: BackgroundTasks):
    """
    Create a new booking

    For TBO-integrated inventory:
    1. Checks availability via TBO API
    2. Creates booking in TBO system
    3. Stores booking locally
    4. Sends confirmation notification
    """
    # Verify inventory exists
    inventory = db.get_inventory_item(booking.inventory_id)
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")

    # Check availability
    available = inventory["total_rooms_blocked"] - inventory["rooms_booked"]
    if available < booking.num_rooms:
        raise HTTPException(
            status_code=400,
            detail=f"Only {available} rooms available"
        )

    booking_data = booking.model_dump()
    booking_data["hotel"] = inventory["hotel_name"]

    # TBO Integration: If inventory has TBO hotel code, use TBO API
    tbo_booking_id = None
    tbo_confirmation_no = None

    if inventory.get("tbo_hotel_code") and inventory.get("tbo_session_id"):
        try:
            # Check availability with TBO
            availability = await tbo_client.check_availability_and_pricing(
                session_id=inventory["tbo_session_id"],
                result_index=inventory.get("tbo_result_index", 0),
                room_indices=[inventory.get("tbo_room_index", 0)]
            )

            if not availability.get("available"):
                raise HTTPException(
                    status_code=400,
                    detail="Room no longer available. Please refresh and try again."
                )

            # Create TBO booking
            client_ref = tbo_client.generate_client_reference(
                db.get_event(booking.event_id).get("event_code", "EVT")
            )

            # Parse guest name
            name_parts = booking.guest_name.split(" ", 2)
            salutation = name_parts[0] if len(name_parts) > 0 else "Mr"
            first_name = name_parts[1] if len(name_parts) > 1 else booking.guest_name
            last_name = name_parts[2] if len(name_parts) > 2 else ""

            tbo_result = await tbo_client.create_booking(
                session_id=inventory["tbo_session_id"],
                result_index=inventory.get("tbo_result_index", 0),
                hotel_code=inventory["tbo_hotel_code"],
                hotel_name=inventory["hotel_name"],
                client_reference=client_ref,
                guest_nationality="IN",
                guests=[{
                    "salutation": salutation.replace(".", ""),
                    "first_name": first_name,
                    "last_name": last_name or first_name,
                    "is_lead": True,
                    "room_number": 1
                }],
                rooms=[{
                    "room_index": inventory.get("tbo_room_index", 0),
                    "room_type_name": booking.room_type,
                    "room_type_code": inventory.get("room_type_code", "STD"),
                    "rate_plan_code": inventory.get("rate_plan_code", "DEFAULT"),
                    "room_fare": booking.rate_per_night * ((booking.check_out_date - booking.check_in_date).days),
                    "room_tax": booking.rate_per_night * ((booking.check_out_date - booking.check_in_date).days) * 0.18,
                    "total_fare": booking.rate_per_night * ((booking.check_out_date - booking.check_in_date).days) * 1.18,
                    "currency": "INR"
                }],
                voucher_booking=False,
                special_requests=booking.special_requests
            )

            if tbo_result.success:
                tbo_booking_id = tbo_result.booking_id
                tbo_confirmation_no = tbo_result.confirmation_no
                booking_data["tbo_booking_id"] = tbo_booking_id
                booking_data["tbo_confirmation_no"] = tbo_confirmation_no
                logger.info(f"TBO Booking created: {tbo_booking_id} / {tbo_confirmation_no}")
            else:
                logger.warning(f"TBO Booking failed: {tbo_result.error_message}")
                # Continue with local booking even if TBO fails

        except TBOError as e:
            logger.error(f"TBO API error during booking: {e.message}")
            # Continue with local booking - TBO integration is optional

    # Create local booking
    created = db.create_booking(booking_data)

    # Invalidate cache for this event
    event_id = booking.event_id
    await cache_service.invalidate_event_cache(event_id)
    logger.info(f"Cache invalidated for event {event_id} after booking creation")

    # Send confirmation notification in background
    if booking.guest_email:
        event = db.get_event(event_id)
        background_tasks.add_task(
            notification_service.send_booking_confirmation,
            booking_id=created["id"],
            guest_email=booking.guest_email,
            guest_phone=booking.guest_phone or "",
            guest_name=booking.guest_name,
            booking_reference=created["booking_reference"],
            event_name=event.get("name", "Event") if event else "Event",
            hotel_name=inventory["hotel_name"],
            room_type=booking.room_type,
            check_in=booking.check_in_date,
            check_out=booking.check_out_date,
            total_amount=created["total_amount"],
            payment_deadline=created.get("payment_deadline", date.today() + timedelta(days=7)),
            channels=[NotificationChannel.EMAIL]
        )

    return format_booking_for_response(created)


@router.put("/{booking_id}")
async def update_booking(booking_id: str, update: BookingUpdate, background_tasks: BackgroundTasks):
    """Update a booking"""
    booking = db.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    updated = db.update_booking(booking_id, update_data)

    # Invalidate cache for this event
    event_id = booking.get("event_id")
    if event_id:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after booking update")

    return format_booking_for_response(updated)


@router.delete("/{booking_id}")
async def delete_booking(booking_id: str, background_tasks: BackgroundTasks):
    """Cancel/Delete a booking"""
    # Get booking first to know which event cache to invalidate
    booking = db.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    event_id = booking.get("event_id")

    # Cancel TBO booking if exists
    tbo_booking_id = booking.get("tbo_booking_id")
    if tbo_booking_id:
        try:
            cancel_result = await tbo_client.cancel_booking(
                booking_id=tbo_booking_id,
                remarks="Cancelled by user"
            )
            logger.info(f"TBO Booking cancelled: {tbo_booking_id}, result: {cancel_result}")
        except TBOError as e:
            logger.error(f"Failed to cancel TBO booking: {e.message}")
            # Continue with local cancellation even if TBO fails

    if not db.delete_booking(booking_id):
        raise HTTPException(status_code=404, detail="Booking not found")

    # Invalidate cache for this event
    if event_id:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after booking deletion")

    # Send cancellation notification
    if booking.get("guest_email"):
        event = db.get_event(event_id)
        background_tasks.add_task(
            notification_service.send_cancellation_confirmation,
            booking_id=booking_id,
            guest_email=booking["guest_email"],
            guest_name=booking["guest_name"],
            booking_reference=booking["booking_reference"],
            event_name=event.get("name", "Event") if event else "Event",
            reason="Cancelled by user",
            refund_amount=booking.get("amount_paid", 0)
        )

    return {"message": "Booking cancelled successfully"}


@router.post("/{booking_id}/confirm")
async def confirm_booking(booking_id: str, background_tasks: BackgroundTasks):
    """Confirm a pending booking"""
    booking = db.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be confirmed")

    updated = db.update_booking(booking_id, {"status": "confirmed"})

    # Invalidate cache for this event
    event_id = booking.get("event_id")
    if event_id:
        await cache_service.invalidate_event_cache(event_id)

    return format_booking_for_response(updated)


@router.post("/{booking_id}/cancel")
async def cancel_booking_status(
    booking_id: str,
    reason: str = "Cancelled by user",
    background_tasks: BackgroundTasks = None
):
    """Cancel a booking (change status only)"""
    booking = db.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking["status"] == "cancelled":
        raise HTTPException(status_code=400, detail="Booking is already cancelled")

    # Cancel TBO booking if exists
    tbo_booking_id = booking.get("tbo_booking_id")
    if tbo_booking_id:
        try:
            cancel_result = await tbo_client.cancel_booking(
                booking_id=tbo_booking_id,
                remarks=reason
            )
            logger.info(f"TBO Booking cancelled: {tbo_booking_id}")
        except TBOError as e:
            logger.error(f"Failed to cancel TBO booking: {e.message}")

    updated = db.update_booking(booking_id, {"status": "cancelled", "cancel_reason": reason})

    # Invalidate cache for this event
    event_id = booking.get("event_id")
    if event_id:
        await cache_service.invalidate_event_cache(event_id)

    # Send cancellation notification
    if background_tasks and booking.get("guest_email"):
        event = db.get_event(event_id)
        background_tasks.add_task(
            notification_service.send_cancellation_confirmation,
            booking_id=booking_id,
            guest_email=booking["guest_email"],
            guest_name=booking["guest_name"],
            booking_reference=booking["booking_reference"],
            event_name=event.get("name", "Event") if event else "Event",
            reason=reason,
            refund_amount=booking.get("amount_paid", 0)
        )

    return format_booking_for_response(updated)


@router.post("/bulk-action", response_model=BulkActionResponse)
async def bulk_action(request: BulkActionRequest, background_tasks: BackgroundTasks):
    """Perform bulk actions on bookings"""
    success = 0
    failed = 0
    errors = []
    affected_event_ids = set()

    for booking_id in request.booking_ids:
        try:
            booking = db.get_booking(booking_id)
            if not booking:
                failed += 1
                errors.append(f"Booking {booking_id} not found")
                continue

            # Track affected event IDs for cache invalidation
            event_id = booking.get("event_id")
            if event_id:
                affected_event_ids.add(event_id)

            if request.action == "confirm":
                if booking["status"] == "pending":
                    db.update_booking(booking_id, {"status": "confirmed"})
                    success += 1
                else:
                    failed += 1
                    errors.append(f"Booking {booking_id} cannot be confirmed")

            elif request.action == "cancel":
                if booking["status"] not in ["cancelled", "checked_out"]:
                    # Cancel TBO booking if exists
                    tbo_booking_id = booking.get("tbo_booking_id")
                    if tbo_booking_id:
                        try:
                            await tbo_client.cancel_booking(tbo_booking_id)
                        except TBOError:
                            pass  # Continue even if TBO cancel fails

                    db.update_booking(booking_id, {"status": "cancelled"})
                    success += 1
                else:
                    failed += 1
                    errors.append(f"Booking {booking_id} cannot be cancelled")

            elif request.action == "send_reminder":
                # Send payment reminder
                if booking.get("guest_email") and booking.get("payment_status") != "paid":
                    event = db.get_event(event_id)
                    background_tasks.add_task(
                        notification_service.send_payment_reminder,
                        booking_id=booking_id,
                        guest_email=booking["guest_email"],
                        guest_phone=booking.get("guest_phone", ""),
                        guest_name=booking["guest_name"],
                        booking_reference=booking["booking_reference"],
                        event_name=event.get("name", "Event") if event else "Event",
                        amount_due=booking["amount_due"],
                        payment_deadline=booking.get("payment_deadline", date.today() + timedelta(days=7)),
                        channels=[NotificationChannel.EMAIL]
                    )
                    success += 1
                else:
                    failed += 1
                    errors.append(f"Booking {booking_id}: No email or already paid")

            else:
                failed += 1
                errors.append(f"Unknown action: {request.action}")

        except Exception as e:
            failed += 1
            errors.append(str(e))

    # Invalidate cache for all affected events
    for event_id in affected_event_ids:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after bulk action")

    return BulkActionResponse(success=success, failed=failed, errors=errors)


@router.post("/{booking_id}/send-reminder")
async def send_payment_reminder(booking_id: str, background_tasks: BackgroundTasks):
    """Send payment reminder for a specific booking"""
    booking = db.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.get("payment_status") == "paid":
        raise HTTPException(status_code=400, detail="Booking is already paid")

    if not booking.get("guest_email"):
        raise HTTPException(status_code=400, detail="No email address for this booking")

    event = db.get_event(booking.get("event_id"))

    background_tasks.add_task(
        notification_service.send_payment_reminder,
        booking_id=booking_id,
        guest_email=booking["guest_email"],
        guest_phone=booking.get("guest_phone", ""),
        guest_name=booking["guest_name"],
        booking_reference=booking["booking_reference"],
        event_name=event.get("name", "Event") if event else "Event",
        amount_due=booking["amount_due"],
        payment_deadline=booking.get("payment_deadline", date.today() + timedelta(days=7)),
        channels=[NotificationChannel.EMAIL]
    )

    return {"message": "Payment reminder queued for delivery"}
