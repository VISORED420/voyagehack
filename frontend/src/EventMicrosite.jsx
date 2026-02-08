import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, MapPin, Hotel, Users, Clock, Mail, Phone, User,
  Home, Bed, DollarSign, Utensils, ArrowLeft, Check, X, ChevronDown
} from 'lucide-react';
import { isValidPhoneNumber } from 'libphonenumber-js';

// API Base URL - works in both development and production
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (window.location.hostname !== 'localhost'
    ? 'https://tbogroup-production.up.railway.app/api'
    : 'http://localhost:8000/api');

const COUNTRIES = [
  { code: 'IN', name: 'India', dial: '+91', flag: 'in' },
  { code: 'US', name: 'USA', dial: '+1', flag: 'us' },
  { code: 'GB', name: 'UK', dial: '+44', flag: 'gb' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: 'ca' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: 'au' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: 'ae' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: 'sg' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: 'my' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: 'th' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: 'jp' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: 'de' },
  { code: 'FR', name: 'France', dial: '+33', flag: 'fr' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: 'es' }
];

function CountrySelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedCountry = COUNTRIES.find(c => c.code === value) || COUNTRIES[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg flex items-center justify-between hover:border-blue-400 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className={`fi fi-${selectedCountry.flag} text-lg`}></span>
          <span className="text-gray-700 font-medium">{selectedCountry.dial}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {COUNTRIES.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => {
                onChange(country.code);
                setIsOpen(false);
              }}
              className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-blue-50 transition-colors ${
                selectedCountry.code === country.code ? 'bg-blue-100' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className={`fi fi-${country.flag} text-lg`}></span>
                <span className="text-gray-700 font-medium">{country.name}</span>
              </div>
              <span className="text-gray-600 text-sm">{country.dial}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EventMicrosite({ eventId, onBack }) {
  const [event, setEvent] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    country_code: 'IN',
    room_type: '',
    check_in_date: '',
    check_out_date: '',
    adults: 1,
    children: 0,
    special_requests: '',
    dietary_requirements: '',
    total_amount: 0,
    booking_source: 'Microsite'
  });

  const [validationErrors, setValidationErrors] = useState({});

  const API_BASE = API_BASE_URL;

  useEffect(() => {
    fetchEventDetails();
    fetchInventory();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const response = await fetch(`${API_BASE}/events/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEvent(data);
      }
    } catch (error) {
      console.error('Error fetching event:', error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch(`${API_BASE}/inventory?event_id=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setInventory(data);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateEmailWithAPI = async (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    try {
      const response = await fetch(`${API_BASE}/validation/email?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!data.valid) {
        if (data.did_you_mean) {
          return { valid: false, error: `Email may be invalid. Did you mean ${data.did_you_mean}?` };
        }
        if (data.status === 'INVALID_DOMAIN') {
          return { valid: false, error: 'Email domain does not exist' };
        }
        if (data.status === 'INVALID_MAILBOX') {
          return { valid: false, error: 'Email address does not exist' };
        }
        if (data.is_disposable) {
          return { valid: false, error: 'Disposable email addresses are not allowed' };
        }
        return { valid: false, error: 'Email validation failed' };
      }

      return { valid: true };
    } catch (error) {
      console.error('Email validation error:', error);
      return { valid: true };
    }
  };

  const validatePhone = (phone, country) => {
    if (!phone) return false;
    const cleanPhone = phone.replace(/-/g, '').trim();
    if (cleanPhone.includes('-') || parseFloat(cleanPhone) < 0) {
      return false;
    }
    try {
      return isValidPhoneNumber(cleanPhone, country);
    } catch (error) {
      return false;
    }
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;
    value = value.replace(/^-+/, '');
    value = value.replace(/(?!^\+)\-/g, '');
    setFormData(prev => ({ ...prev, guest_phone: value }));
  };

  const validateForm = async () => {
    const errors = {};

    if (!formData.guest_name.trim()) {
      errors.guest_name = 'Name is required';
    }

    if (!formData.guest_email.trim()) {
      errors.guest_email = 'Email is required';
    } else {
      const emailValidation = await validateEmailWithAPI(formData.guest_email);
      if (!emailValidation.valid) {
        errors.guest_email = emailValidation.error;
      }
    }

    if (!formData.guest_phone.trim()) {
      errors.guest_phone = 'Phone number is required';
    } else if (!validatePhone(formData.guest_phone, formData.country_code)) {
      errors.guest_phone = 'Invalid phone number for selected country';
    }

    if (!formData.room_type) {
      errors.room_type = 'Please select a room type';
    }

    if (!formData.check_in_date) {
      errors.check_in_date = 'Check-in date is required';
    }

    if (!formData.check_out_date) {
      errors.check_out_date = 'Check-out date is required';
    }

    if (formData.check_in_date && formData.check_out_date) {
      const checkIn = new Date(formData.check_in_date);
      const checkOut = new Date(formData.check_out_date);
      if (checkOut <= checkIn) {
        errors.check_out_date = 'Check-out must be after check-in';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const isValid = await validateForm();
    if (!isValid) return;

    setSubmitting(true);

    try {
      const bookingData = {
        event_id: eventId,
        guest_name: formData.guest_name,
        guest_email: formData.guest_email,
        guest_phone: formData.guest_phone,
        room_type: formData.room_type,
        check_in_date: formData.check_in_date,
        check_out_date: formData.check_out_date,
        adults: formData.adults,
        children: formData.children,
        special_requests: formData.special_requests,
        dietary_requirements: formData.dietary_requirements,
        total_amount: formData.total_amount,
        paid_amount: 0,
        booking_source: 'Microsite',
        booking_status: 'pending'
      };

      const response = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
      });

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setFormData({
            guest_name: '',
            guest_email: '',
            guest_phone: '',
            country_code: 'IN',
            room_type: '',
            check_in_date: '',
            check_out_date: '',
            adults: 1,
            children: 0,
            special_requests: '',
            dietary_requirements: '',
            total_amount: 0,
            booking_source: 'Microsite'
          });
        }, 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create booking');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Booking error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoomSelect = (room) => {
    setFormData(prev => ({
      ...prev,
      room_type: room.room_type,
      total_amount: room.rate_per_night
    }));
    setValidationErrors(prev => ({ ...prev, room_type: null }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-6">The event you're looking for doesn't exist.</p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 overflow-y-auto">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </button>
            )}
            <div className="ml-auto">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                Public Booking Page
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12 pb-20">
        {/* Event Hero */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 md:p-12 text-white mb-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{event.event_name}</h1>
          <p className="text-xl text-blue-100 mb-6">{event.event_type}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-blue-100">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              <span>{event.event_dates || 'TBA'}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              <span>{event.destination}</span>
            </div>
            <div className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              <span>{event.expected_guests} Expected Guests</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Room Selection */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <Hotel className="w-6 h-6 mr-2 text-blue-600" />
              Available Rooms
            </h2>

            {inventory.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Hotel className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No rooms available at the moment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inventory.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => handleRoomSelect(room)}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                      formData.room_type === room.room_type
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-800">{room.room_type}</h3>
                        <p className="text-sm text-gray-600">{room.hotel_name}</p>
                      </div>
                      {formData.room_type === room.room_type && (
                        <Check className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <Bed className="w-4 h-4 mr-1" />
                          {room.available_rooms} available
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          ${room.rate_per_night}
                        </div>
                        <div className="text-xs text-gray-500">per night</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {validationErrors.room_type && (
              <p className="text-red-500 text-sm mt-2">{validationErrors.room_type}</p>
            )}
          </div>

          {/* Booking Form */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <User className="w-6 h-6 mr-2 text-blue-600" />
              Your Details
            </h2>

            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center text-green-800">
                <Check className="w-5 h-5 mr-2" />
                <span>Booking submitted successfully! We'll contact you soon.</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-800">
                <X className="w-5 h-5 mr-2" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.guest_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_name: e.target.value }))}
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.guest_name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {validationErrors.guest_name && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.guest_name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.guest_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, guest_email: e.target.value }))}
                    className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.guest_email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="john@example.com"
                  />
                </div>
                {validationErrors.guest_email && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.guest_email}</p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <CountrySelector
                    value={formData.country_code}
                    onChange={(code) => setFormData(prev => ({ ...prev, country_code: code }))}
                  />
                  <div className="col-span-2 relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.guest_phone}
                      onChange={handlePhoneChange}
                      className={`w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        validationErrors.guest_phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="1234567890"
                    />
                  </div>
                </div>
                {validationErrors.guest_phone && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.guest_phone}</p>
                )}
              </div>

              {/* Check-in / Check-out */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in *
                  </label>
                  <input
                    type="date"
                    value={formData.check_in_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_in_date: e.target.value }))}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.check_in_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.check_in_date && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.check_in_date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out *
                  </label>
                  <input
                    type="date"
                    value={formData.check_out_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, check_out_date: e.target.value }))}
                    className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      validationErrors.check_out_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {validationErrors.check_out_date && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.check_out_date}</p>
                  )}
                </div>
              </div>

              {/* Guests */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adults
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.adults}
                    onChange={(e) => setFormData(prev => ({ ...prev, adults: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Children
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.children}
                    onChange={(e) => setFormData(prev => ({ ...prev, children: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Dietary Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dietary Requirements
                </label>
                <div className="relative">
                  <Utensils className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.dietary_requirements}
                    onChange={(e) => setFormData(prev => ({ ...prev, dietary_requirements: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Vegetarian, Vegan, Allergies, etc."
                  />
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
                  rows="3"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any special requests or requirements..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !formData.room_type}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Submit Booking
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventMicrosite;
