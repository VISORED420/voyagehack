"""
Notification Service
Handles email, SMS, and WhatsApp notifications
"""
import logging
from datetime import date, datetime
from typing import List, Optional, Dict, Any
from enum import Enum
from dataclasses import dataclass
import asyncio

from ..config import settings

logger = logging.getLogger(__name__)


class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    PUSH = "push"


class NotificationType(str, Enum):
    INVITATION = "invitation"
    BOOKING_CONFIRMATION = "booking_confirmation"
    PAYMENT_REMINDER = "payment_reminder"
    PAYMENT_RECEIVED = "payment_received"
    BOOKING_CANCELLED = "booking_cancelled"
    PRE_ARRIVAL = "pre_arrival"
    CHECK_IN_REMINDER = "check_in_reminder"
    POST_CHECKOUT = "post_checkout"
    CUSTOM = "custom"


@dataclass
class NotificationResult:
    """Result of notification attempt"""
    success: bool
    channel: NotificationChannel
    recipient: str
    message_id: Optional[str] = None
    error: Optional[str] = None


class EmailTemplate:
    """Email templates for different notification types"""

    @staticmethod
    def booking_confirmation(
        guest_name: str,
        booking_reference: str,
        event_name: str,
        hotel_name: str,
        room_type: str,
        check_in: date,
        check_out: date,
        num_nights: int,
        total_amount: float,
        payment_deadline: date
    ) -> Dict[str, str]:
        """Generate booking confirmation email"""
        subject = f"Booking Confirmed - {booking_reference} | {event_name}"

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .booking-details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .detail-row {{ display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }}
        .detail-label {{ color: #666; }}
        .detail-value {{ font-weight: bold; }}
        .total {{ font-size: 1.2em; color: #667eea; }}
        .cta-button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 12px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Confirmed!</h1>
            <p>{event_name}</p>
        </div>
        <div class="content">
            <p>Dear {guest_name},</p>
            <p>Your booking has been confirmed. Here are your booking details:</p>

            <div class="booking-details">
                <div class="detail-row">
                    <span class="detail-label">Booking Reference</span>
                    <span class="detail-value">{booking_reference}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Hotel</span>
                    <span class="detail-value">{hotel_name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Room Type</span>
                    <span class="detail-value">{room_type}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Check-in</span>
                    <span class="detail-value">{check_in.strftime('%B %d, %Y')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Check-out</span>
                    <span class="detail-value">{check_out.strftime('%B %d, %Y')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Duration</span>
                    <span class="detail-value">{num_nights} Night(s)</span>
                </div>
                <div class="detail-row total">
                    <span class="detail-label">Total Amount</span>
                    <span class="detail-value">INR {total_amount:,.2f}</span>
                </div>
            </div>

            <p><strong>Payment Deadline:</strong> {payment_deadline.strftime('%B %d, %Y')}</p>

            <center>
                <a href="#" class="cta-button">View Booking Details</a>
            </center>

            <p>If you have any questions, please don't hesitate to contact us.</p>

            <p>Best regards,<br>The Event Team</p>
        </div>
        <div class="footer">
            <p>This is an automated email. Please do not reply directly.</p>
        </div>
    </div>
</body>
</html>
"""

        text_body = f"""
Booking Confirmed - {booking_reference}

Dear {guest_name},

Your booking for {event_name} has been confirmed!

BOOKING DETAILS:
================
Booking Reference: {booking_reference}
Hotel: {hotel_name}
Room Type: {room_type}
Check-in: {check_in.strftime('%B %d, %Y')}
Check-out: {check_out.strftime('%B %d, %Y')}
Duration: {num_nights} Night(s)
Total Amount: INR {total_amount:,.2f}

Payment Deadline: {payment_deadline.strftime('%B %d, %Y')}

If you have any questions, please contact us.

Best regards,
The Event Team
"""

        return {
            "subject": subject,
            "html": html_body,
            "text": text_body
        }

    @staticmethod
    def payment_reminder(
        guest_name: str,
        booking_reference: str,
        event_name: str,
        amount_due: float,
        payment_deadline: date,
        days_remaining: int
    ) -> Dict[str, str]:
        """Generate payment reminder email"""
        urgency = "URGENT: " if days_remaining <= 3 else ""
        subject = f"{urgency}Payment Reminder - {booking_reference} | {event_name}"

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: {'#dc3545' if days_remaining <= 3 else '#ffc107'}; color: {'white' if days_remaining <= 3 else '#333'}; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .amount {{ font-size: 2em; color: #667eea; text-align: center; margin: 20px 0; }}
        .deadline {{ background: {'#ffebee' if days_remaining <= 3 else '#fff3e0'}; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }}
        .cta-button {{ display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Payment Reminder</h1>
            <p>{event_name}</p>
        </div>
        <div class="content">
            <p>Dear {guest_name},</p>
            <p>This is a friendly reminder about your pending payment for booking <strong>{booking_reference}</strong>.</p>

            <div class="amount">
                INR {amount_due:,.2f}
            </div>

            <div class="deadline">
                <strong>Payment Due:</strong> {payment_deadline.strftime('%B %d, %Y')}<br>
                <span style="color: {'#dc3545' if days_remaining <= 3 else '#ff9800'};">
                    ({days_remaining} day(s) remaining)
                </span>
            </div>

            <center>
                <a href="#" class="cta-button">Pay Now</a>
            </center>

            <p>Please complete your payment before the deadline to secure your booking.</p>

            <p>Best regards,<br>The Event Team</p>
        </div>
    </div>
</body>
</html>
"""

        text_body = f"""
{urgency}Payment Reminder - {booking_reference}

Dear {guest_name},

This is a reminder about your pending payment for {event_name}.

Booking Reference: {booking_reference}
Amount Due: INR {amount_due:,.2f}
Payment Deadline: {payment_deadline.strftime('%B %d, %Y')} ({days_remaining} days remaining)

Please complete your payment before the deadline to secure your booking.

Best regards,
The Event Team
"""

        return {
            "subject": subject,
            "html": html_body,
            "text": text_body
        }

    @staticmethod
    def cancellation_confirmation(
        guest_name: str,
        booking_reference: str,
        event_name: str,
        refund_amount: float = 0
    ) -> Dict[str, str]:
        """Generate cancellation confirmation email"""
        subject = f"Booking Cancelled - {booking_reference} | {event_name}"

        refund_text = f"A refund of INR {refund_amount:,.2f} will be processed within 5-7 business days." if refund_amount > 0 else ""

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #6c757d; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .refund {{ background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Cancelled</h1>
            <p>{event_name}</p>
        </div>
        <div class="content">
            <p>Dear {guest_name},</p>
            <p>Your booking <strong>{booking_reference}</strong> has been cancelled as requested.</p>

            {f'<div class="refund"><p>{refund_text}</p></div>' if refund_amount > 0 else ''}

            <p>If you have any questions or would like to make a new booking, please contact us.</p>

            <p>Best regards,<br>The Event Team</p>
        </div>
    </div>
</body>
</html>
"""

        text_body = f"""
Booking Cancelled - {booking_reference}

Dear {guest_name},

Your booking {booking_reference} for {event_name} has been cancelled as requested.

{refund_text}

If you have any questions or would like to make a new booking, please contact us.

Best regards,
The Event Team
"""

        return {
            "subject": subject,
            "html": html_body,
            "text": text_body
        }

    @staticmethod
    def invitation(
        guest_name: str,
        event_name: str,
        event_date: str,
        venue: str,
        microsite_url: str,
        host_name: str
    ) -> Dict[str, str]:
        """Generate event invitation email"""
        subject = f"You're Invited! {event_name}"

        html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }}
        .header h1 {{ margin: 0; font-size: 2em; }}
        .content {{ background: #fff; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .event-details {{ background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }}
        .cta-button {{ display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; margin: 20px 0; font-size: 1.1em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{event_name}</h1>
            <p>You're Invited!</p>
        </div>
        <div class="content">
            <p>Dear {guest_name},</p>
            <p>{host_name} would be delighted to have you join us for this special occasion!</p>

            <div class="event-details">
                <h3>{event_name}</h3>
                <p><strong>Date:</strong> {event_date}</p>
                <p><strong>Venue:</strong> {venue}</p>
            </div>

            <p>We have arranged special accommodation rates for our guests. Book your stay now to secure your room!</p>

            <center>
                <a href="{microsite_url}" class="cta-button">Book Your Stay</a>
            </center>

            <p>We look forward to celebrating with you!</p>

            <p>Warm regards,<br>{host_name}</p>
        </div>
    </div>
</body>
</html>
"""

        text_body = f"""
You're Invited to {event_name}!

Dear {guest_name},

{host_name} would be delighted to have you join us for this special occasion!

EVENT DETAILS:
==============
Event: {event_name}
Date: {event_date}
Venue: {venue}

We have arranged special accommodation rates for our guests.

Book your stay here: {microsite_url}

We look forward to celebrating with you!

Warm regards,
{host_name}
"""

        return {
            "subject": subject,
            "html": html_body,
            "text": text_body
        }


class NotificationService:
    """
    Notification service for sending emails, SMS, and WhatsApp messages

    In production, integrate with:
    - Email: SendGrid, AWS SES, or similar
    - SMS: Twilio, MSG91, or similar
    - WhatsApp: Twilio WhatsApp Business API or similar
    """

    def __init__(self):
        self._email_provider = None  # SendGrid client
        self._sms_provider = None    # Twilio client
        self._whatsapp_provider = None

    async def send_booking_confirmation(
        self,
        booking_id: str,
        guest_email: str,
        guest_phone: str,
        guest_name: str,
        booking_reference: str,
        event_name: str,
        hotel_name: str,
        room_type: str,
        check_in: date,
        check_out: date,
        total_amount: float,
        payment_deadline: date,
        channels: List[NotificationChannel] = None
    ) -> List[NotificationResult]:
        """Send booking confirmation via multiple channels"""
        if channels is None:
            channels = [NotificationChannel.EMAIL]

        num_nights = (check_out - check_in).days
        results = []

        template = EmailTemplate.booking_confirmation(
            guest_name=guest_name,
            booking_reference=booking_reference,
            event_name=event_name,
            hotel_name=hotel_name,
            room_type=room_type,
            check_in=check_in,
            check_out=check_out,
            num_nights=num_nights,
            total_amount=total_amount,
            payment_deadline=payment_deadline
        )

        for channel in channels:
            if channel == NotificationChannel.EMAIL:
                result = await self._send_email(
                    to_email=guest_email,
                    subject=template["subject"],
                    html_body=template["html"],
                    text_body=template["text"]
                )
            elif channel == NotificationChannel.SMS:
                sms_text = f"Booking Confirmed! Ref: {booking_reference}. {hotel_name}, {check_in.strftime('%b %d')} - {check_out.strftime('%b %d')}. Amount: INR {total_amount:,.0f}"
                result = await self._send_sms(guest_phone, sms_text)
            elif channel == NotificationChannel.WHATSAPP:
                result = await self._send_whatsapp(
                    phone=guest_phone,
                    template="booking_confirmation",
                    params={
                        "guest_name": guest_name,
                        "booking_reference": booking_reference,
                        "hotel_name": hotel_name,
                        "check_in": check_in.strftime('%B %d, %Y'),
                        "check_out": check_out.strftime('%B %d, %Y'),
                        "total_amount": f"INR {total_amount:,.2f}"
                    }
                )
            else:
                continue

            results.append(result)

            # Log notification
            await self._log_notification(
                booking_id=booking_id,
                notification_type=NotificationType.BOOKING_CONFIRMATION,
                channel=channel,
                recipient=guest_email if channel == NotificationChannel.EMAIL else guest_phone,
                success=result.success,
                error=result.error
            )

        return results

    async def send_payment_reminder(
        self,
        booking_id: str,
        guest_email: str,
        guest_phone: str,
        guest_name: str,
        booking_reference: str,
        event_name: str,
        amount_due: float,
        payment_deadline: date,
        channels: List[NotificationChannel] = None
    ) -> List[NotificationResult]:
        """Send payment reminder"""
        if channels is None:
            channels = [NotificationChannel.EMAIL]

        days_remaining = (payment_deadline - date.today()).days
        results = []

        template = EmailTemplate.payment_reminder(
            guest_name=guest_name,
            booking_reference=booking_reference,
            event_name=event_name,
            amount_due=amount_due,
            payment_deadline=payment_deadline,
            days_remaining=days_remaining
        )

        for channel in channels:
            if channel == NotificationChannel.EMAIL:
                result = await self._send_email(
                    to_email=guest_email,
                    subject=template["subject"],
                    html_body=template["html"],
                    text_body=template["text"]
                )
            elif channel == NotificationChannel.SMS:
                urgency = "URGENT: " if days_remaining <= 3 else ""
                sms_text = f"{urgency}Payment reminder for {booking_reference}. Amount: INR {amount_due:,.0f}. Due: {payment_deadline.strftime('%b %d')}. Pay now to confirm."
                result = await self._send_sms(guest_phone, sms_text)
            else:
                continue

            results.append(result)

            await self._log_notification(
                booking_id=booking_id,
                notification_type=NotificationType.PAYMENT_REMINDER,
                channel=channel,
                recipient=guest_email if channel == NotificationChannel.EMAIL else guest_phone,
                success=result.success,
                error=result.error
            )

        return results

    async def send_cancellation_confirmation(
        self,
        booking_id: str,
        guest_email: str,
        guest_name: str,
        booking_reference: str,
        event_name: str,
        reason: str = None,
        refund_amount: float = 0
    ) -> NotificationResult:
        """Send cancellation confirmation"""
        template = EmailTemplate.cancellation_confirmation(
            guest_name=guest_name,
            booking_reference=booking_reference,
            event_name=event_name,
            refund_amount=refund_amount
        )

        result = await self._send_email(
            to_email=guest_email,
            subject=template["subject"],
            html_body=template["html"],
            text_body=template["text"]
        )

        await self._log_notification(
            booking_id=booking_id,
            notification_type=NotificationType.BOOKING_CANCELLED,
            channel=NotificationChannel.EMAIL,
            recipient=guest_email,
            success=result.success,
            error=result.error
        )

        return result

    async def send_invitation(
        self,
        event_id: str,
        guest_email: str,
        guest_name: str,
        event_name: str,
        event_date: str,
        venue: str,
        microsite_url: str,
        host_name: str
    ) -> NotificationResult:
        """Send event invitation"""
        template = EmailTemplate.invitation(
            guest_name=guest_name,
            event_name=event_name,
            event_date=event_date,
            venue=venue,
            microsite_url=microsite_url,
            host_name=host_name
        )

        result = await self._send_email(
            to_email=guest_email,
            subject=template["subject"],
            html_body=template["html"],
            text_body=template["text"]
        )

        await self._log_notification(
            booking_id=None,
            notification_type=NotificationType.INVITATION,
            channel=NotificationChannel.EMAIL,
            recipient=guest_email,
            success=result.success,
            error=result.error,
            event_id=event_id
        )

        return result

    async def send_bulk_reminders(
        self,
        bookings: List[Dict[str, Any]],
        event_name: str
    ) -> Dict[str, Any]:
        """Send payment reminders to multiple bookings"""
        success_count = 0
        failed_count = 0
        errors = []

        for booking in bookings:
            try:
                results = await self.send_payment_reminder(
                    booking_id=booking['id'],
                    guest_email=booking['guest_email'],
                    guest_phone=booking.get('guest_phone', ''),
                    guest_name=booking['guest_name'],
                    booking_reference=booking['booking_reference'],
                    event_name=event_name,
                    amount_due=booking['amount_due'],
                    payment_deadline=booking['payment_deadline']
                )

                if any(r.success for r in results):
                    success_count += 1
                else:
                    failed_count += 1
                    errors.append(f"{booking['booking_reference']}: {results[0].error if results else 'Unknown error'}")

            except Exception as e:
                failed_count += 1
                errors.append(f"{booking.get('booking_reference', 'Unknown')}: {str(e)}")

        return {
            "total": len(bookings),
            "success": success_count,
            "failed": failed_count,
            "errors": errors
        }

    # ============================================================
    # PROVIDER METHODS (Implement with actual providers)
    # ============================================================

    async def _send_email(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str
    ) -> NotificationResult:
        """
        Send email using configured provider

        In production, integrate with SendGrid, AWS SES, etc.
        """
        # For demo, log and return success
        logger.info(f"[EMAIL] To: {to_email} | Subject: {subject}")

        # In production:
        # try:
        #     message = Mail(
        #         from_email='noreply@yourdomain.com',
        #         to_emails=to_email,
        #         subject=subject,
        #         html_content=html_body,
        #         plain_text_content=text_body
        #     )
        #     response = await self._email_provider.send(message)
        #     return NotificationResult(
        #         success=True,
        #         channel=NotificationChannel.EMAIL,
        #         recipient=to_email,
        #         message_id=response.headers.get('X-Message-Id')
        #     )
        # except Exception as e:
        #     return NotificationResult(
        #         success=False,
        #         channel=NotificationChannel.EMAIL,
        #         recipient=to_email,
        #         error=str(e)
        #     )

        return NotificationResult(
            success=True,
            channel=NotificationChannel.EMAIL,
            recipient=to_email,
            message_id=f"demo-{datetime.now().timestamp()}"
        )

    async def _send_sms(
        self,
        phone: str,
        message: str
    ) -> NotificationResult:
        """
        Send SMS using configured provider

        In production, integrate with Twilio, MSG91, etc.
        """
        logger.info(f"[SMS] To: {phone} | Message: {message[:50]}...")

        # In production:
        # try:
        #     response = await self._sms_provider.messages.create(
        #         body=message,
        #         from_='+1234567890',
        #         to=phone
        #     )
        #     return NotificationResult(
        #         success=True,
        #         channel=NotificationChannel.SMS,
        #         recipient=phone,
        #         message_id=response.sid
        #     )
        # except Exception as e:
        #     return NotificationResult(
        #         success=False,
        #         channel=NotificationChannel.SMS,
        #         recipient=phone,
        #         error=str(e)
        #     )

        return NotificationResult(
            success=True,
            channel=NotificationChannel.SMS,
            recipient=phone,
            message_id=f"demo-sms-{datetime.now().timestamp()}"
        )

    async def _send_whatsapp(
        self,
        phone: str,
        template: str,
        params: Dict[str, str]
    ) -> NotificationResult:
        """
        Send WhatsApp message using configured provider

        In production, integrate with Twilio WhatsApp Business API
        """
        logger.info(f"[WHATSAPP] To: {phone} | Template: {template}")

        # In production:
        # try:
        #     response = await self._whatsapp_provider.messages.create(
        #         from_='whatsapp:+1234567890',
        #         to=f'whatsapp:{phone}',
        #         template={
        #             'name': template,
        #             'language': {'code': 'en'},
        #             'components': [{'type': 'body', 'parameters': params}]
        #         }
        #     )
        #     return NotificationResult(
        #         success=True,
        #         channel=NotificationChannel.WHATSAPP,
        #         recipient=phone,
        #         message_id=response.sid
        #     )
        # except Exception as e:
        #     return NotificationResult(
        #         success=False,
        #         channel=NotificationChannel.WHATSAPP,
        #         recipient=phone,
        #         error=str(e)
        #     )

        return NotificationResult(
            success=True,
            channel=NotificationChannel.WHATSAPP,
            recipient=phone,
            message_id=f"demo-wa-{datetime.now().timestamp()}"
        )

    async def _log_notification(
        self,
        notification_type: NotificationType,
        channel: NotificationChannel,
        recipient: str,
        success: bool,
        error: Optional[str] = None,
        booking_id: str = None,
        event_id: str = None
    ):
        """Log notification to database"""
        # In production, store in communications table
        logger.info(
            f"Notification logged: type={notification_type.value}, "
            f"channel={channel.value}, recipient={recipient}, "
            f"success={success}, booking_id={booking_id}"
        )


# Global notification service instance
notification_service = NotificationService()


async def get_notification_service() -> NotificationService:
    """Dependency injection helper for FastAPI"""
    return notification_service
