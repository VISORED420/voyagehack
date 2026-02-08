"""
In-Memory Database for Demo
Replace with SQLAlchemy models for production
"""
from datetime import date, datetime, timedelta
from typing import Dict, List, Any, Optional
import uuid


class InMemoryDB:
    """
    Simple in-memory database for demo purposes.
    In production, use PostgreSQL with SQLAlchemy.
    """

    def __init__(self):
        self._events: Dict[str, dict] = {}
        self._guests: Dict[str, dict] = {}
        self._inventory: Dict[str, dict] = {}
        self._bookings: Dict[str, dict] = {}
        self._payments: Dict[str, dict] = {}
        self._communications: Dict[str, dict] = {}
        self._audit_logs: List[dict] = []  # Audit log storage
        self._booking_counter = 0
        self._load_sample_data()

    def _load_sample_data(self):
        """Load sample data matching the frontend"""
        # Sample Event
        event_id = "33333333-3333-3333-3333-333333333333"
        self._events[event_id] = {
            "id": event_id,
            "name": "Sharma-Gupta Wedding",
            "event_code": "WED-2026-SG",
            "event_type": "Wedding",
            "start_date": date(2026, 2, 22),
            "end_date": date(2026, 2, 25),
            "destination": "Udaipur, Rajasthan",
            "booking_deadline": date(2026, 2, 15),
            "status": "active",
            "host_name": "Mr. & Mrs. Sharma",
            "host_email": "sharma.family@gmail.com",
            "host_phone": "+91-9876543210",
            "created_at": datetime.now()
        }

        # Sample Inventory
        inv1_id = "44444444-4444-4444-4444-444444444444"
        inv2_id = "55555555-5555-5555-5555-555555555555"
        inv3_id = "66666666-6666-6666-6666-666666666666"

        self._inventory[inv1_id] = {
            "id": inv1_id,
            "event_id": event_id,
            "hotel_name": "Taj Lake Palace",
            "room_type": "Deluxe Lake View",
            "room_type_code": "DLX-LV",
            "total_rooms_blocked": 30,
            "rooms_booked": 24,
            "negotiated_rate": 18000.00,
            "rack_rate": 25000.00,
            "valid_from": date(2026, 2, 21),
            "valid_to": date(2026, 2, 26),
            "release_date": date(2026, 2, 17),
            "inclusions": ["Breakfast Buffet", "Airport Transfer", "Welcome Drink", "Wi-Fi"],
            "meal_plan": "CP"
        }

        self._inventory[inv2_id] = {
            "id": inv2_id,
            "event_id": event_id,
            "hotel_name": "Taj Lake Palace",
            "room_type": "Luxury Suite",
            "room_type_code": "LUX-STE",
            "total_rooms_blocked": 10,
            "rooms_booked": 7,
            "negotiated_rate": 35000.00,
            "rack_rate": 50000.00,
            "valid_from": date(2026, 2, 21),
            "valid_to": date(2026, 2, 26),
            "release_date": date(2026, 2, 17),
            "inclusions": ["Breakfast Buffet", "Airport Transfer", "Welcome Drink", "Wi-Fi", "Butler Service"],
            "meal_plan": "CP"
        }

        self._inventory[inv3_id] = {
            "id": inv3_id,
            "event_id": event_id,
            "hotel_name": "Oberoi Udaivilas",
            "room_type": "Premier Room",
            "room_type_code": "PRM-RM",
            "total_rooms_blocked": 10,
            "rooms_booked": 7,
            "negotiated_rate": 22000.00,
            "rack_rate": 32000.00,
            "valid_from": date(2026, 2, 21),
            "valid_to": date(2026, 2, 26),
            "release_date": date(2026, 2, 15),
            "inclusions": ["Breakfast", "Airport Pickup", "Wi-Fi"],
            "meal_plan": "CP"
        }

        # Sample Guests
        guests_data = [
            {"id": str(uuid.uuid4()), "first_name": "Amit", "last_name": "Kumar", "email": "amit.kumar@email.com", "phone": "+91-98765-43001", "category": "Family", "side": "Groom", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Neha", "last_name": "Patel", "email": "neha.patel@email.com", "phone": "+91-98765-43004", "category": "Friend", "side": "Bride", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Vikram", "last_name": "Singh", "email": "vikram.singh@email.com", "phone": "+91-98765-43003", "category": "Friend", "side": "Groom", "rsvp_status": "pending"},
            {"id": str(uuid.uuid4()), "first_name": "Rajesh", "last_name": "Mehta", "email": "rajesh.mehta@email.com", "phone": "+91-98765-43005", "category": "Family", "side": "Bride", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Sunita", "last_name": "Sharma", "email": "sunita.sharma@email.com", "phone": "+91-98765-43006", "category": "Family", "side": "Groom", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Karan", "last_name": "Malhotra", "email": "karan.m@email.com", "phone": "+91-98765-43007", "category": "Friend", "side": "Groom", "rsvp_status": "maybe"},
        ]

        for g in guests_data:
            g["event_id"] = event_id
            g["salutation"] = "Mr" if g["first_name"] in ["Amit", "Vikram", "Rajesh", "Karan"] else "Mrs" if g["first_name"] == "Sunita" else "Ms"
            g["dietary_requirements"] = ["Vegetarian"] if g["first_name"] in ["Amit", "Sunita"] else ["Jain"] if g["first_name"] == "Rajesh" else ["Non-Veg"] if g["first_name"] == "Vikram" else []
            g["invitation_status"] = "sent"
            g["created_at"] = datetime.now()
            self._guests[g["id"]] = g

        # Sample Bookings matching frontend data
        bookings_data = [
            {
                "guest_name": "Mr. Amit Kumar",
                "guest_email": "amit.kumar@email.com",
                "guest_phone": "+91-98765-43001",
                "hotel": "Taj Lake Palace",
                "room": "Deluxe Lake View",
                "check_in": date(2026, 2, 21),
                "check_out": date(2026, 2, 25),
                "nights": 4,
                "rooms": 1,
                "adults": 2,
                "children": 0,
                "total": 84960.00,
                "paid": 84960.00,
                "payment_status": "paid",
                "status": "confirmed",
                "category": "Family",
                "side": "Groom",
                "dietary": ["Vegetarian"],
                "source": "Microsite",
                "inventory_id": inv1_id,
                "rate_per_night": 18000.00
            },
            {
                "guest_name": "Ms. Neha Patel",
                "guest_email": "neha.patel@email.com",
                "guest_phone": "+91-98765-43004",
                "hotel": "Taj Lake Palace",
                "room": "Deluxe Lake View",
                "check_in": date(2026, 2, 22),
                "check_out": date(2026, 2, 25),
                "nights": 3,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 63720.00,
                "paid": 0.00,
                "payment_status": "pending",
                "status": "pending",
                "category": "Friend",
                "side": "Bride",
                "dietary": [],
                "source": "WhatsApp",
                "inventory_id": inv1_id,
                "rate_per_night": 18000.00
            },
            {
                "guest_name": "Mr. Vikram Singh",
                "guest_email": "vikram.singh@email.com",
                "guest_phone": "+91-98765-43003",
                "hotel": "Taj Lake Palace",
                "room": "Luxury Suite",
                "check_in": date(2026, 2, 21),
                "check_out": date(2026, 2, 25),
                "nights": 4,
                "rooms": 1,
                "adults": 2,
                "children": 0,
                "total": 165200.00,
                "paid": 50000.00,
                "payment_status": "partial",
                "status": "confirmed",
                "category": "Friend",
                "side": "Groom",
                "dietary": ["Non-Veg"],
                "source": "Microsite",
                "inventory_id": inv2_id,
                "rate_per_night": 35000.00
            },
            {
                "guest_name": "Dr. Rajesh Mehta",
                "guest_email": "rajesh.mehta@email.com",
                "guest_phone": "+91-98765-43005",
                "hotel": "Oberoi Udaivilas",
                "room": "Premier Room",
                "check_in": date(2026, 2, 22),
                "check_out": date(2026, 2, 24),
                "nights": 2,
                "rooms": 1,
                "adults": 2,
                "children": 1,
                "total": 52080.00,
                "paid": 52080.00,
                "payment_status": "paid",
                "status": "confirmed",
                "category": "Family",
                "side": "Bride",
                "dietary": ["Jain"],
                "source": "Agent",
                "inventory_id": inv3_id,
                "rate_per_night": 22000.00
            },
            {
                "guest_name": "Mrs. Sunita Sharma",
                "guest_email": "sunita.sharma@email.com",
                "guest_phone": "+91-98765-43006",
                "hotel": "Taj Lake Palace",
                "room": "Deluxe Lake View",
                "check_in": date(2026, 2, 21),
                "check_out": date(2026, 2, 25),
                "nights": 4,
                "rooms": 2,
                "adults": 4,
                "children": 2,
                "total": 169920.00,
                "paid": 100000.00,
                "payment_status": "partial",
                "status": "confirmed",
                "category": "Family",
                "side": "Groom",
                "dietary": ["Vegetarian"],
                "source": "Microsite",
                "inventory_id": inv1_id,
                "rate_per_night": 18000.00
            },
            {
                "guest_name": "Mr. Karan Malhotra",
                "guest_email": "karan.m@email.com",
                "guest_phone": "+91-98765-43007",
                "hotel": "Taj Lake Palace",
                "room": "Luxury Suite",
                "check_in": date(2026, 2, 22),
                "check_out": date(2026, 2, 25),
                "nights": 3,
                "rooms": 1,
                "adults": 2,
                "children": 0,
                "total": 123900.00,
                "paid": 0.00,
                "payment_status": "pending",
                "status": "waitlisted",
                "category": "Friend",
                "side": "Groom",
                "dietary": [],
                "source": "Email",
                "inventory_id": inv2_id,
                "rate_per_night": 35000.00
            }
        ]

        for i, b in enumerate(bookings_data, 1):
            booking_id = str(uuid.uuid4())
            self._booking_counter = i
            self._bookings[booking_id] = {
                "id": booking_id,
                "event_id": event_id,
                "booking_reference": f"WED-SG-{str(i).zfill(4)}",
                "guest_id": None,
                "inventory_id": b["inventory_id"],
                "guest_name": b["guest_name"],
                "guest_email": b["guest_email"],
                "guest_phone": b["guest_phone"],
                "hotel": b["hotel"],
                "room_type": b["room"],
                "check_in_date": b["check_in"],
                "check_out_date": b["check_out"],
                "num_nights": b["nights"],
                "num_rooms": b["rooms"],
                "num_adults": b["adults"],
                "num_children": b["children"],
                "rate_per_night": b["rate_per_night"],
                "total_room_charges": b["total"] / 1.18,
                "taxes": b["total"] - (b["total"] / 1.18),
                "total_amount": b["total"],
                "amount_paid": b["paid"],
                "amount_due": b["total"] - b["paid"],
                "payment_status": b["payment_status"],
                "status": b["status"],
                "booking_source": b["source"],
                "category": b["category"],
                "side": b["side"],
                "dietary_requirements": b["dietary"],
                "special_requests": None,
                "payment_deadline": date(2026, 2, 15),
                "created_at": datetime.now()
            }

        # ============================================================
        # EVENT 2: Corporate Retreat 2026
        # ============================================================
        corp_event_id = "44444444-4444-4444-4444-444444444441"
        self._events[corp_event_id] = {
            "id": corp_event_id,
            "name": "Corporate Retreat 2026",
            "event_code": "CORP-2026-TR",
            "event_type": "Corporate",
            "start_date": date(2026, 3, 15),
            "end_date": date(2026, 3, 18),
            "destination": "Goa",
            "booking_deadline": date(2026, 3, 1),
            "status": "active",
            "host_name": "TechCorp India Pvt Ltd",
            "host_email": "events@techcorp.in",
            "host_phone": "+91-9988776655",
            "created_at": datetime.now()
        }

        # Corporate Retreat Inventory
        corp_inv1_id = "77777777-7777-7777-7777-777777777771"
        corp_inv2_id = "77777777-7777-7777-7777-777777777772"

        self._inventory[corp_inv1_id] = {
            "id": corp_inv1_id,
            "event_id": corp_event_id,
            "hotel_name": "Taj Exotica Goa",
            "room_type": "Deluxe Room",
            "room_type_code": "DLX-RM",
            "total_rooms_blocked": 40,
            "rooms_booked": 28,
            "negotiated_rate": 12000.00,
            "rack_rate": 18000.00,
            "valid_from": date(2026, 3, 14),
            "valid_to": date(2026, 3, 19),
            "release_date": date(2026, 3, 5),
            "inclusions": ["Breakfast Buffet", "Wi-Fi", "Gym Access", "Pool Access"],
            "meal_plan": "CP"
        }

        self._inventory[corp_inv2_id] = {
            "id": corp_inv2_id,
            "event_id": corp_event_id,
            "hotel_name": "Taj Exotica Goa",
            "room_type": "Villa Suite",
            "room_type_code": "VLA-STE",
            "total_rooms_blocked": 10,
            "rooms_booked": 6,
            "negotiated_rate": 28000.00,
            "rack_rate": 40000.00,
            "valid_from": date(2026, 3, 14),
            "valid_to": date(2026, 3, 19),
            "release_date": date(2026, 3, 5),
            "inclusions": ["Breakfast Buffet", "Wi-Fi", "Private Pool", "Butler Service", "Airport Transfer"],
            "meal_plan": "MAP"
        }

        # Corporate Retreat Guests
        corp_guests_data = [
            {"id": str(uuid.uuid4()), "first_name": "Rahul", "last_name": "Verma", "email": "rahul.verma@techcorp.in", "phone": "+91-98111-22001", "category": "VIP", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Priya", "last_name": "Nair", "email": "priya.nair@techcorp.in", "phone": "+91-98111-22002", "category": "Colleague", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Arun", "last_name": "Iyer", "email": "arun.iyer@techcorp.in", "phone": "+91-98111-22003", "category": "Colleague", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Meera", "last_name": "Reddy", "email": "meera.reddy@techcorp.in", "phone": "+91-98111-22004", "category": "Colleague", "rsvp_status": "pending"},
            {"id": str(uuid.uuid4()), "first_name": "Sanjay", "last_name": "Kapoor", "email": "sanjay.kapoor@techcorp.in", "phone": "+91-98111-22005", "category": "VIP", "rsvp_status": "attending"},
        ]

        for g in corp_guests_data:
            g["event_id"] = corp_event_id
            g["salutation"] = "Mr" if g["first_name"] in ["Rahul", "Arun", "Sanjay"] else "Ms"
            g["side"] = None
            g["dietary_requirements"] = ["Vegetarian"] if g["first_name"] in ["Priya", "Meera"] else []
            g["invitation_status"] = "sent"
            g["created_at"] = datetime.now()
            self._guests[g["id"]] = g

        # Corporate Retreat Bookings
        corp_bookings_data = [
            {
                "guest_name": "Mr. Rahul Verma",
                "guest_email": "rahul.verma@techcorp.in",
                "guest_phone": "+91-98111-22001",
                "hotel": "Taj Exotica Goa",
                "room": "Villa Suite",
                "check_in": date(2026, 3, 14),
                "check_out": date(2026, 3, 18),
                "nights": 4,
                "rooms": 1,
                "adults": 2,
                "children": 0,
                "total": 132160.00,
                "paid": 132160.00,
                "payment_status": "paid",
                "status": "confirmed",
                "category": "VIP",
                "source": "Email",
                "inventory_id": corp_inv2_id,
                "rate_per_night": 28000.00
            },
            {
                "guest_name": "Ms. Priya Nair",
                "guest_email": "priya.nair@techcorp.in",
                "guest_phone": "+91-98111-22002",
                "hotel": "Taj Exotica Goa",
                "room": "Deluxe Room",
                "check_in": date(2026, 3, 15),
                "check_out": date(2026, 3, 18),
                "nights": 3,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 42480.00,
                "paid": 42480.00,
                "payment_status": "paid",
                "status": "confirmed",
                "category": "Colleague",
                "source": "Microsite",
                "inventory_id": corp_inv1_id,
                "rate_per_night": 12000.00
            },
            {
                "guest_name": "Mr. Arun Iyer",
                "guest_email": "arun.iyer@techcorp.in",
                "guest_phone": "+91-98111-22003",
                "hotel": "Taj Exotica Goa",
                "room": "Deluxe Room",
                "check_in": date(2026, 3, 15),
                "check_out": date(2026, 3, 18),
                "nights": 3,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 42480.00,
                "paid": 20000.00,
                "payment_status": "partial",
                "status": "confirmed",
                "category": "Colleague",
                "source": "Microsite",
                "inventory_id": corp_inv1_id,
                "rate_per_night": 12000.00
            },
            {
                "guest_name": "Ms. Meera Reddy",
                "guest_email": "meera.reddy@techcorp.in",
                "guest_phone": "+91-98111-22004",
                "hotel": "Taj Exotica Goa",
                "room": "Deluxe Room",
                "check_in": date(2026, 3, 15),
                "check_out": date(2026, 3, 18),
                "nights": 3,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 42480.00,
                "paid": 0.00,
                "payment_status": "pending",
                "status": "pending",
                "category": "Colleague",
                "source": "WhatsApp",
                "inventory_id": corp_inv1_id,
                "rate_per_night": 12000.00
            },
            {
                "guest_name": "Mr. Sanjay Kapoor",
                "guest_email": "sanjay.kapoor@techcorp.in",
                "guest_phone": "+91-98111-22005",
                "hotel": "Taj Exotica Goa",
                "room": "Villa Suite",
                "check_in": date(2026, 3, 14),
                "check_out": date(2026, 3, 18),
                "nights": 4,
                "rooms": 1,
                "adults": 2,
                "children": 1,
                "total": 132160.00,
                "paid": 132160.00,
                "payment_status": "paid",
                "status": "confirmed",
                "category": "VIP",
                "source": "Agent",
                "inventory_id": corp_inv2_id,
                "rate_per_night": 28000.00
            }
        ]

        for i, b in enumerate(corp_bookings_data, 1):
            booking_id = str(uuid.uuid4())
            self._booking_counter += 1
            self._bookings[booking_id] = {
                "id": booking_id,
                "event_id": corp_event_id,
                "booking_reference": f"CORP-TR-{str(i).zfill(4)}",
                "guest_id": None,
                "inventory_id": b["inventory_id"],
                "guest_name": b["guest_name"],
                "guest_email": b["guest_email"],
                "guest_phone": b["guest_phone"],
                "hotel": b["hotel"],
                "room_type": b["room"],
                "check_in_date": b["check_in"],
                "check_out_date": b["check_out"],
                "num_nights": b["nights"],
                "num_rooms": b["rooms"],
                "num_adults": b["adults"],
                "num_children": b["children"],
                "rate_per_night": b["rate_per_night"],
                "total_room_charges": b["total"] / 1.18,
                "taxes": b["total"] - (b["total"] / 1.18),
                "total_amount": b["total"],
                "amount_paid": b["paid"],
                "amount_due": b["total"] - b["paid"],
                "payment_status": b["payment_status"],
                "status": b["status"],
                "booking_source": b["source"],
                "category": b["category"],
                "side": None,
                "dietary_requirements": [],
                "special_requests": None,
                "payment_deadline": date(2026, 3, 1),
                "created_at": datetime.now()
            }

        # ============================================================
        # EVENT 3: Tech Conference Mumbai
        # ============================================================
        tech_event_id = "55555555-5555-5555-5555-555555555551"
        self._events[tech_event_id] = {
            "id": tech_event_id,
            "name": "Tech Conference Mumbai",
            "event_code": "TECH-2026-MUM",
            "event_type": "Conference",
            "start_date": date(2026, 4, 10),
            "end_date": date(2026, 4, 12),
            "destination": "Mumbai, Maharashtra",
            "booking_deadline": date(2026, 4, 1),
            "status": "active",
            "host_name": "DevCon India",
            "host_email": "info@devconindia.com",
            "host_phone": "+91-9922334455",
            "created_at": datetime.now()
        }

        # Tech Conference Inventory
        tech_inv1_id = "88888888-8888-8888-8888-888888888881"
        tech_inv2_id = "88888888-8888-8888-8888-888888888882"
        tech_inv3_id = "88888888-8888-8888-8888-888888888883"

        self._inventory[tech_inv1_id] = {
            "id": tech_inv1_id,
            "event_id": tech_event_id,
            "hotel_name": "JW Marriott Mumbai",
            "room_type": "Deluxe City View",
            "room_type_code": "DLX-CV",
            "total_rooms_blocked": 50,
            "rooms_booked": 35,
            "negotiated_rate": 9500.00,
            "rack_rate": 14000.00,
            "valid_from": date(2026, 4, 9),
            "valid_to": date(2026, 4, 13),
            "release_date": date(2026, 3, 25),
            "inclusions": ["Breakfast Buffet", "Wi-Fi", "Conference Access"],
            "meal_plan": "CP"
        }

        self._inventory[tech_inv2_id] = {
            "id": tech_inv2_id,
            "event_id": tech_event_id,
            "hotel_name": "JW Marriott Mumbai",
            "room_type": "Executive Suite",
            "room_type_code": "EXE-STE",
            "total_rooms_blocked": 15,
            "rooms_booked": 10,
            "negotiated_rate": 18000.00,
            "rack_rate": 26000.00,
            "valid_from": date(2026, 4, 9),
            "valid_to": date(2026, 4, 13),
            "release_date": date(2026, 3, 25),
            "inclusions": ["Breakfast Buffet", "Wi-Fi", "Lounge Access", "Airport Transfer"],
            "meal_plan": "CP"
        }

        self._inventory[tech_inv3_id] = {
            "id": tech_inv3_id,
            "event_id": tech_event_id,
            "hotel_name": "The Oberoi Mumbai",
            "room_type": "Premier Ocean View",
            "room_type_code": "PRM-OV",
            "total_rooms_blocked": 20,
            "rooms_booked": 12,
            "negotiated_rate": 15000.00,
            "rack_rate": 22000.00,
            "valid_from": date(2026, 4, 9),
            "valid_to": date(2026, 4, 13),
            "release_date": date(2026, 3, 28),
            "inclusions": ["Breakfast", "Wi-Fi", "Spa Discount"],
            "meal_plan": "CP"
        }

        # Tech Conference Guests
        tech_guests_data = [
            {"id": str(uuid.uuid4()), "first_name": "Ankit", "last_name": "Sharma", "email": "ankit.sharma@startup.io", "phone": "+91-99001-10001", "category": "VIP", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Divya", "last_name": "Gupta", "email": "divya.gupta@bigtech.com", "phone": "+91-99001-10002", "category": "Colleague", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Rohit", "last_name": "Joshi", "email": "rohit.j@devops.co", "phone": "+91-99001-10003", "category": "Colleague", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Sneha", "last_name": "Patel", "email": "sneha.patel@cloud.in", "phone": "+91-99001-10004", "category": "Colleague", "rsvp_status": "pending"},
            {"id": str(uuid.uuid4()), "first_name": "Vivek", "last_name": "Kumar", "email": "vivek.kumar@ai-labs.com", "phone": "+91-99001-10005", "category": "VIP", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Kavita", "last_name": "Singh", "email": "kavita.singh@data.io", "phone": "+91-99001-10006", "category": "Colleague", "rsvp_status": "maybe"},
            {"id": str(uuid.uuid4()), "first_name": "Prakash", "last_name": "Rao", "email": "prakash.rao@enterprise.in", "phone": "+91-99001-10007", "category": "Colleague", "rsvp_status": "attending"},
            {"id": str(uuid.uuid4()), "first_name": "Anjali", "last_name": "Menon", "email": "anjali.m@fintech.co", "phone": "+91-99001-10008", "category": "VIP", "rsvp_status": "attending"},
        ]

        for g in tech_guests_data:
            g["event_id"] = tech_event_id
            g["salutation"] = "Mr" if g["first_name"] in ["Ankit", "Rohit", "Vivek", "Prakash"] else "Ms"
            g["side"] = None
            g["dietary_requirements"] = ["Vegetarian"] if g["first_name"] in ["Divya", "Sneha", "Anjali"] else ["Vegan"] if g["first_name"] == "Kavita" else []
            g["invitation_status"] = "sent"
            g["created_at"] = datetime.now()
            self._guests[g["id"]] = g

        # Tech Conference Bookings
        tech_bookings_data = [
            {
                "guest_name": "Mr. Ankit Sharma",
                "guest_email": "ankit.sharma@startup.io",
                "guest_phone": "+91-99001-10001",
                "hotel": "JW Marriott Mumbai",
                "room": "Executive Suite",
                "check_in": date(2026, 4, 9),
                "check_out": date(2026, 4, 12),
                "nights": 3,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 63720.00,
                "paid": 63720.00,
                "payment_status": "paid",
                "status": "confirmed",
                "category": "VIP",
                "source": "Microsite",
                "inventory_id": tech_inv2_id,
                "rate_per_night": 18000.00
            },
            {
                "guest_name": "Ms. Divya Gupta",
                "guest_email": "divya.gupta@bigtech.com",
                "guest_phone": "+91-99001-10002",
                "hotel": "JW Marriott Mumbai",
                "room": "Deluxe City View",
                "check_in": date(2026, 4, 10),
                "check_out": date(2026, 4, 12),
                "nights": 2,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 22420.00,
                "paid": 22420.00,
                "payment_status": "paid",
                "status": "confirmed",
                "category": "Colleague",
                "source": "Email",
                "inventory_id": tech_inv1_id,
                "rate_per_night": 9500.00
            },
            {
                "guest_name": "Mr. Rohit Joshi",
                "guest_email": "rohit.j@devops.co",
                "guest_phone": "+91-99001-10003",
                "hotel": "JW Marriott Mumbai",
                "room": "Deluxe City View",
                "check_in": date(2026, 4, 9),
                "check_out": date(2026, 4, 12),
                "nights": 3,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 33630.00,
                "paid": 15000.00,
                "payment_status": "partial",
                "status": "confirmed",
                "category": "Colleague",
                "source": "Microsite",
                "inventory_id": tech_inv1_id,
                "rate_per_night": 9500.00
            },
            {
                "guest_name": "Ms. Sneha Patel",
                "guest_email": "sneha.patel@cloud.in",
                "guest_phone": "+91-99001-10004",
                "hotel": "The Oberoi Mumbai",
                "room": "Premier Ocean View",
                "check_in": date(2026, 4, 10),
                "check_out": date(2026, 4, 12),
                "nights": 2,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 35400.00,
                "paid": 0.00,
                "payment_status": "pending",
                "status": "pending",
                "category": "Colleague",
                "source": "WhatsApp",
                "inventory_id": tech_inv3_id,
                "rate_per_night": 15000.00
            },
            {
                "guest_name": "Mr. Vivek Kumar",
                "guest_email": "vivek.kumar@ai-labs.com",
                "guest_phone": "+91-99001-10005",
                "hotel": "JW Marriott Mumbai",
                "room": "Executive Suite",
                "check_in": date(2026, 4, 9),
                "check_out": date(2026, 4, 12),
                "nights": 3,
                "rooms": 1,
                "adults": 2,
                "children": 0,
                "total": 63720.00,
                "paid": 63720.00,
                "payment_status": "paid",
                "status": "confirmed",
                "category": "VIP",
                "source": "Agent",
                "inventory_id": tech_inv2_id,
                "rate_per_night": 18000.00
            },
            {
                "guest_name": "Ms. Kavita Singh",
                "guest_email": "kavita.singh@data.io",
                "guest_phone": "+91-99001-10006",
                "hotel": "JW Marriott Mumbai",
                "room": "Deluxe City View",
                "check_in": date(2026, 4, 10),
                "check_out": date(2026, 4, 12),
                "nights": 2,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 22420.00,
                "paid": 0.00,
                "payment_status": "pending",
                "status": "waitlisted",
                "category": "Colleague",
                "source": "Microsite",
                "inventory_id": tech_inv1_id,
                "rate_per_night": 9500.00
            },
            {
                "guest_name": "Mr. Prakash Rao",
                "guest_email": "prakash.rao@enterprise.in",
                "guest_phone": "+91-99001-10007",
                "hotel": "The Oberoi Mumbai",
                "room": "Premier Ocean View",
                "check_in": date(2026, 4, 9),
                "check_out": date(2026, 4, 12),
                "nights": 3,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 53100.00,
                "paid": 53100.00,
                "payment_status": "paid",
                "status": "confirmed",
                "category": "Colleague",
                "source": "Email",
                "inventory_id": tech_inv3_id,
                "rate_per_night": 15000.00
            },
            {
                "guest_name": "Ms. Anjali Menon",
                "guest_email": "anjali.m@fintech.co",
                "guest_phone": "+91-99001-10008",
                "hotel": "JW Marriott Mumbai",
                "room": "Executive Suite",
                "check_in": date(2026, 4, 9),
                "check_out": date(2026, 4, 12),
                "nights": 3,
                "rooms": 1,
                "adults": 1,
                "children": 0,
                "total": 63720.00,
                "paid": 30000.00,
                "payment_status": "partial",
                "status": "confirmed",
                "category": "VIP",
                "source": "Microsite",
                "inventory_id": tech_inv2_id,
                "rate_per_night": 18000.00
            }
        ]

        for i, b in enumerate(tech_bookings_data, 1):
            booking_id = str(uuid.uuid4())
            self._booking_counter += 1
            self._bookings[booking_id] = {
                "id": booking_id,
                "event_id": tech_event_id,
                "booking_reference": f"TECH-MUM-{str(i).zfill(4)}",
                "guest_id": None,
                "inventory_id": b["inventory_id"],
                "guest_name": b["guest_name"],
                "guest_email": b["guest_email"],
                "guest_phone": b["guest_phone"],
                "hotel": b["hotel"],
                "room_type": b["room"],
                "check_in_date": b["check_in"],
                "check_out_date": b["check_out"],
                "num_nights": b["nights"],
                "num_rooms": b["rooms"],
                "num_adults": b["adults"],
                "num_children": b["children"],
                "rate_per_night": b["rate_per_night"],
                "total_room_charges": b["total"] / 1.18,
                "taxes": b["total"] - (b["total"] / 1.18),
                "total_amount": b["total"],
                "amount_paid": b["paid"],
                "amount_due": b["total"] - b["paid"],
                "payment_status": b["payment_status"],
                "status": b["status"],
                "booking_source": b["source"],
                "category": b["category"],
                "side": None,
                "dietary_requirements": [],
                "special_requests": None,
                "payment_deadline": date(2026, 4, 1),
                "created_at": datetime.now()
            }

    # ============================================================
    # EVENT OPERATIONS
    # ============================================================

    def get_events(self) -> List[dict]:
        return list(self._events.values())

    def get_event(self, event_id: str) -> Optional[dict]:
        return self._events.get(event_id)

    def create_event(self, event_data: dict) -> dict:
        event_id = str(uuid.uuid4())
        event_data["id"] = event_id
        event_data["created_at"] = datetime.now()
        self._events[event_id] = event_data
        return event_data

    # ============================================================
    # GUEST OPERATIONS
    # ============================================================

    def get_guests(self, event_id: str) -> List[dict]:
        return [g for g in self._guests.values() if g["event_id"] == event_id]

    def get_guest(self, guest_id: str) -> Optional[dict]:
        return self._guests.get(guest_id)

    def create_guest(self, guest_data: dict) -> dict:
        guest_id = str(uuid.uuid4())
        guest_data["id"] = guest_id
        guest_data["created_at"] = datetime.now()
        self._guests[guest_id] = guest_data
        return guest_data

    def update_guest(self, guest_id: str, update_data: dict) -> Optional[dict]:
        if guest_id in self._guests:
            self._guests[guest_id].update(update_data)
            return self._guests[guest_id]
        return None

    # ============================================================
    # INVENTORY OPERATIONS
    # ============================================================

    def get_inventory(self, event_id: str) -> List[dict]:
        return [i for i in self._inventory.values() if i["event_id"] == event_id]

    def get_inventory_item(self, inventory_id: str) -> Optional[dict]:
        return self._inventory.get(inventory_id)

    def create_inventory(self, inventory_data: dict) -> dict:
        inventory_id = str(uuid.uuid4())
        inventory_data["id"] = inventory_id
        inventory_data["rooms_booked"] = 0
        self._inventory[inventory_id] = inventory_data
        return inventory_data

    def update_inventory_rooms(self, inventory_id: str, rooms_change: int) -> Optional[dict]:
        if inventory_id in self._inventory:
            self._inventory[inventory_id]["rooms_booked"] += rooms_change
            return self._inventory[inventory_id]
        return None

    # ============================================================
    # BOOKING OPERATIONS
    # ============================================================

    def get_bookings(self, event_id: str, filters: Optional[dict] = None) -> List[dict]:
        bookings = [b for b in self._bookings.values() if b["event_id"] == event_id]

        if filters:
            if filters.get("status") and filters["status"] != "all":
                bookings = [b for b in bookings if b["status"] == filters["status"]]
            if filters.get("payment_status") and filters["payment_status"] != "all":
                bookings = [b for b in bookings if b["payment_status"] == filters["payment_status"]]
            if filters.get("search"):
                search = filters["search"].lower()
                bookings = [b for b in bookings if
                            search in b["guest_name"].lower() or
                            search in b["booking_reference"].lower() or
                            search in (b.get("guest_email") or "").lower()]

        return bookings

    def get_booking(self, booking_id: str) -> Optional[dict]:
        return self._bookings.get(booking_id)

    def get_booking_by_reference(self, reference: str) -> Optional[dict]:
        for b in self._bookings.values():
            if b["booking_reference"] == reference:
                return b
        return None

    def create_booking(self, booking_data: dict, performed_by: str = None, ip_address: str = None) -> dict:
        booking_id = str(uuid.uuid4())
        self._booking_counter += 1
        event = self._events.get(booking_data["event_id"])
        event_code = event["event_code"].replace("-2026-", "-") if event else "BKG"

        booking_data["id"] = booking_id
        booking_data["booking_reference"] = f"{event_code}-{str(self._booking_counter).zfill(4)}"
        booking_data["created_at"] = datetime.now()

        # Calculate amounts
        nights = (booking_data["check_out_date"] - booking_data["check_in_date"]).days
        booking_data["num_nights"] = nights
        room_charges = booking_data["rate_per_night"] * nights * booking_data.get("num_rooms", 1)
        taxes = room_charges * 0.18
        booking_data["total_room_charges"] = room_charges
        booking_data["taxes"] = taxes
        booking_data["total_amount"] = room_charges + taxes
        booking_data["amount_paid"] = 0
        booking_data["amount_due"] = booking_data["total_amount"]
        booking_data["payment_status"] = "pending"
        booking_data["status"] = "pending"
        booking_data["payment_deadline"] = date.today() + timedelta(days=7)

        self._bookings[booking_id] = booking_data

        # Update inventory
        if booking_data.get("inventory_id"):
            self.update_inventory_rooms(booking_data["inventory_id"], booking_data.get("num_rooms", 1))

        # Log audit entry
        self.log_audit(
            entity_type="booking",
            entity_id=booking_id,
            action="CREATE",
            new_value=booking_data.copy(),
            performed_by=performed_by,
            ip_address=ip_address,
            event_id=booking_data.get("event_id"),
            booking_id=booking_id,
            notes=f"Booking created: {booking_data['booking_reference']}"
        )

        return booking_data

    def update_booking(self, booking_id: str, update_data: dict, performed_by: str = None, ip_address: str = None) -> Optional[dict]:
        if booking_id in self._bookings:
            booking = self._bookings[booking_id]
            old_booking = booking.copy()
            changes = {}

            # Handle payment updates
            if "amount_paid" in update_data:
                old_paid = booking["amount_paid"]
                booking["amount_paid"] = update_data["amount_paid"]
                booking["amount_due"] = booking["total_amount"] - booking["amount_paid"]
                changes["amount_paid"] = {"old": old_paid, "new": booking["amount_paid"]}

                # Auto-update payment status
                old_payment_status = booking["payment_status"]
                if booking["amount_paid"] >= booking["total_amount"]:
                    booking["payment_status"] = "paid"
                elif booking["amount_paid"] > 0:
                    booking["payment_status"] = "partial"
                else:
                    booking["payment_status"] = "pending"
                if old_payment_status != booking["payment_status"]:
                    changes["payment_status"] = {"old": old_payment_status, "new": booking["payment_status"]}

            # Handle status updates
            if "status" in update_data:
                old_status = booking["status"]
                new_status = update_data["status"]
                booking["status"] = new_status
                changes["status"] = {"old": old_status, "new": new_status}

                # Release inventory if cancelled
                if new_status == "cancelled" and old_status in ["pending", "confirmed"]:
                    self.update_inventory_rooms(booking["inventory_id"], -booking.get("num_rooms", 1))

            # Handle other field updates
            for k, v in update_data.items():
                if k not in ["amount_paid", "status"]:
                    if booking.get(k) != v:
                        changes[k] = {"old": booking.get(k), "new": v}
                    booking[k] = v

            # Log audit entry if there were changes
            if changes:
                action = "STATUS_CHANGE" if "status" in changes else "UPDATE"
                self.log_audit(
                    entity_type="booking",
                    entity_id=booking_id,
                    action=action,
                    changes=changes,
                    old_value=old_booking,
                    new_value=booking.copy(),
                    performed_by=performed_by,
                    ip_address=ip_address,
                    event_id=booking.get("event_id"),
                    booking_id=booking_id,
                    notes=f"Booking updated: {booking['booking_reference']}"
                )

            return booking
        return None

    def delete_booking(self, booking_id: str, performed_by: str = None, ip_address: str = None) -> bool:
        if booking_id in self._bookings:
            booking = self._bookings[booking_id]
            booking_copy = booking.copy()

            if booking["status"] in ["pending", "confirmed"]:
                self.update_inventory_rooms(booking["inventory_id"], -booking.get("num_rooms", 1))

            # Log audit entry before deletion
            self.log_audit(
                entity_type="booking",
                entity_id=booking_id,
                action="DELETE",
                old_value=booking_copy,
                performed_by=performed_by,
                ip_address=ip_address,
                event_id=booking.get("event_id"),
                booking_id=booking_id,
                notes=f"Booking deleted: {booking['booking_reference']}"
            )

            del self._bookings[booking_id]
            return True
        return False

    # ============================================================
    # PAYMENT OPERATIONS
    # ============================================================

    def create_payment(self, payment_data: dict, performed_by: str = None, ip_address: str = None) -> dict:
        payment_id = str(uuid.uuid4())
        payment_data["id"] = payment_id
        payment_data["status"] = "completed"
        payment_data["created_at"] = datetime.now()
        self._payments[payment_id] = payment_data

        # Update booking
        booking = self._bookings.get(payment_data["booking_id"])
        if booking:
            new_paid = booking["amount_paid"] + payment_data["amount"]
            self.update_booking(payment_data["booking_id"], {"amount_paid": new_paid}, performed_by, ip_address)

        # Log audit entry for payment
        self.log_audit(
            entity_type="payment",
            entity_id=payment_id,
            action="PAYMENT",
            new_value=payment_data.copy(),
            performed_by=performed_by,
            ip_address=ip_address,
            event_id=booking.get("event_id") if booking else None,
            booking_id=payment_data["booking_id"],
            notes=f"Payment recorded: {payment_data['amount']} via {payment_data.get('payment_method', 'unknown')}"
        )

        return payment_data

    def get_payments(self, booking_id: str) -> List[dict]:
        return [p for p in self._payments.values() if p["booking_id"] == booking_id]

    # ============================================================
    # DASHBOARD OPERATIONS
    # ============================================================

    def get_dashboard_stats(self, event_id: str) -> dict:
        guests = self.get_guests(event_id)
        bookings = self.get_bookings(event_id)
        inventory = self.get_inventory(event_id)

        # Guest stats
        total_guests = len(guests) if guests else 150  # Default for demo
        attending = len([g for g in guests if g.get("rsvp_status") == "attending"]) if guests else 89
        declined = len([g for g in guests if g.get("rsvp_status") == "not_attending"]) if guests else 23
        pending_guests = total_guests - attending - declined

        # Booking stats
        total_bookings = len(bookings)
        confirmed_bookings = len([b for b in bookings if b["status"] == "confirmed"])
        pending_bookings = len([b for b in bookings if b["status"] == "pending"])
        cancelled_bookings = len([b for b in bookings if b["status"] == "cancelled"])

        # Room stats
        total_rooms = sum(i["total_rooms_blocked"] for i in inventory)
        booked_rooms = sum(i["rooms_booked"] for i in inventory)
        available_rooms = total_rooms - booked_rooms
        occupancy_rate = round((booked_rooms / total_rooms) * 100, 1) if total_rooms > 0 else 0

        # Financial stats
        total_value = sum(b["total_amount"] for b in bookings if b["status"] != "cancelled")
        collected = sum(b["amount_paid"] for b in bookings)
        pending_amount = total_value - collected
        collection_rate = round((collected / total_value) * 100, 1) if total_value > 0 else 0

        return {
            "totalGuests": total_guests,
            "attending": attending,
            "declined": declined,
            "pending": pending_guests,
            "totalBookings": total_bookings,
            "confirmedBookings": confirmed_bookings,
            "pendingBookings": pending_bookings,
            "cancelledBookings": cancelled_bookings,
            "totalRooms": total_rooms,
            "bookedRooms": booked_rooms,
            "availableRooms": available_rooms,
            "occupancyRate": occupancy_rate,
            "totalValue": total_value,
            "collected": collected,
            "pendingAmount": pending_amount,
            "collectionRate": collection_rate
        }

    # ============================================================
    # AUDIT LOG OPERATIONS
    # ============================================================

    def log_audit(
        self,
        entity_type: str,
        entity_id: str,
        action: str,
        changes: Optional[dict] = None,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        performed_by: Optional[str] = None,
        ip_address: Optional[str] = None,
        event_id: Optional[str] = None,
        booking_id: Optional[str] = None,
        notes: Optional[str] = None
    ) -> dict:
        """
        Log an audit entry for any entity change.

        Args:
            entity_type: Type of entity (booking, guest, inventory, payment, event)
            entity_id: UUID of the entity
            action: Type of action (CREATE, UPDATE, DELETE, STATUS_CHANGE, PAYMENT, CANCELLATION)
            changes: Dict of field changes {field: {old: x, new: y}}
            old_value: Complete old state (for complex changes)
            new_value: Complete new state (for complex changes)
            performed_by: User who made the change
            ip_address: IP address of the request
            event_id: Related event ID
            booking_id: Related booking ID
            notes: Additional notes
        """
        audit_entry = {
            "id": str(uuid.uuid4()),
            "entity_type": entity_type,
            "entity_id": entity_id,
            "action": action,
            "changes": changes or {},
            "old_value": old_value,
            "new_value": new_value,
            "performed_by": performed_by or "system",
            "ip_address": ip_address,
            "event_id": event_id,
            "booking_id": booking_id,
            "notes": notes,
            "timestamp": datetime.now()
        }
        self._audit_logs.append(audit_entry)
        return audit_entry

    def get_audit_logs(
        self,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        event_id: Optional[str] = None,
        booking_id: Optional[str] = None,
        action: Optional[str] = None,
        performed_by: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[dict]:
        """
        Retrieve audit logs with filtering options.
        """
        logs = self._audit_logs.copy()

        # Apply filters
        if entity_type:
            logs = [l for l in logs if l["entity_type"] == entity_type]
        if entity_id:
            logs = [l for l in logs if l["entity_id"] == entity_id]
        if event_id:
            logs = [l for l in logs if l["event_id"] == event_id]
        if booking_id:
            logs = [l for l in logs if l["booking_id"] == booking_id]
        if action:
            logs = [l for l in logs if l["action"] == action]
        if performed_by:
            logs = [l for l in logs if l["performed_by"] == performed_by]
        if start_date:
            logs = [l for l in logs if l["timestamp"] >= start_date]
        if end_date:
            logs = [l for l in logs if l["timestamp"] <= end_date]

        # Sort by timestamp descending (most recent first)
        logs.sort(key=lambda x: x["timestamp"], reverse=True)

        # Apply pagination
        return logs[offset:offset + limit]

    def get_entity_history(self, entity_type: str, entity_id: str) -> List[dict]:
        """
        Get complete change history for a specific entity.
        """
        return self.get_audit_logs(entity_type=entity_type, entity_id=entity_id)

    def get_booking_history(self, booking_id: str) -> List[dict]:
        """
        Get all audit logs related to a booking (including payments).
        """
        logs = [l for l in self._audit_logs if
                l["booking_id"] == booking_id or
                (l["entity_type"] == "booking" and l["entity_id"] == booking_id)]
        logs.sort(key=lambda x: x["timestamp"], reverse=True)
        return logs


# Global database instance
db = InMemoryDB()
