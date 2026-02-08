# TBO GroupBook - Group Booking Dashboard

A comprehensive group booking management system for events like weddings, corporate retreats, and conferences. Features an admin dashboard and public-facing microsite for guest bookings.

## Features

- **Dashboard**: Manage bookings, guests, inventory, and payments
- **Microsite**: Public booking page for guests with separate URL routing
- **International Phone Validation**: Support for 13 countries with flag icons
- **Email Validation**: Real-time email verification via API
- **Dark Mode**: Full dark mode support throughout the application

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: FastAPI (Python)
- **Validation**: libphonenumber-js, Rapid Email Verifier API

## Prerequisites

- Node.js (v18 or higher)
- Python (v3.9 or higher)
- pip (Python package manager)

## Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/VISORED420/voyagehack.git
cd voyagehack/group-booking-dashboard
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install
```

## Running the Application

### Start Backend Server

```bash
# From the backend directory
cd backend
python run.py
```

The backend API will be available at:
- API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

### Start Frontend Server

```bash
# From the frontend directory (in a new terminal)
cd frontend
npm run dev
```

The frontend will be available at:
- Dashboard: http://localhost:5173 (or next available port)

## Project Structure

```
group-booking-dashboard/
├── backend/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── models/        # Data models
│   │   └── services/      # Business logic
│   ├── requirements.txt   # Python dependencies
│   └── run.py            # Server entry point
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Main app with routing
│   │   ├── GroupBookingDashboard.jsx  # Admin dashboard
│   │   ├── EventMicrosite.jsx         # Public booking page
│   │   └── api.js                     # API client
│   ├── package.json      # Node dependencies
│   └── vite.config.js    # Vite configuration
│
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/{id}` | Get event details |
| GET | `/api/bookings` | List all bookings |
| POST | `/api/bookings` | Create new booking |
| PUT | `/api/bookings/{id}` | Update booking |
| DELETE | `/api/bookings/{id}` | Delete booking |
| GET | `/api/inventory` | Get room inventory |
| GET | `/api/validation/email` | Validate email address |

## URLs

- **Dashboard**: `http://localhost:5173/`
- **Microsite**: `http://localhost:5173/event/{event-name-slug}`

Example: For "Sharma-Gupta Wedding", the microsite URL would be:
`http://localhost:5173/event/sharma-gupta-wedding`

## Environment Variables

### Backend (.env)
```
REDIS_URL=redis://localhost:6379  # Optional, for caching
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## License

MIT
