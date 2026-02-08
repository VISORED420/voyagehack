"""
Payments API Routes
"""
from fastapi import APIRouter, HTTPException
from typing import List
import logging
from ..models.database import db
from ..models.schemas import PaymentCreate, PaymentResponse
from ..services.cache import cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/booking/{booking_id}", response_model=List[dict])
async def get_booking_payments(booking_id: str):
    """Get all payments for a booking"""
    booking = db.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    payments = db.get_payments(booking_id)
    return [{
        **p,
        "created_at": p["created_at"].isoformat() if p.get("created_at") else None
    } for p in payments]


@router.post("", response_model=dict)
async def record_payment(payment: PaymentCreate):
    """Record a new payment"""
    booking = db.get_booking(payment.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Validate payment amount
    if payment.amount <= 0:
        raise HTTPException(status_code=400, detail="Payment amount must be positive")

    if payment.amount > booking["amount_due"]:
        raise HTTPException(
            status_code=400,
            detail=f"Payment amount ({payment.amount}) exceeds amount due ({booking['amount_due']})"
        )

    payment_data = payment.model_dump()
    created = db.create_payment(payment_data)

    # Invalidate cache for this event (payment status affects dashboard stats)
    event_id = booking.get("event_id")
    if event_id:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after payment recorded")

    return {
        **created,
        "created_at": created["created_at"].isoformat() if created.get("created_at") else None,
        "booking_updated": {
            "amount_paid": db.get_booking(payment.booking_id)["amount_paid"],
            "amount_due": db.get_booking(payment.booking_id)["amount_due"],
            "payment_status": db.get_booking(payment.booking_id)["payment_status"]
        }
    }


@router.post("/event/{event_id}/summary")
async def get_payment_summary(event_id: str):
    """Get payment summary for an event"""
    bookings = db.get_bookings(event_id)

    total_value = sum(b["total_amount"] for b in bookings if b["status"] != "cancelled")
    total_collected = sum(b["amount_paid"] for b in bookings)
    total_pending = total_value - total_collected

    paid_bookings = len([b for b in bookings if b["payment_status"] == "paid"])
    partial_bookings = len([b for b in bookings if b["payment_status"] == "partial"])
    pending_bookings = len([b for b in bookings if b["payment_status"] == "pending"])

    return {
        "total_booking_value": total_value,
        "total_collected": total_collected,
        "total_pending": total_pending,
        "collection_rate": round((total_collected / total_value) * 100, 1) if total_value > 0 else 0,
        "bookings_by_payment_status": {
            "paid": paid_bookings,
            "partial": partial_bookings,
            "pending": pending_bookings
        }
    }


@router.post("/booking/{booking_id}/refund")
async def process_refund(booking_id: str, amount: float, reason: str = "Refund requested"):
    """Process a refund for a booking"""
    booking = db.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Refund amount must be positive")

    if amount > booking["amount_paid"]:
        raise HTTPException(
            status_code=400,
            detail=f"Refund amount ({amount}) exceeds amount paid ({booking['amount_paid']})"
        )

    # Record negative payment (refund)
    refund_data = {
        "booking_id": booking_id,
        "amount": -amount,
        "payment_method": "refund",
        "reason": reason
    }
    created = db.create_payment(refund_data)

    # Invalidate cache for this event (payment status affects dashboard stats)
    event_id = booking.get("event_id")
    if event_id:
        await cache_service.invalidate_event_cache(event_id)
        logger.info(f"Cache invalidated for event {event_id} after refund processed")

    return {
        "message": "Refund processed successfully",
        "refund_amount": amount,
        "booking_updated": {
            "amount_paid": db.get_booking(booking_id)["amount_paid"],
            "amount_due": db.get_booking(booking_id)["amount_due"],
            "payment_status": db.get_booking(booking_id)["payment_status"]
        }
    }
