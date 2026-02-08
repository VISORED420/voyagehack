/**
 * API Service for TBO GroupBook Dashboard
 * Connects frontend to FastAPI backend
 */

// API URL configuration
// Priority: VITE_API_URL env var > Production Railway URL > localhost
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (window.location.hostname !== 'localhost'
    ? 'https://tbogroup-production.up.railway.app/api'
    : 'http://localhost:8000/api');

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
    throw new Error(error.detail || `HTTP error! status: ${response.status}`);
  }

  // Handle empty responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// ============================================================
// EVENTS API
// ============================================================

export const eventsAPI = {
  getAll: () => fetchAPI('/events'),

  getById: (eventId) => fetchAPI(`/events/${eventId}`),

  create: (eventData) => fetchAPI('/events', {
    method: 'POST',
    body: JSON.stringify(eventData),
  }),

  update: (eventId, eventData) => fetchAPI(`/events/${eventId}`, {
    method: 'PUT',
    body: JSON.stringify(eventData),
  }),

  delete: (eventId) => fetchAPI(`/events/${eventId}`, {
    method: 'DELETE',
  }),
};

// ============================================================
// BOOKINGS API
// ============================================================

export const bookingsAPI = {
  getByEvent: (eventId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.paymentStatus) params.append('payment_status', filters.paymentStatus);
    if (filters.search) params.append('search', filters.search);

    const queryString = params.toString();
    return fetchAPI(`/bookings/event/${eventId}${queryString ? `?${queryString}` : ''}`);
  },

  getById: (bookingId) => fetchAPI(`/bookings/${bookingId}`),

  getByReference: (reference) => fetchAPI(`/bookings/reference/${reference}`),

  create: (bookingData) => fetchAPI('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  }),

  createBooking: (bookingData) => fetchAPI('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  }),

  update: (bookingId, updateData) => fetchAPI(`/bookings/${bookingId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  }),

  delete: (bookingId) => fetchAPI(`/bookings/${bookingId}`, {
    method: 'DELETE',
  }),

  confirm: (bookingId) => fetchAPI(`/bookings/${bookingId}/confirm`, {
    method: 'POST',
  }),

  cancel: (bookingId, reason = 'Cancelled by user') => fetchAPI(`/bookings/${bookingId}/cancel?reason=${encodeURIComponent(reason)}`, {
    method: 'POST',
  }),

  bulkAction: (bookingIds, action) => fetchAPI('/bookings/bulk-action', {
    method: 'POST',
    body: JSON.stringify({ booking_ids: bookingIds, action }),
  }),
};

// ============================================================
// GUESTS API
// ============================================================

export const guestsAPI = {
  getByEvent: (eventId) => fetchAPI(`/guests/event/${eventId}`),

  getById: (guestId) => fetchAPI(`/guests/${guestId}`),

  create: (guestData) => fetchAPI('/guests', {
    method: 'POST',
    body: JSON.stringify(guestData),
  }),

  update: (guestId, updateData) => fetchAPI(`/guests/${guestId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  }),

  delete: (guestId) => fetchAPI(`/guests/${guestId}`, {
    method: 'DELETE',
  }),

  updateRSVP: (guestId, rsvpStatus) => fetchAPI(`/guests/${guestId}/rsvp?rsvp_status=${rsvpStatus}`, {
    method: 'POST',
  }),

  importFromFile: async (eventId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/guests/event/${eventId}/import`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
      throw new Error(error.detail);
    }

    return response.json();
  },

  sendInvitations: (eventId, guestIds = null) => fetchAPI(`/guests/event/${eventId}/send-invitations`, {
    method: 'POST',
    body: JSON.stringify(guestIds),
  }),
};

// ============================================================
// INVENTORY API
// ============================================================

export const inventoryAPI = {
  getByEvent: (eventId) => fetchAPI(`/inventory/event/${eventId}`),

  getEventInventory: (eventId) => fetchAPI(`/inventory/event/${eventId}`),

  getById: (inventoryId) => fetchAPI(`/inventory/${inventoryId}`),

  create: (inventoryData) => fetchAPI('/inventory', {
    method: 'POST',
    body: JSON.stringify(inventoryData),
  }),

  update: (inventoryId, updateData) => fetchAPI(`/inventory/${inventoryId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  }),

  delete: (inventoryId) => fetchAPI(`/inventory/${inventoryId}`, {
    method: 'DELETE',
  }),

  getSummary: (eventId) => fetchAPI(`/inventory/event/${eventId}/summary`),
};

// ============================================================
// PAYMENTS API
// ============================================================

export const paymentsAPI = {
  getByBooking: (bookingId) => fetchAPI(`/payments/booking/${bookingId}`),

  record: (paymentData) => fetchAPI('/payments', {
    method: 'POST',
    body: JSON.stringify(paymentData),
  }),

  getSummary: (eventId) => fetchAPI(`/payments/event/${eventId}/summary`, {
    method: 'POST',
  }),

  processRefund: (bookingId, amount, reason = 'Refund requested') =>
    fetchAPI(`/payments/booking/${bookingId}/refund?amount=${amount}&reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
    }),
};

// ============================================================
// TBO HOTELS API
// ============================================================

export const tboAPI = {
  // Get TBO API health status
  getHealth: () => fetchAPI('/tbo/health'),

  // Get current session status
  getSession: () => fetchAPI('/tbo/session'),

  // Get list of Indian cities with TBO codes
  getCities: () => fetchAPI('/tbo/cities'),

  // Get available hotel codes (limit parameter)
  getHotelCodes: (limit = 100) => fetchAPI(`/tbo/hotels/codes?limit=${limit}`),

  // Get hotels by city code
  getHotelsByCity: (cityCode, limit = 20) => fetchAPI(`/tbo/hotels/by-city/${cityCode}?limit=${limit}`),

  // Get hotel details by code
  getHotelDetails: (hotelCode) => fetchAPI(`/tbo/hotels/${hotelCode}/details`),

  // Search hotels by hotel codes
  searchHotels: (searchData) => fetchAPI('/tbo/hotels/search', {
    method: 'POST',
    body: JSON.stringify(searchData),
  }),

  // Check real-time availability and pricing
  checkAvailability: (availabilityData) => fetchAPI('/tbo/hotels/availability', {
    method: 'POST',
    body: JSON.stringify(availabilityData),
  }),

  // Create TBO booking
  createBooking: (bookingData) => fetchAPI('/tbo/hotels/book', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  }),

  // Get booking details
  getBooking: (bookingId) => fetchAPI(`/tbo/bookings/${bookingId}`),

  // Cancel booking
  cancelBooking: (bookingId, remarks = 'Cancelled by user') => fetchAPI('/tbo/bookings/cancel', {
    method: 'POST',
    body: JSON.stringify({ booking_id: bookingId, remarks }),
  }),
};

// ============================================================
// DASHBOARD API
// ============================================================

export const dashboardAPI = {
  getStats: (eventId) => fetchAPI(`/dashboard/event/${eventId}/stats`),

  getFullDashboard: (eventId) => fetchAPI(`/dashboard/event/${eventId}`),

  getAlerts: (eventId) => fetchAPI(`/dashboard/event/${eventId}/alerts`),

  exportRoomingList: async (eventId, format = 'excel') => {
    const response = await fetch(`${API_BASE_URL}/dashboard/event/${eventId}/export/rooming-list?format=${format}`);

    if (!response.ok) {
      throw new Error('Failed to export rooming list');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rooming_list.${format === 'excel' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default {
  events: eventsAPI,
  bookings: bookingsAPI,
  guests: guestsAPI,
  inventory: inventoryAPI,
  payments: paymentsAPI,
  dashboard: dashboardAPI,
  tbo: tboAPI,
};
