import React, { useState, useEffect, useCallback, createContext, useContext, useRef } from 'react';
import { Search, Filter, Download, Send, RefreshCw, Users, Hotel, CreditCard, Calendar, CheckCircle, Clock, XCircle, AlertTriangle, ChevronDown, MoreVertical, Mail, MessageSquare, Phone, Eye, Edit, Trash2, Plus, FileSpreadsheet, FileText, Bell, TrendingUp, Building, UserCheck, UserX, DollarSign, Percent, ArrowUpRight, ArrowDownRight, Loader2, Moon, Sun, History } from 'lucide-react';
import { parsePhoneNumber, isValidPhoneNumber, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { dashboardAPI, bookingsAPI, inventoryAPI, tboAPI } from './api';

// API Base URL - works in both development and production
const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (window.location.hostname !== 'localhost'
    ? 'https://tbogroup-production.up.railway.app/api'
    : 'http://localhost:8000/api');

// Country data with flag codes and dial codes
const COUNTRIES = [
  { code: 'IN', name: 'India', dial: '+91', flag: 'in' },
  { code: 'US', name: 'USA', dial: '+1', flag: 'us' },
  { code: 'GB', name: 'UK', dial: '+44', flag: 'gb' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: 'au' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: 'ca' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: 'de' },
  { code: 'FR', name: 'France', dial: '+33', flag: 'fr' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: 'ae' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: 'sg' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: 'my' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: 'th' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: 'jp' },
  { code: 'CN', name: 'China', dial: '+86', flag: 'cn' },
];

// ============================================================
// CUSTOM COUNTRY SELECTOR COMPONENT
// ============================================================

function CountrySelector({ value, onChange, darkMode }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedCountry = COUNTRIES.find(c => c.code === value) || COUNTRIES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (country) => {
    onChange(country.code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
          darkMode ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}
        style={{ width: '110px' }}
      >
        <span className={`fi fi-${selectedCountry.flag}`}></span>
        <span className="flex-1">{selectedCountry.dial}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1 w-64 rounded-lg border shadow-lg z-50 max-h-64 overflow-y-auto ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          {COUNTRIES.map((country) => (
            <button
              key={country.code}
              type="button"
              onClick={() => handleSelect(country)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                country.code === value
                  ? darkMode ? 'bg-gray-700 text-white' : 'bg-amber-50 text-amber-900'
                  : darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className={`fi fi-${country.flag}`}></span>
              <span className="flex-1">{country.name}</span>
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{country.dial}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DARK MODE CONTEXT
// ============================================================

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Event IDs
const EVENTS = {
  'sharma-gupta-wedding': {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Sharma-Gupta Wedding'
  },
  'corporate-retreat-2026': {
    id: '44444444-4444-4444-4444-444444444441',
    name: 'Corporate Retreat 2026'
  },
  'tech-conference-mumbai': {
    id: '55555555-5555-5555-5555-555555555551',
    name: 'Tech Conference Mumbai'
  }
};

const DEFAULT_EVENT_ID = '33333333-3333-3333-3333-333333333333';

// ============================================================
// MAIN DASHBOARD COMPONENT (WRAPPER WITH THEME)
// ============================================================

export default function GroupBookingDashboard({ onOpenMicrosite }) {
  return (
    <ThemeProvider>
      <DashboardContent onOpenMicrosite={onOpenMicrosite} />
    </ThemeProvider>
  );
}

// ============================================================
// DASHBOARD CONTENT
// ============================================================

function DashboardContent({ onOpenMicrosite }) {
  const { darkMode, toggleDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [hotelFilter, setHotelFilter] = useState('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [sideFilter, setSideFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [checkInDateFilter, setCheckInDateFilter] = useState('');

  // Data state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentEventId, setCurrentEventId] = useState(DEFAULT_EVENT_ID);
  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [guests, setGuests] = useState([]);

  // Fetch guests separately
  const fetchGuests = useCallback(async (eventId = currentEventId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/guests/event/${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setGuests(data);
      }
    } catch (err) {
      console.error('Failed to fetch guests:', err);
    }
  }, [currentEventId]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (eventId = currentEventId) => {
    try {
      setLoading(true);
      setError(null);

      const data = await dashboardAPI.getFullDashboard(eventId);

      setEvent(data.event);
      setStats(data.stats);
      setBookings(data.bookings);
      setInventory(data.inventory);

      // Also fetch guests
      await fetchGuests(eventId);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError(err.message);
      // Fallback to mock data if API fails
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  }, [currentEventId, fetchGuests]);

  // Handle event change
  const handleEventChange = (eventId) => {
    setCurrentEventId(eventId);
    fetchDashboardData(eventId);
  };

  // Fallback mock data if API is unavailable
  const loadFallbackData = () => {
    setEvent({
      id: '1',
      name: 'Sharma-Gupta Wedding',
      code: 'WED-2026-SG',
      type: 'Wedding',
      dates: 'February 22-25, 2026',
      destination: 'Udaipur, Rajasthan',
      status: 'active',
      daysToEvent: 16,
      bookingDeadline: 'February 15, 2026'
    });

    setStats({
      totalGuests: 150,
      attending: 89,
      declined: 23,
      pending: 38,
      totalBookings: 42,
      confirmedBookings: 35,
      pendingBookings: 5,
      cancelledBookings: 2,
      totalRooms: 50,
      bookedRooms: 38,
      availableRooms: 12,
      occupancyRate: 76,
      totalValue: 3250000,
      collected: 2180000,
      pendingAmount: 1070000,
      collectionRate: 67
    });

    setBookings([
      { id: 1, ref: 'WED-SG-0001', guest: 'Mr. Amit Kumar', email: 'amit.kumar@email.com', phone: '+91-98765-43001', hotel: 'Taj Lake Palace', room: 'Deluxe Lake View', checkIn: '21 Feb', checkOut: '25 Feb', nights: 4, rooms: 1, adults: 2, children: 0, total: 84960, paid: 84960, due: 0, paymentStatus: 'paid', status: 'confirmed', category: 'Family', side: 'Groom', dietary: ['Vegetarian'], source: 'Microsite' },
      { id: 2, ref: 'WED-SG-0002', guest: 'Ms. Neha Patel', email: 'neha.patel@email.com', phone: '+91-98765-43004', hotel: 'Taj Lake Palace', room: 'Deluxe Lake View', checkIn: '22 Feb', checkOut: '25 Feb', nights: 3, rooms: 1, adults: 1, children: 0, total: 63720, paid: 0, due: 63720, paymentStatus: 'pending', status: 'pending', category: 'Friend', side: 'Bride', dietary: [], source: 'WhatsApp' },
      { id: 3, ref: 'WED-SG-0003', guest: 'Mr. Vikram Singh', email: 'vikram.singh@email.com', phone: '+91-98765-43003', hotel: 'Taj Lake Palace', room: 'Luxury Suite', checkIn: '21 Feb', checkOut: '25 Feb', nights: 4, rooms: 1, adults: 2, children: 0, total: 165200, paid: 50000, due: 115200, paymentStatus: 'partial', status: 'confirmed', category: 'Friend', side: 'Groom', dietary: ['Non-Veg'], source: 'Microsite' },
      { id: 4, ref: 'WED-SG-0004', guest: 'Dr. Rajesh Mehta', email: 'rajesh.mehta@email.com', phone: '+91-98765-43005', hotel: 'Oberoi Udaivilas', room: 'Premier Room', checkIn: '22 Feb', checkOut: '24 Feb', nights: 2, rooms: 1, adults: 2, children: 1, total: 52080, paid: 52080, due: 0, paymentStatus: 'paid', status: 'confirmed', category: 'Family', side: 'Bride', dietary: ['Jain'], source: 'Agent' },
      { id: 5, ref: 'WED-SG-0005', guest: 'Mrs. Sunita Sharma', email: 'sunita.sharma@email.com', phone: '+91-98765-43006', hotel: 'Taj Lake Palace', room: 'Deluxe Lake View', checkIn: '21 Feb', checkOut: '25 Feb', nights: 4, rooms: 2, adults: 4, children: 2, total: 169920, paid: 100000, due: 69920, paymentStatus: 'partial', status: 'confirmed', category: 'Family', side: 'Groom', dietary: ['Vegetarian'], source: 'Microsite' },
      { id: 6, ref: 'WED-SG-0006', guest: 'Mr. Karan Malhotra', email: 'karan.m@email.com', phone: '+91-98765-43007', hotel: 'Taj Lake Palace', room: 'Luxury Suite', checkIn: '22 Feb', checkOut: '25 Feb', nights: 3, rooms: 1, adults: 2, children: 0, total: 123900, paid: 0, due: 123900, paymentStatus: 'pending', status: 'waitlisted', category: 'Friend', side: 'Groom', dietary: [], source: 'Email' },
    ]);

    setInventory([
      { id: 1, hotel: 'Taj Lake Palace', room: 'Deluxe Lake View', blocked: 30, booked: 24, available: 6, rate: 18000, validTill: 'Feb 17' },
      { id: 2, hotel: 'Taj Lake Palace', room: 'Luxury Suite', blocked: 10, booked: 7, available: 3, rate: 35000, validTill: 'Feb 17' },
      { id: 3, hotel: 'Oberoi Udaivilas', room: 'Premier Room', blocked: 10, booked: 7, available: 3, rate: 22000, validTill: 'Feb 15' },
    ]);
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Compute guest stats from actual guests data
  const guestStats = {
    totalGuests: guests.length,
    attending: guests.filter(g => g.rsvp_status === 'confirmed' || g.rsvp_status === 'attending').length,
    pending: guests.filter(g => g.rsvp_status === 'pending' || g.rsvp_status === 'maybe' || g.rsvp_status === 'tentative' || !g.rsvp_status).length,
    declined: guests.filter(g => g.rsvp_status === 'declined' || g.rsvp_status === 'not_attending').length
  };

  // Merge computed guest stats with API stats
  const mergedStats = stats ? {
    ...stats,
    totalGuests: guests.length > 0 ? guestStats.totalGuests : stats.totalGuests,
    attending: guests.length > 0 ? guestStats.attending : stats.attending,
    pending: guests.length > 0 ? guestStats.pending : stats.pending,
    declined: guests.length > 0 ? guestStats.declined : stats.declined
  } : null;

  // Get unique values for filter dropdowns
  const uniqueHotels = [...new Set(bookings.map(b => b.hotel))];
  const uniqueRoomTypes = [...new Set(bookings.map(b => b.room))];
  const uniqueSources = [...new Set(bookings.map(b => b.source))];

  // Filter bookings with all filters
  const filteredBookings = bookings.filter(b => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
                         b.guest.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         b.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         b.email.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

    // Payment filter
    const matchesPayment = paymentFilter === 'all' || b.paymentStatus === paymentFilter;

    // Hotel filter
    const matchesHotel = hotelFilter === 'all' || b.hotel === hotelFilter;

    // Room type filter
    const matchesRoomType = roomTypeFilter === 'all' || b.room === roomTypeFilter;

    // Guest side filter
    const matchesSide = sideFilter === 'all' || b.side === sideFilter;

    // Booking source filter
    const matchesSource = sourceFilter === 'all' || b.source === sourceFilter;

    // Check-in date filter
    const matchesCheckIn = checkInDateFilter === '' || b.checkIn.includes(checkInDateFilter);

    return matchesSearch && matchesStatus && matchesPayment &&
           matchesHotel && matchesRoomType && matchesSide &&
           matchesSource && matchesCheckIn;
  });

  // Count active filters
  const activeFilterCount = [
    statusFilter !== 'all',
    paymentFilter !== 'all',
    hotelFilter !== 'all',
    roomTypeFilter !== 'all',
    sideFilter !== 'all',
    sourceFilter !== 'all',
    checkInDateFilter !== ''
  ].filter(Boolean).length;

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPaymentFilter('all');
    setHotelFilter('all');
    setRoomTypeFilter('all');
    setSideFilter('all');
    setSourceFilter('all');
    setCheckInDateFilter('');
  };

  // Export rooming list
  const handleExportRoomingList = async () => {
    try {
      await dashboardAPI.exportRoomingList(currentEventId, 'excel');
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export rooming list');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center animate-fadeIn">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-amber-500 animate-spin mx-auto mb-4" />
            <div className="absolute inset-0 w-12 h-12 mx-auto rounded-full bg-amber-500/20 animate-ping" />
          </div>
          <p className={`animate-pulse-slow ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* API Status Banner */}
      {error && (
        <div className={`border-b px-6 py-2 ${darkMode ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200'}`}>
          <p className={`text-sm ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Using demo data. Backend API unavailable: {error}
          </p>
        </div>
      )}

      {/* Top Navigation */}
      <nav className={`border-b px-6 py-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <img
                src="https://www.tbo.com/img/logo.svg"
                alt="TBO"
                className="h-8 w-auto"
              />
              <span className={`ml-3 text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>GroupBook</span>
            </div>
            <div className={`h-6 w-px ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
            <select
              value={currentEventId}
              onChange={(e) => handleEventChange(e.target.value)}
              className={`text-sm border-0 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-amber-500 cursor-pointer ${
              darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
            }`}>
              {Object.entries(EVENTS).map(([key, evt]) => (
                <option key={key} value={evt.id}>{evt.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-4">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${
                darkMode
                  ? 'text-yellow-400 hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={fetchDashboardData}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button className={`relative p-2 rounded-lg transition-colors ${
              darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}>
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-amber-700">RS</span>
              </div>
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Rajesh Sharma</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Event Header */}
      <div className={`px-6 py-6 ${darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-900 text-white' : 'bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{event?.name}</h1>
              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${darkMode ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-green-100 text-green-700 border-green-300'}`}>
                Active
              </span>
            </div>
            <div className={`flex items-center space-x-4 mt-2 text-sm ${darkMode ? 'text-slate-300' : 'text-gray-600'}`}>
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" />{event?.dates}</span>
              <span className="flex items-center"><Building className="w-4 h-4 mr-1" />{event?.destination}</span>
              <span className="flex items-center"><Clock className="w-4 h-4 mr-1" />{event?.daysToEvent} days to event</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onOpenMicrosite && onOpenMicrosite(event?.name || 'Event', currentEventId)}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'}`}
            >
              <Eye className="w-4 h-4 mr-2" />
              View Microsite
            </button>
            <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center transition-all btn-press hover:shadow-lg hover:shadow-amber-500/25">
              <Send className="w-4 h-4 mr-2" />
              Send Invites
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`border-b px-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'bookings', label: 'Bookings & Rooming List', icon: FileSpreadsheet },
            { id: 'guests', label: 'Guest List', icon: Users },
            { id: 'inventory', label: 'Inventory', icon: Hotel },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'communications', label: 'Communications', icon: Mail },
            { id: 'audit', label: 'Audit Logs', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : darkMode
                    ? 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className={`w-4 h-4 mr-2 transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 tab-content">
        {activeTab === 'overview' && mergedStats && (
          <OverviewTab stats={mergedStats} bookings={bookings} onExport={handleExportRoomingList} darkMode={darkMode} />
        )}
        {activeTab === 'bookings' && (
          <BookingsTab
            bookings={filteredBookings}
            totalBookings={bookings.length}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            paymentFilter={paymentFilter}
            setPaymentFilter={setPaymentFilter}
            hotelFilter={hotelFilter}
            setHotelFilter={setHotelFilter}
            roomTypeFilter={roomTypeFilter}
            setRoomTypeFilter={setRoomTypeFilter}
            sideFilter={sideFilter}
            setSideFilter={setSideFilter}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            checkInDateFilter={checkInDateFilter}
            setCheckInDateFilter={setCheckInDateFilter}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            uniqueHotels={uniqueHotels}
            uniqueRoomTypes={uniqueRoomTypes}
            uniqueSources={uniqueSources}
            activeFilterCount={activeFilterCount}
            clearAllFilters={clearAllFilters}
            onExport={handleExportRoomingList}
            onRefresh={() => fetchDashboardData(currentEventId)}
            darkMode={darkMode}
            eventId={currentEventId}
          />
        )}
        {activeTab === 'guests' && <GuestListTab darkMode={darkMode} eventId={currentEventId} guests={guests} setGuests={setGuests} onRefresh={() => fetchGuests(currentEventId)} />}
        {activeTab === 'inventory' && <InventoryTab inventory={inventory} darkMode={darkMode} eventId={currentEventId} onRefresh={() => fetchDashboardData(currentEventId)} />}
        {activeTab === 'payments' && stats && <PaymentsTab stats={stats} darkMode={darkMode} />}
        {activeTab === 'communications' && <CommunicationsTab darkMode={darkMode} />}
        {activeTab === 'audit' && <AuditLogsTab darkMode={darkMode} eventId={currentEventId} />}
      </div>
    </div>
  );
}

// ============================================================
// OVERVIEW TAB
// ============================================================

function OverviewTab({ stats, bookings, onExport, darkMode }) {
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Guests"
          value={stats.totalGuests}
          subtitle={`${stats.attending} confirmed`}
          icon={Users}
          color="blue"
          trend={`${stats.pending} pending response`}
          trendUp={true}
          darkMode={darkMode}
        />
        <StatCard
          title="Room Occupancy"
          value={`${stats.bookedRooms}/${stats.totalRooms}`}
          subtitle="Rooms Booked"
          icon={Hotel}
          color="green"
          trend={`${stats.occupancyRate}% occupancy`}
          trendUp={true}
          darkMode={darkMode}
        />
        <StatCard
          title="Total Booking Value"
          value={`₹${(stats.totalValue/100000).toFixed(1)}L`}
          subtitle="Gross Value"
          icon={DollarSign}
          color="amber"
          trend={`${stats.totalBookings} bookings`}
          trendUp={true}
          darkMode={darkMode}
        />
        <StatCard
          title="Collection"
          value={`₹${(stats.collected/100000).toFixed(1)}L`}
          subtitle={`₹${(stats.pendingAmount/100000).toFixed(1)}L pending`}
          icon={CreditCard}
          color="purple"
          trend={`${stats.collectionRate}% collected`}
          trendUp={stats.collectionRate > 50}
          darkMode={darkMode}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest Status Breakdown */}
        <div className={`rounded-xl border p-6 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Guest RSVP Status</h3>
          <div className="space-y-3">
            <ProgressBar label="Attending" value={stats.attending} total={stats.totalGuests} color="green" darkMode={darkMode} />
            <ProgressBar label="Declined" value={stats.declined} total={stats.totalGuests} color="red" darkMode={darkMode} />
            <ProgressBar label="Pending" value={stats.pending} total={stats.totalGuests} color="yellow" darkMode={darkMode} />
          </div>
          <div className={`mt-4 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <button className="text-sm text-amber-600 hover:text-amber-500 font-medium flex items-center">
              Send reminder to pending guests
              <ArrowUpRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Booking Status */}
        <div className={`rounded-xl border p-6 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Booking Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className={`text-center p-4 rounded-lg transition-all hover:scale-105 cursor-default ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
              <div className={`text-3xl font-bold counter-animate ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{stats.confirmedBookings}</div>
              <div className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'}`}>Confirmed</div>
            </div>
            <div className={`text-center p-4 rounded-lg transition-all hover:scale-105 cursor-default ${darkMode ? 'bg-yellow-900/30' : 'bg-yellow-50'}`}>
              <div className={`text-3xl font-bold counter-animate ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>{stats.pendingBookings}</div>
              <div className={`text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>Pending</div>
            </div>
            <div className={`text-center p-4 rounded-lg transition-all hover:scale-105 cursor-default ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
              <div className={`text-3xl font-bold counter-animate ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{stats.cancelledBookings}</div>
              <div className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Cancelled</div>
            </div>
            <div className={`text-center p-4 rounded-lg transition-all hover:scale-105 cursor-default ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <div className={`text-3xl font-bold counter-animate ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{stats.totalBookings}</div>
              <div className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Total</div>
            </div>
          </div>
        </div>

        {/* Payment Summary */}
        <div className={`rounded-xl border p-6 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Payment Collection</h3>
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className={`text-xs font-semibold inline-block ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {stats.collectionRate}% Collected
                </span>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold inline-block ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  ₹{(stats.collected/100000).toFixed(1)}L / ₹{(stats.totalValue/100000).toFixed(1)}L
                </span>
              </div>
            </div>
            <div className={`overflow-hidden h-3 text-xs flex rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div
                style={{ width: `${stats.collectionRate}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-green-400 to-green-500 progress-bar"
              />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Fully Paid</span>
              <span className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>12 bookings</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Partially Paid</span>
              <span className={`font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>8 bookings</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Payment Pending</span>
              <span className={`font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`}>5 bookings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className={`rounded-xl border p-6 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Recent Bookings</h3>
            <button className="text-sm text-amber-600 hover:text-amber-500 font-medium transition-colors">View All</button>
          </div>
          <div className="space-y-3">
            {bookings.slice(0, 4).map((booking, index) => (
              <div key={booking.id} className={`flex items-center justify-between p-3 rounded-lg table-row-hover transition-all hover:scale-[1.01] ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`} style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center transition-transform hover:scale-110">
                    <span className="text-sm font-medium text-amber-700">
                      {booking.guest.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.guest}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{booking.room} • {booking.nights} nights</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹{booking.total.toLocaleString()}</div>
                  <StatusBadge status={booking.status} size="sm" darkMode={darkMode} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className={`rounded-xl border p-6 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton icon={Send} label="Send Bulk Reminder" color="amber" darkMode={darkMode} />
            <ActionButton icon={Download} label="Export Rooming List" color="blue" onClick={onExport} darkMode={darkMode} />
            <ActionButton icon={Plus} label="Add Manual Booking" color="green" darkMode={darkMode} />
            <ActionButton icon={Mail} label="Email All Guests" color="purple" darkMode={darkMode} />
            <ActionButton icon={FileText} label="Generate Report" color="slate" darkMode={darkMode} />
            <ActionButton icon={RefreshCw} label="Sync with TBO" color="cyan" darkMode={darkMode} />
          </div>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className={`rounded-xl border p-6 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Action Required</h3>
        <div className="space-y-3">
          <AlertItem
            type="warning"
            title="5 bookings with payment pending"
            description="Payment deadline approaching in 3 days"
            action="Send Reminders"
            darkMode={darkMode}
          />
          <AlertItem
            type="info"
            title="38 guests haven't responded to invitation"
            description="Last reminder sent 5 days ago"
            action="Send Follow-up"
            darkMode={darkMode}
          />
          <AlertItem
            type="success"
            title="Room block release date in 10 days"
            description="12 rooms still available. Consider releasing or extending."
            action="Manage Inventory"
            darkMode={darkMode}
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// BOOKINGS TAB (Rooming List)
// ============================================================

function BookingsTab({
  bookings,
  totalBookings,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  paymentFilter,
  setPaymentFilter,
  hotelFilter,
  setHotelFilter,
  roomTypeFilter,
  setRoomTypeFilter,
  sideFilter,
  setSideFilter,
  sourceFilter,
  setSourceFilter,
  checkInDateFilter,
  setCheckInDateFilter,
  showFilters,
  setShowFilters,
  uniqueHotels,
  uniqueRoomTypes,
  uniqueSources,
  activeFilterCount,
  clearAllFilters,
  onExport,
  onRefresh,
  darkMode,
  eventId
}) {
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [showEditBookingModal, setShowEditBookingModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState(null);
  const [showViewBookingModal, setShowViewBookingModal] = useState(false);
  const [viewingBooking, setViewingBooking] = useState(null);

  const handleViewBooking = (booking) => {
    setViewingBooking(booking);
    setShowViewBookingModal(true);
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setShowEditBookingModal(true);
  };

  const handleDeleteBooking = (booking) => {
    setDeletingBooking(booking);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await bookingsAPI.delete(deletingBooking.id);
      setShowDeleteConfirm(false);
      setDeletingBooking(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete booking:', err);
      alert('Failed to delete booking: ' + err.message);
    }
  };

  const toggleSelectAll = () => {
    if (selectedBookings.length === bookings.length) {
      setSelectedBookings([]);
    } else {
      setSelectedBookings(bookings.map(b => b.id));
    }
  };

  const handleBulkAction = async (action) => {
    try {
      await bookingsAPI.bulkAction(selectedBookings, action);
      setSelectedBookings([]);
      onRefresh();
    } catch (err) {
      console.error('Bulk action failed:', err);
      alert('Action failed: ' + err.message);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Toolbar */}
      <div className={`rounded-xl border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search guests, booking ref..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-4 py-2 border rounded-lg text-sm w-72 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200 text-gray-900'
                }`}
              />
            </div>

            {/* Quick Filters */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                statusFilter !== 'all'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200'
                    : 'border-gray-200 text-gray-700'
              }`}
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                paymentFilter !== 'all'
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : darkMode
                    ? 'bg-gray-700 border-gray-600 text-gray-200'
                    : 'border-gray-200 text-gray-700'
              }`}
            >
              <option value="all">All Payments</option>
              <option value="paid">Fully Paid</option>
              <option value="partial">Partially Paid</option>
              <option value="pending">Payment Pending</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 border rounded-lg text-sm flex items-center ${
                showFilters || activeFilterCount > 0
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              More Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Clear Filters Button */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {selectedBookings.length > 0 && (
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${darkMode ? 'bg-amber-900/30' : 'bg-amber-50'}`}>
                <span className={`text-sm ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>{selectedBookings.length} selected</span>
                <button
                  onClick={() => handleBulkAction('send_reminder')}
                  className="text-sm text-amber-600 hover:text-amber-500 font-medium"
                >
                  Send Reminder
                </button>
                <button
                  onClick={() => handleBulkAction('cancel')}
                  className="text-sm text-red-600 hover:text-red-500 font-medium"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              onClick={() => setShowAddBookingModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Booking
            </button>

            <div className={`flex items-center border rounded-lg ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              <button
                onClick={onExport}
                className={`px-3 py-2 border-r flex items-center text-sm ${
                  darkMode
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </button>
              <button className={`px-2 py-2 ${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}>
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className={`mt-4 pt-4 border-t grid grid-cols-5 gap-4 ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hotel</label>
              <select
                value={hotelFilter}
                onChange={(e) => setHotelFilter(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  hotelFilter !== 'all'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'border-gray-200'
                }`}
              >
                <option value="all">All Hotels</option>
                {uniqueHotels.map(hotel => (
                  <option key={hotel} value={hotel}>{hotel}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Room Type</label>
              <select
                value={roomTypeFilter}
                onChange={(e) => setRoomTypeFilter(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  roomTypeFilter !== 'all'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'border-gray-200'
                }`}
              >
                <option value="all">All Rooms</option>
                {uniqueRoomTypes.map(room => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Check-in Date</label>
              <input
                type="text"
                placeholder="e.g., 14 Mar"
                value={checkInDateFilter}
                onChange={(e) => setCheckInDateFilter(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  checkInDateFilter !== ''
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                      : 'border-gray-200'
                }`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Guest Side</label>
              <select
                value={sideFilter}
                onChange={(e) => setSideFilter(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  sideFilter !== 'all'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'border-gray-200'
                }`}
              >
                <option value="all">All</option>
                <option value="Bride">Bride's Side</option>
                <option value="Groom">Groom's Side</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Booking Source</label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  sourceFilter !== 'all'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : darkMode
                      ? 'bg-gray-700 border-gray-600 text-gray-200'
                      : 'border-gray-200'
                }`}
              >
                <option value="all">All Sources</option>
                {uniqueSources.map(source => (
                  <option key={source} value={source}>{source}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing <span className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{bookings.length}</span>
          {bookings.length !== totalBookings && (
            <span> of {totalBookings}</span>
          )} bookings
          {activeFilterCount > 0 && (
            <span className="ml-2 text-amber-600">({activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied)</span>
          )}
        </p>
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>View:</span>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded ${viewMode === 'table' ? (darkMode ? 'bg-gray-700' : 'bg-gray-200') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
          >
            <FileSpreadsheet className={`w-4 h-4 ${darkMode ? 'text-gray-300' : ''}`} />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-1.5 rounded ${viewMode === 'cards' ? (darkMode ? 'bg-gray-700' : 'bg-gray-200') : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100')}`}
          >
            <Users className={`w-4 h-4 ${darkMode ? 'text-gray-300' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={`border-b ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedBookings.length === bookings.length && bookings.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                </th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Guest</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hotel & Room</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Stay</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Occupancy</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Amount</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Payment</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {bookings.map(booking => (
                <tr key={booking.id} className={`transition-colors ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedBookings.includes(booking.id)}
                      onChange={() => {
                        if (selectedBookings.includes(booking.id)) {
                          setSelectedBookings(selectedBookings.filter(id => id !== booking.id));
                        } else {
                          setSelectedBookings([...selectedBookings, booking.id]);
                        }
                      }}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-amber-700">
                          {booking.guest.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.guest}</div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{booking.ref}</div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{booking.side}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>{booking.category}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.hotel}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{booking.room}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.checkIn} - {booking.checkOut}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{booking.nights} nights • {booking.rooms} room</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.adults}A {booking.children > 0 && `+ ${booking.children}C`}</div>
                    {booking.dietary && booking.dietary.length > 0 && (
                      <div className={`text-xs ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>{booking.dietary.join(', ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹{booking.total.toLocaleString()}</div>
                    {booking.due > 0 && (
                      <div className={`text-xs ${darkMode ? 'text-red-400' : 'text-red-600'}`}>Due: ₹{booking.due.toLocaleString()}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PaymentBadge status={booking.paymentStatus} darkMode={darkMode} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status} darkMode={darkMode} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewBooking(booking)}
                        className={`p-1.5 rounded ${darkMode ? 'text-gray-400 hover:text-blue-400 hover:bg-blue-900/30' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditBooking(booking)}
                        className={`p-1.5 rounded ${darkMode ? 'text-gray-400 hover:text-green-400 hover:bg-green-900/30' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBooking(booking)}
                        className={`p-1.5 rounded ${darkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/30' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button className={`p-1.5 rounded ${darkMode ? 'text-gray-400 hover:text-amber-400 hover:bg-amber-900/30' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`} title="Send Email">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className={`p-1.5 rounded ${darkMode ? 'text-gray-400 hover:text-purple-400 hover:bg-purple-900/30' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'}`} title="WhatsApp">
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className={`px-4 py-3 border-t flex items-center justify-between ${darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Page 1 of 1 • {bookings.length} total bookings
          </div>
          <div className="flex items-center space-x-2">
            <button className={`px-3 py-1 border rounded text-sm disabled:opacity-50 ${
              darkMode
                ? 'border-gray-600 text-gray-400 hover:bg-gray-700'
                : 'border-gray-200 text-gray-600 hover:bg-white'
            }`} disabled>
              Previous
            </button>
            <button className={`px-3 py-1 border rounded text-sm disabled:opacity-50 ${
              darkMode
                ? 'border-gray-600 text-gray-400 hover:bg-gray-700'
                : 'border-gray-200 text-gray-600 hover:bg-white'
            }`} disabled>
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Booking Modal */}
      {showAddBookingModal && (
        <AddBookingModal
          darkMode={darkMode}
          onClose={() => setShowAddBookingModal(false)}
          onSuccess={() => {
            setShowAddBookingModal(false);
            onRefresh();
          }}
          eventId={eventId}
        />
      )}

      {/* Edit Booking Modal */}
      {showViewBookingModal && viewingBooking && (
        <ViewBookingModal
          darkMode={darkMode}
          booking={viewingBooking}
          onClose={() => {
            setShowViewBookingModal(false);
            setViewingBooking(null);
          }}
        />
      )}

      {showEditBookingModal && editingBooking && (
        <EditBookingModal
          darkMode={darkMode}
          booking={editingBooking}
          onClose={() => {
            setShowEditBookingModal(false);
            setEditingBooking(null);
          }}
          onSuccess={() => {
            setShowEditBookingModal(false);
            setEditingBooking(null);
            onRefresh();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && deletingBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
          <div className={`rounded-xl max-w-md w-full modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Delete Booking</h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>This action cannot be undone</p>
                </div>
              </div>

              <div className={`p-4 rounded-lg mb-4 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Booking Ref:</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{deletingBooking.ref}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Guest:</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{deletingBooking.guest}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Hotel:</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{deletingBooking.hotel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Amount:</span>
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹{deletingBooking.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <p className={`text-sm mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to delete this booking? This will free up the room inventory and cannot be undone.
              </p>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingBooking(null);
                  }}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                    darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Booking
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// OTHER TABS
// ============================================================

function GuestListTab({ darkMode, eventId, guests, setGuests, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch guests when needed (passed from parent now)
  const fetchGuests = async () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const handleUpdateRSVP = async (guestId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/guests/${guestId}/rsvp?rsvp_status=${status}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        // Update local state immediately for better UX
        setGuests(prev => prev.map(g =>
          g.id === guestId ? { ...g, rsvp_status: status } : g
        ));
      } else {
        const error = await response.json();
        console.error('RSVP update failed:', error);
        alert('Failed to update RSVP status');
      }
    } catch (err) {
      console.error('Failed to update RSVP:', err);
      alert('Failed to update RSVP status. Please try again.');
    }
  };

  const handleDeleteGuest = async (guestId) => {
    if (!confirm('Are you sure you want to delete this guest?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/guests/${guestId}`, { method: 'DELETE' });
      if (response.ok) {
        // Update local state immediately
        setGuests(prev => prev.filter(g => g.id !== guestId));
      }
    } catch (err) {
      console.error('Failed to delete guest:', err);
    }
  };

  const filteredGuests = guests.filter(guest => {
    const matchesSearch = guest.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         guest.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRSVP = rsvpFilter === 'all' ||
      (rsvpFilter === 'confirmed' && (guest.rsvp_status === 'confirmed' || guest.rsvp_status === 'attending')) ||
      (rsvpFilter === 'pending' && (guest.rsvp_status === 'pending' || guest.rsvp_status === 'maybe' || !guest.rsvp_status)) ||
      (rsvpFilter === 'declined' && (guest.rsvp_status === 'declined' || guest.rsvp_status === 'not_attending'));
    const matchesCategory = categoryFilter === 'all' || guest.category === categoryFilter;
    return matchesSearch && matchesRSVP && matchesCategory;
  });

  const rsvpCounts = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp_status === 'confirmed' || g.rsvp_status === 'attending').length,
    pending: guests.filter(g => g.rsvp_status === 'pending' || g.rsvp_status === 'maybe' || g.rsvp_status === 'tentative' || !g.rsvp_status).length,
    declined: guests.filter(g => g.rsvp_status === 'declined' || g.rsvp_status === 'not_attending').length
  };

  if (!guests || guests.length === 0 && loading) {
    return (
      <div className={`rounded-xl border p-8 text-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-amber-500" />
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading guests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-4 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Invited</p>
              <p className={`text-2xl font-bold counter-animate ${darkMode ? 'text-white' : 'text-gray-800'}`}>{rsvpCounts.total}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500 transition-transform hover:scale-110" />
          </div>
        </div>
        <div className={`rounded-xl border p-4 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Confirmed</p>
              <p className={`text-2xl font-bold text-green-500 counter-animate`}>{rsvpCounts.confirmed}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-500 transition-transform hover:scale-110" />
          </div>
        </div>
        <div className={`rounded-xl border p-4 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
              <p className={`text-2xl font-bold text-amber-500 counter-animate`}>{rsvpCounts.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        <div className={`rounded-xl border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Declined</p>
              <p className={`text-2xl font-bold text-red-500`}>{rsvpCounts.declined}</p>
            </div>
            <UserX className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={`rounded-xl border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 pr-4 py-2 border rounded-lg text-sm w-64 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
                }`}
              />
            </div>
            <select
              value={rsvpFilter}
              onChange={(e) => setRsvpFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
              }`}
            >
              <option value="all">All RSVP</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="declined">Declined</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className={`px-3 py-2 border rounded-lg text-sm ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'
              }`}
            >
              <option value="all">All Categories</option>
              <option value="Family">Family</option>
              <option value="Friend">Friend</option>
              <option value="VIP">VIP</option>
              <option value="Colleague">Colleague</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Guest</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guest Table */}
      <div className={`rounded-xl border overflow-hidden ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <table className="w-full">
          <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
            <tr>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Guest</th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Contact</th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Category</th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>RSVP</th>
              <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {filteredGuests.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-4 py-8 text-center">
                  <Users className={`w-12 h-12 mx-auto mb-2 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No guests found</p>
                </td>
              </tr>
            ) : (
              filteredGuests.map((guest) => (
                <tr key={guest.id} className={darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                        guest.category === 'VIP' ? 'bg-purple-500' :
                        guest.category === 'Family' ? 'bg-blue-500' :
                        guest.category === 'Friend' ? 'bg-green-500' : 'bg-gray-500'
                      }`}>
                        {guest.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{guest.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div className="flex items-center space-x-1">
                        <Mail className="w-3 h-3" />
                        <span>{guest.email || '-'}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <Phone className="w-3 h-3" />
                        <span>{guest.phone || '-'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      guest.category === 'VIP' ? 'bg-purple-100 text-purple-700' :
                      guest.category === 'Family' ? 'bg-blue-100 text-blue-700' :
                      guest.category === 'Friend' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {guest.category || 'Other'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const normalizedStatus =
                        (guest.rsvp_status === 'attending' || guest.rsvp_status === 'confirmed') ? 'confirmed' :
                        (guest.rsvp_status === 'not_attending' || guest.rsvp_status === 'declined') ? 'declined' :
                        'pending';
                      const statusColor =
                        normalizedStatus === 'confirmed' ? 'bg-green-500' :
                        normalizedStatus === 'declined' ? 'bg-red-500' :
                        'bg-yellow-500';
                      return (
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                          <select
                            value={normalizedStatus}
                            onChange={(e) => handleUpdateRSVP(guest.id, e.target.value)}
                            className={`px-3 py-1.5 border rounded-lg text-sm cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'
                            }`}
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="declined">Declined</option>
                          </select>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingGuest(guest)}
                        className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <Edit className="w-4 h-4 text-blue-500" />
                      </button>
                      <button
                        onClick={() => handleDeleteGuest(guest.id)}
                        className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Guest Modal */}
      {showAddModal && (
        <AddGuestModal
          darkMode={darkMode}
          eventId={eventId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchGuests();
          }}
        />
      )}

      {/* Edit Guest Modal */}
      {editingGuest && (
        <EditGuestModal
          darkMode={darkMode}
          guest={editingGuest}
          onClose={() => setEditingGuest(null)}
          onSuccess={() => {
            setEditingGuest(null);
            fetchGuests();
          }}
        />
      )}
    </div>
  );
}

// Add Guest Modal
function AddGuestModal({ darkMode, eventId, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'Friend',
    side: 'Neutral',
    dietary_requirements: '',
    plus_ones: 0,
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/guests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, event_id: eventId })
      });
      if (response.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to create guest:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
      <div className={`rounded-xl max-w-md w-full modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Add Guest</h2>
          <button onClick={onClose} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
              >
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="VIP">VIP</option>
                <option value="Colleague">Colleague</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Side</label>
              <select
                value={formData.side}
                onChange={(e) => setFormData({ ...formData, side: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
              >
                <option value="Bride">Bride</option>
                <option value="Groom">Groom</option>
                <option value="Neutral">Neutral</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Plus Ones</label>
            <input
              type="number"
              min="0"
              value={formData.plus_ones}
              onChange={(e) => setFormData({ ...formData, plus_ones: parseInt(e.target.value) || 0 })}
              className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 border rounded-lg ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 transition-all btn-press hover:shadow-lg hover:shadow-amber-500/25"
            >
              {loading ? 'Adding...' : 'Add Guest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Guest Modal
function EditGuestModal({ darkMode, guest, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: guest.name || '',
    email: guest.email || '',
    phone: guest.phone || '',
    category: guest.category || 'Friend',
    side: guest.side || 'Neutral',
    dietary_requirements: guest.dietary_requirements || '',
    plus_ones: guest.plus_ones || 0,
    notes: guest.notes || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/guests/${guest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        onSuccess();
      }
    } catch (err) {
      console.error('Failed to update guest:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
      <div className={`rounded-xl max-w-md w-full modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
        <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Edit Guest</h2>
          <button onClick={onClose} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
              >
                <option value="Family">Family</option>
                <option value="Friend">Friend</option>
                <option value="VIP">VIP</option>
                <option value="Colleague">Colleague</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Side</label>
              <select
                value={formData.side}
                onChange={(e) => setFormData({ ...formData, side: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
              >
                <option value="Bride">Bride</option>
                <option value="Groom">Groom</option>
                <option value="Neutral">Neutral</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Plus Ones</label>
            <input
              type="number"
              min="0"
              value={formData.plus_ones}
              onChange={(e) => setFormData({ ...formData, plus_ones: parseInt(e.target.value) || 0 })}
              className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 border rounded-lg ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 transition-all btn-press hover:shadow-lg hover:shadow-amber-500/25"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ADD ROOM BLOCK MODAL
// ============================================================

function AddRoomBlockModal({ darkMode, onClose, onSuccess, eventId }) {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('search'); // 'search' | 'results' | 'form'
  const [searchMode, setSearchMode] = useState('city'); // 'city' | 'codes'

  // Cities from TBO API
  const [cities, setCities] = useState([]);

  // Search form
  const [searchForm, setSearchForm] = useState({
    city_code: '',
    hotel_codes: '',
    check_in: '',
    check_out: '',
    rooms: 1,
    adults: 2
  });

  // Search results
  const [hotelResults, setHotelResults] = useState([]);

  // Selected room details
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Room block form
  const [formData, setFormData] = useState({
    hotel_name: '',
    room_type: '',
    tbo_hotel_code: '',
    tbo_room_type_code: '',
    tbo_rate_plan_code: '',
    rack_rate: 0,
    negotiated_rate: '',
    total_rooms_blocked: '',
    valid_from: '',
    valid_to: '',
    release_date: '',
    meal_plan: 'CP',
    inclusions: []
  });

  const MEAL_PLANS = [
    { value: 'EP', label: 'European Plan (Room Only)' },
    { value: 'CP', label: 'Continental Plan (Breakfast)' },
    { value: 'MAP', label: 'Modified American Plan (Breakfast + Dinner)' },
    { value: 'AP', label: 'American Plan (All Meals)' }
  ];

  const INCLUSIONS_OPTIONS = [
    'WiFi', 'Airport Transfer', 'Spa Access', 'Pool Access',
    'Gym Access', 'Parking', 'Late Checkout', 'Early Check-in'
  ];

  // Fetch cities on mount
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const data = await tboAPI.getCities();
        setCities(data.cities || []);
      } catch (err) {
        console.error('Failed to fetch cities:', err);
      }
    };
    fetchCities();
    // No default dates - dates are optional for hotel info fetch
  }, []);

  // Search hotels
  const handleSearch = async () => {
    setSearching(true);
    setError(null);

    try {
      let hotelCodes = [];
      let cityHotels = null;

      if (searchMode === 'codes') {
        // Parse comma-separated hotel codes
        hotelCodes = searchForm.hotel_codes
          .split(',')
          .map(c => c.trim())
          .filter(c => c);

        if (hotelCodes.length === 0) {
          setError('Please enter at least one hotel code');
          setSearching(false);
          return;
        }
      } else {
        // For city search, fetch hotels for the selected city
        if (!searchForm.city_code) {
          setError('Please select a city');
          setSearching(false);
          return;
        }

        // Try to get hotels by city first
        try {
          cityHotels = await tboAPI.getHotelsByCity(searchForm.city_code, 20);
          if (cityHotels.hotels && cityHotels.hotels.length > 0) {
            hotelCodes = cityHotels.hotels.map(h => h.hotel_code);
          }
        } catch (cityErr) {
          console.warn('City hotel list failed, falling back to general codes:', cityErr);
        }

        // Fallback to general hotel codes if city search fails
        if (hotelCodes.length === 0) {
          const codesData = await tboAPI.getHotelCodes(20);
          hotelCodes = codesData.codes?.slice(0, 10).map(String) || [];
        }
      }

      // Check if dates are provided
      const hasDates = searchForm.check_in && searchForm.check_out;

      if (hasDates) {
        // Use search with availability (returns rooms with live pricing)
        const result = await tboAPI.searchHotels({
          hotel_codes: hotelCodes,
          check_in: searchForm.check_in,
          check_out: searchForm.check_out,
          rooms: searchForm.rooms,
          adults: searchForm.adults
        });

        if (result.hotels && result.hotels.length > 0) {
          setHotelResults(result.hotels);
          setStep('results');
        } else {
          setError('No hotels found with availability. Try without dates to see hotel info only.');
        }
      } else {
        // Use hotel details endpoint (no dates needed - fetches hotel info without availability)
        // If we got city hotels, use that data directly
        if (cityHotels && cityHotels.hotels && cityHotels.hotels.length > 0) {
          const formattedHotels = cityHotels.hotels.map(hotel => ({
            HotelCode: hotel.hotel_code,
            HotelName: hotel.hotel_name,
            StarRating: hotel.star_rating,
            Address: hotel.address,
            City: hotel.city,
            Country: hotel.country,
            Rooms: {
              Room: [{
                RoomTypeName: 'Standard Room',
                TotalFare: 0,
                MealPlanName: 'Room Only'
              }]
            },
            _noRatesAvailable: true
          }));

          setHotelResults(formattedHotels);
          setStep('results');
        } else {
          // Fetch details for each hotel code
          const hotelPromises = hotelCodes.map(code =>
            tboAPI.getHotelDetails(code).catch(err => {
              console.warn(`Failed to fetch hotel ${code}:`, err);
              return null;
            })
          );

          const hotelDetails = await Promise.all(hotelPromises);
          const validHotels = hotelDetails.filter(h => h !== null);

          if (validHotels.length > 0) {
            const formattedHotels = validHotels.map(hotel => ({
              HotelCode: hotel.hotel_code,
              HotelName: hotel.hotel_name,
              StarRating: hotel.star_rating,
              Address: hotel.address,
              City: hotel.city,
              Country: hotel.country,
              Description: hotel.description,
              Rooms: {
                Room: [{
                  RoomTypeName: 'Standard Room',
                  TotalFare: 0,
                  MealPlanName: 'Room Only'
                }]
              },
              _noRatesAvailable: true
            }));

            setHotelResults(formattedHotels);
            setStep('results');
          } else {
            setError('No hotel information found. Please check the hotel codes.');
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to search hotels');
    } finally {
      setSearching(false);
    }
  };

  // Select a room from results
  const handleSelectRoom = (hotel, room) => {
    setSelectedRoom({ hotel, room });

    // Pre-fill form with TBO data
    setFormData({
      hotel_name: hotel.HotelName || hotel.hotelName || 'Unknown Hotel',
      room_type: room.RoomTypeName || room.roomType || 'Standard Room',
      tbo_hotel_code: String(hotel.HotelCode || hotel.hotelCode || ''),
      tbo_room_type_code: room.RoomTypeCode || room.roomTypeCode || '',
      tbo_rate_plan_code: room.RatePlanCode || room.ratePlanCode || '',
      rack_rate: parseFloat(room.TotalFare || room.totalFare || room.Rate || 0),
      negotiated_rate: '',
      total_rooms_blocked: '',
      valid_from: searchForm.check_in,
      valid_to: searchForm.check_out,
      release_date: '',
      meal_plan: 'CP',
      inclusions: []
    });

    setStep('form');
  };

  // Handle inclusion toggle
  const toggleInclusion = (inclusion) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.includes(inclusion)
        ? prev.inclusions.filter(i => i !== inclusion)
        : [...prev.inclusions, inclusion]
    }));
  };

  // Submit room block
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate
      if (!formData.negotiated_rate || formData.negotiated_rate <= 0) {
        throw new Error('Please enter a valid negotiated rate');
      }
      if (!formData.total_rooms_blocked || formData.total_rooms_blocked <= 0) {
        throw new Error('Please enter the number of rooms to block');
      }

      // Create inventory
      await inventoryAPI.create({
        event_id: eventId,
        hotel_name: formData.hotel_name,
        room_type: formData.room_type,
        room_type_code: formData.tbo_room_type_code,
        total_rooms_blocked: parseInt(formData.total_rooms_blocked),
        negotiated_rate: parseFloat(formData.negotiated_rate),
        rack_rate: formData.rack_rate,
        valid_from: formData.valid_from,
        valid_to: formData.valid_to,
        release_date: formData.release_date || null,
        meal_plan: formData.meal_plan,
        inclusions: formData.inclusions,
        tbo_hotel_code: formData.tbo_hotel_code
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create room block');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
      <div className={`rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
        {/* Header */}
        <div className={`sticky top-0 px-6 py-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} z-10`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Add Room Block
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {step === 'search' && 'Search for hotels from TBO'}
                {step === 'results' && 'Select a room to block'}
                {step === 'form' && 'Configure room block details'}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg ${darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Search */}
          {step === 'search' && (
            <div className="space-y-6">
              {/* Search Mode Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchMode('city')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                    searchMode === 'city'
                      ? 'bg-amber-500 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Building className="w-4 h-4 inline mr-2" />
                  Search by City
                </button>
                <button
                  onClick={() => setSearchMode('codes')}
                  className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
                    searchMode === 'codes'
                      ? 'bg-amber-500 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Hotel className="w-4 h-4 inline mr-2" />
                  Enter Hotel Codes
                </button>
              </div>

              {/* Search Form */}
              <div className="grid grid-cols-2 gap-4">
                {searchMode === 'city' ? (
                  <div className="col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      City *
                    </label>
                    <select
                      value={searchForm.city_code}
                      onChange={(e) => setSearchForm({ ...searchForm, city_code: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                      }`}
                    >
                      <option value="">Select a city</option>
                      {cities.map(city => (
                        <option key={city.code} value={city.code}>
                          {city.name}, {city.country || city.state}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Hotel Codes *
                    </label>
                    <input
                      type="text"
                      value={searchForm.hotel_codes}
                      onChange={(e) => setSearchForm({ ...searchForm, hotel_codes: e.target.value })}
                      placeholder="Enter comma-separated hotel codes (e.g., 1000001, 1000002)"
                      className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                      }`}
                    />
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Get hotel codes from TBO or use the city search
                    </p>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Check-in Date <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={searchForm.check_in}
                    onChange={(e) => setSearchForm({ ...searchForm, check_in: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Check-out Date <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>(optional)</span>
                  </label>
                  <input
                    type="date"
                    value={searchForm.check_out}
                    onChange={(e) => setSearchForm({ ...searchForm, check_out: e.target.value })}
                    min={searchForm.check_in}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Rooms
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={searchForm.rooms}
                    onChange={(e) => setSearchForm({ ...searchForm, rooms: parseInt(e.target.value) || 1 })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Adults per Room
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={searchForm.adults}
                    onChange={(e) => setSearchForm({ ...searchForm, adults: parseInt(e.target.value) || 2 })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  />
                </div>
              </div>

              {/* Info text about optional dates */}
              <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Leave dates empty to fetch hotel info without live rates. Add dates to see real-time availability and pricing.
              </p>

              {/* Search Button */}
              <button
                onClick={handleSearch}
                disabled={searching || (searchMode === 'city' && !searchForm.city_code) || (searchMode === 'codes' && !searchForm.hotel_codes.trim())}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center justify-center disabled:opacity-50 transition-all btn-press hover:shadow-lg hover:shadow-amber-500/25"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search Hotels
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Results */}
          {step === 'results' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('search')}
                className={`text-sm ${darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}
              >
                ← Back to Search
              </button>

              <div className="space-y-3">
                {hotelResults.map((hotel, idx) => (
                  <div key={idx} className={`rounded-lg border p-4 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {hotel.HotelName || hotel.hotelName || 'Hotel'}
                        </h3>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Code: {hotel.HotelCode || hotel.hotelCode}
                          {hotel.City && ` • ${hotel.City}${hotel.Country ? `, ${hotel.Country}` : ''}`}
                        </p>
                        {hotel._noRatesAvailable && (
                          <p className={`text-xs mt-1 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                            Hotel info only - enter negotiated rate manually
                          </p>
                        )}
                      </div>
                      {hotel.StarRating && (
                        <span className="text-amber-500">
                          {'★'.repeat(parseInt(hotel.StarRating) || 3)}
                        </span>
                      )}
                    </div>

                    {/* Room Types */}
                    <div className="space-y-2">
                      {(hotel.Rooms?.Room || hotel.rooms || [{ RoomTypeName: 'Standard Room', TotalFare: hotel.MinRate || 0 }]).map((room, roomIdx) => (
                        <div
                          key={roomIdx}
                          className={`flex items-center justify-between p-3 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                        >
                          <div>
                            <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                              {room.RoomTypeName || room.roomType || 'Standard Room'}
                            </p>
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {room.MealPlanName || room.mealPlan || 'Room Only'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              {(room.TotalFare || room.totalFare || room.Rate || 0) > 0 ? (
                                <>
                                  <p className={`font-bold text-lg ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                                    ₹{(room.TotalFare || room.totalFare || room.Rate || 0).toLocaleString()}
                                  </p>
                                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>per night</p>
                                </>
                              ) : (
                                <p className={`text-sm italic ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  No rate available
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleSelectRoom(hotel, room)}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium"
                            >
                              Select
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {hotelResults.length === 0 && (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Hotel className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hotels found. Try different search criteria.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Form */}
          {step === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <button
                type="button"
                onClick={() => setStep('results')}
                className={`text-sm ${darkMode ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}
              >
                ← Back to Results
              </button>

              {/* Selected Hotel Info */}
              <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-amber-50'} border ${darkMode ? 'border-gray-600' : 'border-amber-200'}`}>
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {formData.hotel_name}
                </h3>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {formData.room_type}
                </p>
                {formData.rack_rate > 0 ? (
                  <p className={`text-sm font-medium mt-1 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    TBO Rate: ₹{formData.rack_rate.toLocaleString()}/night
                  </p>
                ) : (
                  <p className={`text-sm italic mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No TBO rate available - enter your negotiated rate below
                  </p>
                )}
              </div>

              {/* Room Block Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Negotiated Rate (₹/night) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.negotiated_rate}
                    onChange={(e) => setFormData({ ...formData, negotiated_rate: e.target.value })}
                    placeholder={formData.rack_rate > 0 ? `Suggested: ${formData.rack_rate}` : 'Enter negotiated rate'}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  />
                  {formData.rack_rate > 0 && formData.negotiated_rate && (
                    <p className={`text-xs mt-1 ${
                      parseFloat(formData.negotiated_rate) < formData.rack_rate
                        ? 'text-green-500'
                        : 'text-amber-500'
                    }`}>
                      {parseFloat(formData.negotiated_rate) < formData.rack_rate
                        ? `${Math.round((1 - parseFloat(formData.negotiated_rate) / formData.rack_rate) * 100)}% discount from TBO rate`
                        : 'Higher than TBO rate'
                      }
                    </p>
                  )}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Rooms to Block *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.total_rooms_blocked}
                    onChange={(e) => setFormData({ ...formData, total_rooms_blocked: e.target.value })}
                    placeholder="e.g., 30"
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Valid From *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Valid To *
                  </label>
                  <input
                    type="date"
                    required
                    min={formData.valid_from}
                    value={formData.valid_to}
                    onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Release Date
                  </label>
                  <input
                    type="date"
                    value={formData.release_date}
                    max={formData.valid_from}
                    onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Cutoff date for unsold rooms
                  </p>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Meal Plan
                  </label>
                  <select
                    value={formData.meal_plan}
                    onChange={(e) => setFormData({ ...formData, meal_plan: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                  >
                    {MEAL_PLANS.map(plan => (
                      <option key={plan.value} value={plan.value}>{plan.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Inclusions */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Inclusions
                </label>
                <div className="flex flex-wrap gap-2">
                  {INCLUSIONS_OPTIONS.map(inclusion => (
                    <button
                      key={inclusion}
                      type="button"
                      onClick={() => toggleInclusion(inclusion)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        formData.inclusions.includes(inclusion)
                          ? 'bg-amber-500 text-white'
                          : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {formData.inclusions.includes(inclusion) ? '✓ ' : ''}{inclusion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                    darkMode
                      ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Create Room Block
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EDIT ROOM BLOCK MODAL
// ============================================================

function EditRoomBlockModal({ darkMode, onClose, onSuccess, inventoryItem }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const MEAL_PLANS = [
    { value: 'EP', label: 'European Plan (Room Only)' },
    { value: 'CP', label: 'Continental Plan (Breakfast)' },
    { value: 'MAP', label: 'Modified American Plan (Breakfast + Dinner)' },
    { value: 'AP', label: 'American Plan (All Meals)' }
  ];

  const INCLUSIONS_OPTIONS = [
    'WiFi', 'Airport Transfer', 'Spa Access', 'Pool Access',
    'Gym Access', 'Parking', 'Late Checkout', 'Early Check-in'
  ];

  const [formData, setFormData] = useState({
    hotel_name: inventoryItem.hotel_name || inventoryItem.hotel || '',
    room_type: inventoryItem.room_type || inventoryItem.room || '',
    tbo_hotel_code: inventoryItem.tbo_hotel_code || '',
    rack_rate: inventoryItem.rack_rate || 0,
    negotiated_rate: inventoryItem.negotiated_rate || inventoryItem.rate || '',
    total_rooms_blocked: inventoryItem.total_rooms_blocked || inventoryItem.blocked || '',
    valid_from: inventoryItem.valid_from ? inventoryItem.valid_from.split('T')[0] : '',
    valid_to: inventoryItem.valid_to ? inventoryItem.valid_to.split('T')[0] : '',
    release_date: inventoryItem.release_date ? inventoryItem.release_date.split('T')[0] : '',
    meal_plan: inventoryItem.meal_plan || 'CP',
    inclusions: inventoryItem.inclusions || []
  });

  const toggleInclusion = (inclusion) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.includes(inclusion)
        ? prev.inclusions.filter(i => i !== inclusion)
        : [...prev.inclusions, inclusion]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!formData.negotiated_rate || formData.negotiated_rate <= 0) {
        throw new Error('Please enter a valid negotiated rate');
      }
      if (!formData.total_rooms_blocked || formData.total_rooms_blocked <= 0) {
        throw new Error('Please enter the number of rooms to block');
      }

      await inventoryAPI.update(inventoryItem.id, {
        hotel_name: formData.hotel_name,
        room_type: formData.room_type,
        total_rooms_blocked: parseInt(formData.total_rooms_blocked),
        negotiated_rate: parseFloat(formData.negotiated_rate),
        rack_rate: parseFloat(formData.rack_rate) || 0,
        valid_from: formData.valid_from,
        valid_to: formData.valid_to,
        release_date: formData.release_date || null,
        meal_plan: formData.meal_plan,
        inclusions: formData.inclusions
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update room block');
    } finally {
      setLoading(false);
    }
  };

  const profit = formData.rack_rate && formData.negotiated_rate
    ? formData.rack_rate - parseFloat(formData.negotiated_rate)
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
      <div className={`rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
        {/* Header */}
        <div className={`sticky top-0 px-6 py-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} z-10`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Edit Room Block
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Update room block details
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-1 rounded-lg ${darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
            >
              <Plus className="w-5 h-5 rotate-45" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Hotel Info */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-amber-50'} border ${darkMode ? 'border-gray-600' : 'border-amber-200'}`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Hotel Name
                </label>
                <input
                  type="text"
                  value={formData.hotel_name}
                  onChange={(e) => setFormData({ ...formData, hotel_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-200'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Room Type
                </label>
                <input
                  type="text"
                  value={formData.room_type}
                  onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'border-gray-200'
                  }`}
                />
              </div>
            </div>
            {formData.tbo_hotel_code && (
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                TBO Hotel Code: {formData.tbo_hotel_code}
              </p>
            )}
          </div>

          {/* Rates Section */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Rack Rate (TBO)
              </label>
              <input
                type="number"
                min="0"
                value={formData.rack_rate}
                onChange={(e) => setFormData({ ...formData, rack_rate: e.target.value })}
                placeholder="TBO rate"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Negotiated Rate *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.negotiated_rate}
                onChange={(e) => setFormData({ ...formData, negotiated_rate: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Profit/Room
              </label>
              <div className={`px-3 py-2 border rounded-lg text-sm ${
                darkMode ? 'bg-gray-600 border-gray-500' : 'bg-gray-50 border-gray-200'
              }`}>
                <span className={profit > 0 ? 'text-green-500 font-medium' : profit < 0 ? 'text-red-500 font-medium' : darkMode ? 'text-gray-400' : 'text-gray-500'}>
                  {profit > 0 ? '+' : ''}{profit.toLocaleString()}/night
                </span>
              </div>
            </div>
          </div>

          {/* Room Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Rooms Blocked *
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.total_rooms_blocked}
                onChange={(e) => setFormData({ ...formData, total_rooms_blocked: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                }`}
              />
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {inventoryItem.rooms_booked || 0} rooms already booked
              </p>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Meal Plan
              </label>
              <select
                value={formData.meal_plan}
                onChange={(e) => setFormData({ ...formData, meal_plan: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                }`}
              >
                {MEAL_PLANS.map(plan => (
                  <option key={plan.value} value={plan.value}>{plan.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Valid From *
              </label>
              <input
                type="date"
                required
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Valid To *
              </label>
              <input
                type="date"
                required
                value={formData.valid_to}
                min={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_to: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Release Date
              </label>
              <input
                type="date"
                value={formData.release_date}
                max={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                }`}
              />
            </div>
          </div>

          {/* Inclusions */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Inclusions
            </label>
            <div className="flex flex-wrap gap-2">
              {INCLUSIONS_OPTIONS.map(inclusion => (
                <button
                  key={inclusion}
                  type="button"
                  onClick={() => toggleInclusion(inclusion)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    formData.inclusions.includes(inclusion)
                      ? 'bg-amber-500 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {inclusion}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center disabled:opacity-50 transition-all btn-press hover:shadow-lg hover:shadow-amber-500/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// INVENTORY TAB
// ============================================================

function InventoryTab({ inventory, darkMode, eventId, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const handleSuccess = () => {
    if (onRefresh) onRefresh();
  };

  const handleEditClick = (item) => {
    setEditingItem(item);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Group Inventory</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center transition-all btn-press hover:shadow-lg hover:shadow-amber-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Room Block
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventory.map((item, index) => {
          const negotiatedRate = item.rate || item.negotiated_rate || 0;
          const rackRate = item.rack_rate || 0;
          const profit = rackRate > 0 ? rackRate - negotiatedRate : 0;
          const profitPercent = rackRate > 0 ? ((profit / rackRate) * 100).toFixed(1) : 0;

          return (
            <div
              key={item.id}
              onClick={() => handleEditClick(item)}
              className={`rounded-xl border p-5 cursor-pointer card-interactive animate-fadeIn ${
                darkMode
                  ? 'bg-gray-800 border-gray-700 hover:border-amber-500'
                  : 'bg-white border-gray-200 hover:border-amber-400 shadow-sm'
              }`}
              style={{ animationDelay: `${index * 0.05}s`, animationFillMode: 'both' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {item.hotel || item.hotel_name}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {item.room || item.room_type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    (item.available || item.rooms_available) <= 3
                      ? darkMode ? 'bg-red-900/50 text-red-400' : 'bg-red-100 text-red-700'
                      : darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-100 text-green-700'
                  }`}>
                    {item.available || item.rooms_available} left
                  </span>
                  <Edit className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Utilization</span>
                  <span className={`font-medium ${darkMode ? 'text-gray-200' : ''}`}>
                    {item.booked || item.rooms_booked || 0}/{item.blocked || item.total_rooms_blocked} rooms
                  </span>
                </div>
                <div className={`w-full rounded-full h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div
                    className="bg-amber-500 h-2 rounded-full"
                    style={{ width: `${((item.booked || item.rooms_booked || 0)/(item.blocked || item.total_rooms_blocked))*100}%` }}
                  />
                </div>
              </div>

              {/* Rates Section */}
              <div className={`p-3 rounded-lg mb-3 ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Rack Rate</span>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {rackRate > 0 ? `₹${rackRate.toLocaleString()}` : '-'}
                    </p>
                  </div>
                  <div>
                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Negotiated</span>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      ₹{negotiatedRate.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Profit</span>
                    <p className={`font-medium ${
                      profit > 0
                        ? 'text-green-500'
                        : profit < 0
                          ? 'text-red-500'
                          : darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {profit !== 0 ? (profit > 0 ? '+' : '') + `₹${profit.toLocaleString()}` : '-'}
                      {profit !== 0 && rackRate > 0 && (
                        <span className="text-xs ml-1">({profitPercent}%)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dates Section */}
              <div className={`p-2 rounded-lg mb-3 ${darkMode ? 'bg-gray-700/30' : 'bg-blue-50'}`}>
                <div className="flex justify-between text-xs">
                  <div>
                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Valid From</span>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {item.valid_from ? new Date(item.valid_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>Valid To</span>
                    <p className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {item.valid_to ? new Date(item.valid_to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <div>
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Meal:</span>
                  <span className={`font-medium ml-1 ${darkMode ? 'text-gray-200' : ''}`}>
                    {item.meal_plan || 'CP'}
                  </span>
                </div>
                {item.release_date && (
                  <div>
                    <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Release:</span>
                    <span className={`font-medium ml-1 ${darkMode ? 'text-gray-200' : ''}`}>
                      {new Date(item.release_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Room Block Modal */}
      {showAddModal && (
        <AddRoomBlockModal
          darkMode={darkMode}
          eventId={eventId}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* Edit Room Block Modal */}
      {editingItem && (
        <EditRoomBlockModal
          darkMode={darkMode}
          inventoryItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

function PaymentsTab({ stats, darkMode }) {
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);

  // Demo payment transactions
  const recentPayments = [
    { id: 1, guest: 'Mr. Amit Kumar', booking: 'SGW-001', amount: 84960, method: 'UPI', status: 'completed', date: '2026-02-01', txnId: 'UPI2026020112345' },
    { id: 2, guest: 'Mrs. Priya Sharma', booking: 'SGW-002', amount: 50000, method: 'Bank Transfer', status: 'completed', date: '2026-02-03', txnId: 'NEFT20260203001' },
    { id: 3, guest: 'Mr. Vikram Singh', booking: 'SGW-003', amount: 50000, method: 'Credit Card', status: 'completed', date: '2026-02-04', txnId: 'CC2026020456789' },
    { id: 4, guest: 'Dr. Meera Patel', booking: 'SGW-004', amount: 75000, method: 'UPI', status: 'completed', date: '2026-02-05', txnId: 'UPI2026020598765' },
    { id: 5, guest: 'Mrs. Sunita Sharma', booking: 'SGW-005', amount: 100000, method: 'Bank Transfer', status: 'completed', date: '2026-02-06', txnId: 'NEFT20260206002' },
    { id: 6, guest: 'Mr. Rahul Verma', booking: 'SGW-006', amount: 25000, method: 'UPI', status: 'pending', date: '2026-02-07', txnId: 'UPI2026020711111' },
  ];

  const pendingPayments = [
    { id: 1, guest: 'Mr. Vikram Singh', booking: 'SGW-003', due: 115200, dueDate: '2026-02-15', daysOverdue: 0, email: 'vikram.singh@email.com' },
    { id: 2, guest: 'Mrs. Sunita Sharma', booking: 'SGW-005', due: 69920, dueDate: '2026-02-18', daysOverdue: 0, email: 'sunita.sharma@email.com' },
    { id: 3, guest: 'Mr. Rahul Verma', booking: 'SGW-006', due: 59800, dueDate: '2026-02-10', daysOverdue: 0, email: 'rahul.verma@email.com' },
  ];

  // Export payment report as CSV
  const handleExportPaymentReport = () => {
    const allPayments = [
      ...recentPayments.map(p => ({ ...p, type: 'received' })),
      ...pendingPayments.map(p => ({
        id: p.id + 100,
        guest: p.guest,
        booking: p.booking,
        amount: p.due,
        method: '-',
        status: 'pending',
        date: p.dueDate,
        txnId: '-',
        type: 'pending'
      }))
    ];

    // Create Excel file using XML format (xlsx compatible)
    const headers = ['Guest Name', 'Booking Ref', 'Amount (₹)', 'Method', 'Status', 'Date', 'Transaction ID', 'Type'];

    // Excel XML format
    let excelContent = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="Header">
      <Font ss:Bold="1" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#F59E0B" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center"/>
    </Style>
    <Style ss:ID="Currency">
      <NumberFormat ss:Format="₹#,##0"/>
    </Style>
    <Style ss:ID="Completed">
      <Interior ss:Color="#D1FAE5" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="Pending">
      <Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Payment Report">
    <Table>
      <Column ss:Width="150"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="100"/>
      <Column ss:Width="80"/>
      <Column ss:Width="100"/>
      <Column ss:Width="150"/>
      <Column ss:Width="80"/>
      <Row>
        ${headers.map(h => `<Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>`).join('')}
      </Row>
      ${allPayments.map(p => `<Row>
        <Cell><Data ss:Type="String">${p.guest}</Data></Cell>
        <Cell><Data ss:Type="String">${p.booking}</Data></Cell>
        <Cell ss:StyleID="Currency"><Data ss:Type="Number">${p.amount}</Data></Cell>
        <Cell><Data ss:Type="String">${p.method}</Data></Cell>
        <Cell ss:StyleID="${p.status === 'completed' ? 'Completed' : 'Pending'}"><Data ss:Type="String">${p.status}</Data></Cell>
        <Cell><Data ss:Type="String">${p.date}</Data></Cell>
        <Cell><Data ss:Type="String">${p.txnId}</Data></Cell>
        <Cell><Data ss:Type="String">${p.type}</Data></Cell>
      </Row>`).join('')}
    </Table>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment_report_${new Date().toISOString().split('T')[0]}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert('Payment report exported to Excel successfully!');
  };

  const handleSendReminder = (payment) => {
    alert(`Payment reminder sent to ${payment.guest} (${payment.email}) for ₹${payment.due.toLocaleString()}`);
  };

  const handleSendAllReminders = () => {
    alert(`Payment reminders sent to ${pendingPayments.length} guests with pending payments!`);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-xl border p-5 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Booking Value</div>
              <div className={`text-2xl font-bold counter-animate ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹{(stats.totalValue/100000).toFixed(2)}L</div>
            </div>
            <DollarSign className="w-8 h-8 text-blue-500 transition-transform hover:scale-110" />
          </div>
        </div>
        <div className={`rounded-xl border p-5 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Collected</div>
              <div className={`text-2xl font-bold counter-animate ${darkMode ? 'text-green-400' : 'text-green-600'}`}>₹{(stats.collected/100000).toFixed(2)}L</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 transition-transform hover:scale-110" />
          </div>
        </div>
        <div className={`rounded-xl border p-5 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Pending</div>
              <div className={`text-2xl font-bold counter-animate ${darkMode ? 'text-red-400' : 'text-red-600'}`}>₹{(stats.pendingAmount/100000).toFixed(2)}L</div>
            </div>
            <Clock className="w-8 h-8 text-red-500 transition-transform hover:scale-110" />
          </div>
        </div>
        <div className={`rounded-xl border p-5 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Collection Rate</div>
              <div className={`text-2xl font-bold counter-animate ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{stats.collectionRate}%</div>
            </div>
            <Percent className="w-8 h-8 text-amber-500 transition-transform hover:scale-110" />
          </div>
        </div>
      </div>

      {/* Payment Actions */}
      <div className={`rounded-xl border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Payment Actions</h3>
        <div className="flex space-x-3">
          <button
            onClick={handleSendAllReminders}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center"
          >
            <Bell className="w-4 h-4 mr-2" />
            Send Payment Reminders ({pendingPayments.length})
          </button>
          <button
            onClick={handleExportPaymentReport}
            className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center ${
            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}>
            <Download className="w-4 h-4 mr-2" />
            Export Payment Report
          </button>
          <button
            onClick={() => setShowRecordPaymentModal(true)}
            className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center ${
            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}>
            <Plus className="w-4 h-4 mr-2" />
            Record Manual Payment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Recent Transactions</h3>
          </div>
          <div className="divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}">
            {recentPayments.map((payment) => (
              <div key={payment.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{payment.guest}</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {payment.booking} • {payment.method} • {payment.date}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>+₹{payment.amount.toLocaleString()}</div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    payment.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Payments */}
        <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Pending Payments</h3>
          </div>
          <div className="divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}">
            {pendingPayments.map((payment) => (
              <div key={payment.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{payment.guest}</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {payment.booking} • Due: {payment.dueDate}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>₹{payment.due.toLocaleString()}</div>
                  <button
                    onClick={() => handleSendReminder(payment)}
                    className="text-xs text-amber-500 hover:text-amber-600"
                  >
                    Send Reminder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className={`rounded-xl border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Payment Methods Breakdown</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>UPI</div>
            <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹1,84,960</div>
            <div className="text-xs text-green-500">45% of total</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Bank Transfer</div>
            <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹1,50,000</div>
            <div className="text-xs text-green-500">37% of total</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Credit Card</div>
            <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹50,000</div>
            <div className="text-xs text-green-500">12% of total</div>
          </div>
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cash</div>
            <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹25,000</div>
            <div className="text-xs text-green-500">6% of total</div>
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showRecordPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
          <div className={`rounded-xl max-w-md w-full modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Record Payment</h2>
              <button onClick={() => setShowRecordPaymentModal(false)} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Booking</label>
                <select className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}>
                  <option value="">Select a booking...</option>
                  {pendingPayments.map(p => (
                    <option key={p.id} value={p.booking}>{p.booking} - {p.guest} (₹{p.due.toLocaleString()} due)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Amount (₹)</label>
                <input type="number" placeholder="Enter amount" className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Payment Method</label>
                <select className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Transaction ID</label>
                <input type="text" placeholder="Enter transaction ID" className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Notes</label>
                <textarea rows={2} placeholder="Optional notes" className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`} />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button onClick={() => setShowRecordPaymentModal(false)} className={`px-4 py-2 border rounded-lg ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}>
                  Cancel
                </button>
                <button
                  onClick={() => { alert('Payment recorded successfully!'); setShowRecordPaymentModal(false); }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CommunicationsTab({ darkMode }) {
  const [showViewAllModal, setShowViewAllModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Demo communication data - Recent (shown in dashboard)
  const recentCommunications = [
    { id: 1, type: 'email', recipient: 'amit.kumar@email.com', subject: 'Booking Confirmation - SGW-001', status: 'delivered', date: '2026-02-01 10:30 AM', guest: 'Mr. Amit Kumar' },
    { id: 2, type: 'whatsapp', recipient: '+91 98765-43002', subject: 'Payment Reminder', status: 'read', date: '2026-02-03 02:15 PM', guest: 'Mrs. Priya Sharma' },
    { id: 3, type: 'sms', recipient: '+91 98765-43003', subject: 'Booking Update', status: 'delivered', date: '2026-02-04 11:00 AM', guest: 'Mr. Vikram Singh' },
    { id: 4, type: 'email', recipient: 'meera.patel@email.com', subject: 'Wedding Invitation', status: 'opened', date: '2026-02-05 09:45 AM', guest: 'Dr. Meera Patel' },
    { id: 5, type: 'whatsapp', recipient: '+91 98765-43006', subject: 'Room Details Shared', status: 'read', date: '2026-02-05 03:30 PM', guest: 'Mrs. Sunita Sharma' },
  ];

  // Full communication history (shown in View All modal)
  const allCommunications = [
    { id: 1, type: 'email', recipient: 'amit.kumar@email.com', subject: 'Booking Confirmation - SGW-001', status: 'delivered', date: '2026-02-01 10:30 AM', guest: 'Mr. Amit Kumar' },
    { id: 2, type: 'whatsapp', recipient: '+91 98765-43001', subject: 'Welcome Message', status: 'read', date: '2026-02-01 10:35 AM', guest: 'Mr. Amit Kumar' },
    { id: 3, type: 'email', recipient: 'priya.sharma@email.com', subject: 'Booking Confirmation - SGW-002', status: 'delivered', date: '2026-02-02 09:15 AM', guest: 'Mrs. Priya Sharma' },
    { id: 4, type: 'whatsapp', recipient: '+91 98765-43002', subject: 'Payment Reminder', status: 'read', date: '2026-02-03 02:15 PM', guest: 'Mrs. Priya Sharma' },
    { id: 5, type: 'sms', recipient: '+91 98765-43003', subject: 'Booking Update', status: 'delivered', date: '2026-02-04 11:00 AM', guest: 'Mr. Vikram Singh' },
    { id: 6, type: 'email', recipient: 'vikram.singh@email.com', subject: 'Booking Confirmation - SGW-003', status: 'opened', date: '2026-02-04 11:30 AM', guest: 'Mr. Vikram Singh' },
    { id: 7, type: 'email', recipient: 'meera.patel@email.com', subject: 'Wedding Invitation', status: 'opened', date: '2026-02-05 09:45 AM', guest: 'Dr. Meera Patel' },
    { id: 8, type: 'whatsapp', recipient: '+91 98765-43004', subject: 'RSVP Confirmation', status: 'read', date: '2026-02-05 10:00 AM', guest: 'Dr. Meera Patel' },
    { id: 9, type: 'whatsapp', recipient: '+91 98765-43006', subject: 'Room Details Shared', status: 'read', date: '2026-02-05 03:30 PM', guest: 'Mrs. Sunita Sharma' },
    { id: 10, type: 'email', recipient: 'sunita.sharma@email.com', subject: 'Booking Confirmation - SGW-005', status: 'delivered', date: '2026-02-05 04:00 PM', guest: 'Mrs. Sunita Sharma' },
    { id: 11, type: 'email', recipient: 'rahul.verma@email.com', subject: 'Payment Pending Reminder', status: 'delivered', date: '2026-02-06 10:00 AM', guest: 'Mr. Rahul Verma' },
    { id: 12, type: 'sms', recipient: '+91 98765-43007', subject: 'Payment Due Alert', status: 'delivered', date: '2026-02-06 02:00 PM', guest: 'Mr. Rahul Verma' },
    { id: 13, type: 'email', recipient: 'arjun.reddy@email.com', subject: 'Booking Confirmation - SGW-007', status: 'opened', date: '2026-02-06 04:30 PM', guest: 'Mr. Arjun Reddy' },
    { id: 14, type: 'whatsapp', recipient: '+91 98765-43008', subject: 'Hotel Location Shared', status: 'read', date: '2026-02-06 05:00 PM', guest: 'Mr. Arjun Reddy' },
    { id: 15, type: 'sms', recipient: '+91 98765-43008', subject: 'Check-in Reminder', status: 'delivered', date: '2026-02-07 08:00 AM', guest: 'Mr. Arjun Reddy' },
    { id: 16, type: 'email', recipient: 'neha.gupta@email.com', subject: 'Wedding Invitation', status: 'opened', date: '2026-02-07 09:00 AM', guest: 'Ms. Neha Gupta' },
    { id: 17, type: 'whatsapp', recipient: '+91 98765-43009', subject: 'RSVP Request', status: 'read', date: '2026-02-07 09:30 AM', guest: 'Ms. Neha Gupta' },
    { id: 18, type: 'email', recipient: 'raj.malhotra@email.com', subject: 'Booking Confirmation - SGW-009', status: 'delivered', date: '2026-02-07 10:15 AM', guest: 'Mr. Raj Malhotra' },
    { id: 19, type: 'sms', recipient: '+91 98765-43010', subject: 'Welcome to Wedding', status: 'delivered', date: '2026-02-07 11:00 AM', guest: 'Mr. Raj Malhotra' },
    { id: 20, type: 'email', recipient: 'all-guests@event.com', subject: 'Event Schedule Update', status: 'sent', date: '2026-02-07 12:00 PM', guest: 'All Guests (45)' },
    { id: 21, type: 'whatsapp', recipient: 'broadcast-list', subject: 'Venue Map & Directions', status: 'sent', date: '2026-02-07 01:00 PM', guest: 'All Guests (45)' },
    { id: 22, type: 'email', recipient: 'kavita.joshi@email.com', subject: 'Booking Confirmation - SGW-011', status: 'delivered', date: '2026-02-07 02:30 PM', guest: 'Mrs. Kavita Joshi' },
    { id: 23, type: 'whatsapp', recipient: '+91 98765-43012', subject: 'Payment Received - Thank You', status: 'read', date: '2026-02-07 03:00 PM', guest: 'Mrs. Kavita Joshi' },
    { id: 24, type: 'email', recipient: 'sanjay.patel@email.com', subject: 'Wedding Invitation', status: 'opened', date: '2026-02-07 03:30 PM', guest: 'Mr. Sanjay Patel' },
    { id: 25, type: 'sms', recipient: '+91 98765-43013', subject: 'RSVP Reminder', status: 'delivered', date: '2026-02-07 04:00 PM', guest: 'Mr. Sanjay Patel' },
  ];

  const templates = [
    { id: 1, name: 'Booking Confirmation', type: 'email', lastUsed: '2026-02-06', subject: 'Your Booking is Confirmed - {{event_name}}', content: 'Dear {{guest_name}},\n\nYour booking has been confirmed!\n\nBooking Reference: {{booking_ref}}\nHotel: {{hotel_name}}\nRoom Type: {{room_type}}\nCheck-in: {{check_in_date}}\nCheck-out: {{check_out_date}}\n\nTotal Amount: ₹{{total_amount}}\n\nWe look forward to hosting you!\n\nBest regards,\nEvent Team' },
    { id: 2, name: 'Payment Reminder', type: 'email', lastUsed: '2026-02-05', subject: 'Payment Reminder - {{booking_ref}}', content: 'Dear {{guest_name}},\n\nThis is a friendly reminder that your payment of ₹{{pending_amount}} is pending for your booking.\n\nBooking Reference: {{booking_ref}}\nDue Date: {{due_date}}\n\nPlease complete the payment at your earliest convenience.\n\nPayment Options:\n- UPI: events@upi\n- Bank Transfer: Account details attached\n\nThank you!\n\nBest regards,\nEvent Team' },
    { id: 3, name: 'Event Invitation', type: 'email', lastUsed: '2026-02-04', subject: 'You are Invited! - {{event_name}}', content: 'Dear {{guest_name}},\n\nWe are delighted to invite you to {{event_name}}!\n\nEvent Details:\nDate: {{event_date}}\nVenue: {{venue}}\n\nPlease RSVP and book your accommodation through our booking portal.\n\nWe can\'t wait to celebrate with you!\n\nWarm regards,\n{{host_name}}' },
    { id: 4, name: 'Check-in Details', type: 'whatsapp', lastUsed: '2026-02-03', subject: 'Check-in Information', content: 'Hi {{guest_name}}! 🎉\n\nHere are your check-in details:\n\n🏨 Hotel: {{hotel_name}}\n📅 Check-in: {{check_in_date}}\n🔑 Room: {{room_type}}\n\nHotel Address: {{hotel_address}}\nContact: {{hotel_phone}}\n\nSee you soon!' },
    { id: 5, name: 'Quick Update', type: 'sms', lastUsed: '2026-02-02', subject: 'Event Update', content: 'Hi {{guest_name}}, reminder: {{event_name}} on {{event_date}} at {{venue}}. Contact us for any queries. See you there!' },
  ];

  const stats = {
    emailsSent: 89,
    emailsOpened: 72,
    smsSent: 45,
    whatsappSent: 67,
    whatsappRead: 61
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'email': return <Mail className="w-4 h-4" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4" />;
      case 'sms': return <Phone className="w-4 h-4" />;
      default: return <Mail className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'delivered': return 'bg-blue-100 text-blue-700';
      case 'opened': return 'bg-green-100 text-green-700';
      case 'read': return 'bg-green-100 text-green-700';
      case 'sent': return 'bg-gray-100 text-gray-700';
      case 'failed': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className={`rounded-xl border p-4 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Emails Sent</div>
              <div className={`text-2xl font-bold counter-animate ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.emailsSent}</div>
            </div>
            <Mail className="w-8 h-8 text-blue-500 transition-transform hover:scale-110" />
          </div>
        </div>
        <div className={`rounded-xl border p-4 hover-lift ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Emails Opened</div>
              <div className={`text-2xl font-bold text-green-500 counter-animate`}>{stats.emailsOpened}</div>
              <div className="text-xs text-green-500">{Math.round(stats.emailsOpened/stats.emailsSent*100)}% open rate</div>
            </div>
            <Eye className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className={`rounded-xl border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SMS Sent</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.smsSent}</div>
            </div>
            <Phone className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className={`rounded-xl border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>WhatsApp Sent</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{stats.whatsappSent}</div>
            </div>
            <MessageSquare className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className={`rounded-xl border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>WhatsApp Read</div>
              <div className={`text-2xl font-bold text-green-500`}>{stats.whatsappRead}</div>
              <div className="text-xs text-green-500">{Math.round(stats.whatsappRead/stats.whatsappSent*100)}% read rate</div>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={`rounded-xl border p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Quick Actions</h3>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center">
            <Send className="w-4 h-4 mr-2" />
            Send Bulk Email
          </button>
          <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            Send WhatsApp Blast
          </button>
          <button className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center ${
            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}>
            <Phone className="w-4 h-4 mr-2" />
            Send SMS
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            className={`px-4 py-2 border rounded-lg text-sm font-medium flex items-center ${
            darkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}>
            <FileText className="w-4 h-4 mr-2" />
            Manage Templates
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Communications */}
        <div className={`col-span-2 rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Recent Communications</h3>
            <button
              onClick={() => setShowViewAllModal(true)}
              className="text-sm text-amber-500 hover:text-amber-600"
            >
              View All
            </button>
          </div>
          <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {recentCommunications.map((comm) => (
              <div key={comm.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    comm.type === 'email' ? 'bg-blue-100 text-blue-600' :
                    comm.type === 'whatsapp' ? 'bg-green-100 text-green-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    {getTypeIcon(comm.type)}
                  </div>
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{comm.subject}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      To: {comm.guest} • {comm.date}
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(comm.status)}`}>
                  {comm.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Templates */}
        <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Message Templates</h3>
          </div>
          <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
            {templates.map((template) => (
              <div key={template.id} className="px-6 py-3 flex items-center justify-between">
                <div
                  className="cursor-pointer flex-1"
                  onClick={() => { setSelectedTemplate(template); setShowTemplateModal(true); }}
                >
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{template.name}</div>
                  <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {template.type.toUpperCase()} • Last used: {template.lastUsed}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => { setEditingTemplate(template); setShowCreateTemplateModal(true); }}
                    className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    <Edit className="w-4 h-4 text-blue-500" />
                  </button>
                  <button
                    onClick={() => alert(`Sending "${template.name}" template to all guests...`)}
                    className="text-amber-500 hover:text-amber-600"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className={`px-6 py-3 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={() => { setEditingTemplate(null); setShowCreateTemplateModal(true); }}
              className={`w-full py-2 border border-dashed rounded-lg text-sm ${
              darkMode ? 'border-gray-600 text-gray-400 hover:border-gray-500' : 'border-gray-300 text-gray-500 hover:border-gray-400'
            }`}>
              + Create New Template
            </button>
          </div>
        </div>
      </div>

      {/* View All Communications Modal */}
      {showViewAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
          <div className={`rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>All Communications ({allCommunications.length})</h2>
              <button onClick={() => setShowViewAllModal(false)} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Type</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Subject</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Recipient</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Date</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {allCommunications.map((comm) => (
                    <tr key={comm.id} className={darkMode ? 'hover:bg-gray-750' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          comm.type === 'email' ? 'bg-blue-100 text-blue-600' :
                          comm.type === 'whatsapp' ? 'bg-green-100 text-green-600' :
                          'bg-purple-100 text-purple-600'
                        }`}>
                          {getTypeIcon(comm.type)}
                        </div>
                      </td>
                      <td className={`px-4 py-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>{comm.subject}</td>
                      <td className={`px-4 py-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        <div>{comm.guest}</div>
                        <div className="text-xs">{comm.recipient}</div>
                      </td>
                      <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{comm.date}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(comm.status)}`}>
                          {comm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Template Preview/Use Modal */}
      {showTemplateModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
          <div className={`rounded-xl max-w-2xl w-full modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div>
                <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedTemplate.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedTemplate.type === 'email' ? 'bg-blue-100 text-blue-700' :
                  selectedTemplate.type === 'whatsapp' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {selectedTemplate.type.toUpperCase()}
                </span>
              </div>
              <button onClick={() => { setShowTemplateModal(false); setSelectedTemplate(null); }} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject</label>
                <div className={`px-3 py-2 rounded-lg ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                  {selectedTemplate.subject}
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Message Content</label>
                <div className={`px-3 py-2 rounded-lg whitespace-pre-wrap text-sm ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
                  {selectedTemplate.content}
                </div>
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-amber-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-amber-700'}`}>
                  <strong>Available Variables:</strong> {"{{guest_name}}, {{booking_ref}}, {{hotel_name}}, {{room_type}}, {{check_in_date}}, {{check_out_date}}, {{total_amount}}, {{pending_amount}}, {{event_name}}, {{event_date}}, {{venue}}"}
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => { setShowTemplateModal(false); setSelectedTemplate(null); }}
                  className={`px-4 py-2 border rounded-lg ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}
                >
                  Close
                </button>
                <button
                  onClick={() => { setEditingTemplate(selectedTemplate); setShowTemplateModal(false); setSelectedTemplate(null); setShowCreateTemplateModal(true); }}
                  className={`px-4 py-2 border rounded-lg flex items-center ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Template
                </button>
                <button
                  onClick={() => { alert(`Template "${selectedTemplate.name}" sent to all guests!`); setShowTemplateModal(false); setSelectedTemplate(null); }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium flex items-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send to All Guests
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Template Modal */}
      {showCreateTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
          <div className={`rounded-xl max-w-2xl w-full modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
            <div className={`px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>
              <button onClick={() => { setShowCreateTemplateModal(false); setEditingTemplate(null); }} className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Template Name</label>
                  <input
                    type="text"
                    defaultValue={editingTemplate?.name || ''}
                    placeholder="e.g., Payment Reminder"
                    className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Channel</label>
                  <select
                    defaultValue={editingTemplate?.type || 'all'}
                    className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                  >
                    <option value="all">All Channels</option>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Subject Line</label>
                <input
                  type="text"
                  defaultValue={editingTemplate?.subject || ''}
                  placeholder="e.g., Your Booking is Confirmed - {{event_name}}"
                  className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Message Content</label>
                <textarea
                  rows={8}
                  defaultValue={editingTemplate?.content || ''}
                  placeholder="Enter your message here. Use {{variable}} for dynamic content."
                  className={`w-full px-3 py-2 border rounded-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200'}`}
                />
              </div>
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-blue-700'}`}>
                  <strong>Available Variables:</strong> {"{{guest_name}}, {{booking_ref}}, {{hotel_name}}, {{room_type}}, {{check_in_date}}, {{check_out_date}}, {{total_amount}}, {{pending_amount}}, {{event_name}}, {{event_date}}, {{venue}}, {{host_name}}"}
                </p>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => { setShowCreateTemplateModal(false); setEditingTemplate(null); }}
                  className={`px-4 py-2 border rounded-lg ${darkMode ? 'border-gray-600 text-gray-300' : 'border-gray-200 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { alert(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!'); setShowCreateTemplateModal(false); setEditingTemplate(null); }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium"
                >
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// AUDIT LOGS TAB
// ============================================================

function AuditLogsTab({ darkMode, eventId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    entity_type: 'all',
    action: 'all',
    search: ''
  });
  const [summary, setSummary] = useState(null);

  const API_BASE = API_BASE_URL;

  useEffect(() => {
    fetchAuditLogs();
    fetchSummary();
  }, [eventId]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (eventId) params.append('event_id', eventId);
      if (filters.entity_type !== 'all') params.append('entity_type', filters.entity_type);
      if (filters.action !== 'all') params.append('action', filters.action);
      params.append('limit', '100');

      const response = await fetch(`${API_BASE}/audit?${params}`);
      const data = await response.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/audit/summary/${eventId}`);
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch audit summary:', err);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [filters.entity_type, filters.action]);

  const getActionBadge = (action) => {
    const badges = {
      CREATE: { bg: 'bg-green-100 text-green-800', darkBg: 'bg-green-900/30 text-green-400', label: 'Created' },
      UPDATE: { bg: 'bg-blue-100 text-blue-800', darkBg: 'bg-blue-900/30 text-blue-400', label: 'Updated' },
      DELETE: { bg: 'bg-red-100 text-red-800', darkBg: 'bg-red-900/30 text-red-400', label: 'Deleted' },
      STATUS_CHANGE: { bg: 'bg-purple-100 text-purple-800', darkBg: 'bg-purple-900/30 text-purple-400', label: 'Status Changed' },
      PAYMENT: { bg: 'bg-amber-100 text-amber-800', darkBg: 'bg-amber-900/30 text-amber-400', label: 'Payment' },
      CANCELLATION: { bg: 'bg-red-100 text-red-800', darkBg: 'bg-red-900/30 text-red-400', label: 'Cancelled' },
      CONFIRMATION: { bg: 'bg-green-100 text-green-800', darkBg: 'bg-green-900/30 text-green-400', label: 'Confirmed' }
    };
    const badge = badges[action] || { bg: 'bg-gray-100 text-gray-800', darkBg: 'bg-gray-700 text-gray-300', label: action };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${darkMode ? badge.darkBg : badge.bg}`}>
        {badge.label}
      </span>
    );
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'booking': return <FileSpreadsheet className="w-4 h-4" />;
      case 'guest': return <Users className="w-4 h-4" />;
      case 'inventory': return <Hotel className="w-4 h-4" />;
      case 'payment': return <CreditCard className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatChanges = (changes) => {
    if (!changes || Object.keys(changes).length === 0) return null;
    return Object.entries(changes).map(([field, change]) => (
      <div key={field} className="text-xs mt-1">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{field}: </span>
        <span className={darkMode ? 'text-red-400' : 'text-red-600'}>{String(change.old)}</span>
        <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}> → </span>
        <span className={darkMode ? 'text-green-400' : 'text-green-600'}>{String(change.new)}</span>
      </div>
    ));
  };

  const filteredLogs = logs.filter(log => {
    if (!filters.search) return true;
    const search = filters.search.toLowerCase();
    return (
      log.notes?.toLowerCase().includes(search) ||
      log.entity_type?.toLowerCase().includes(search) ||
      log.performed_by?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className={`w-8 h-8 animate-spin ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-4 gap-4">
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{summary.total_logs}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Events</div>
          </div>
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-2xl font-bold text-green-500`}>{summary.by_action?.CREATE || 0}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Created</div>
          </div>
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-2xl font-bold text-blue-500`}>{summary.by_action?.UPDATE || 0}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Updated</div>
          </div>
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <div className={`text-2xl font-bold text-amber-500`}>{summary.by_action?.PAYMENT || 0}</div>
            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Payments</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`rounded-xl border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Filters:</span>
          </div>

          <select
            value={filters.entity_type}
            onChange={(e) => setFilters(f => ({ ...f, entity_type: e.target.value }))}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">All Entities</option>
            <option value="booking">Bookings</option>
            <option value="guest">Guests</option>
            <option value="inventory">Inventory</option>
            <option value="payment">Payments</option>
          </select>

          <select
            value={filters.action}
            onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}
            className={`px-3 py-1.5 rounded-lg border text-sm ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
            }`}
          >
            <option value="all">All Actions</option>
            <option value="CREATE">Created</option>
            <option value="UPDATE">Updated</option>
            <option value="DELETE">Deleted</option>
            <option value="STATUS_CHANGE">Status Change</option>
            <option value="PAYMENT">Payment</option>
          </select>

          <div className="flex-1 max-w-xs">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search logs..."
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-sm ${
                  darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'
                }`}
              />
            </div>
          </div>

          <button
            onClick={() => { fetchAuditLogs(); fetchSummary(); }}
            className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className={`rounded-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Activity Timeline
          </h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {filteredLogs.length} events found
          </p>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-red-400' : 'text-red-500'}`} />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>{error}</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <History className={`w-12 h-12 mx-auto mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-300'}`} />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-500'}>No audit logs found</p>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Activity will appear here as changes are made
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`px-6 py-4 hover:${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'} transition-colors`}
              >
                <div className="flex items-start gap-4">
                  {/* Entity Icon */}
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    {getEntityIcon(log.entity_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getActionBadge(log.action)}
                      <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {log.entity_type.charAt(0).toUpperCase() + log.entity_type.slice(1)}
                      </span>
                    </div>

                    {log.notes && (
                      <p className={`text-sm mt-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {log.notes}
                      </p>
                    )}

                    {/* Changes */}
                    {log.changes && Object.keys(log.changes).length > 0 && (
                      <div className={`mt-2 p-2 rounded ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                        {formatChanges(log.changes)}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className={`flex items-center gap-4 mt-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {log.performed_by || 'system'}
                      </span>
                      {log.booking_id && (
                        <span className="truncate max-w-[200px]" title={log.booking_id}>
                          ID: {log.booking_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className={`text-right text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {new Date(log.timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// ADD BOOKING MODAL
// ============================================================

function AddBookingModal({ darkMode, onClose, onSuccess, eventId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [phoneCountry, setPhoneCountry] = useState('IN');

  // Get current date in YYYY-MM-DD format
  const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  // Get tomorrow's date for default checkout
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    check_in_date: getTodayDate(),
    check_out_date: getTomorrowDate(),
    inventory_id: '',
    room_type: '',
    rate_per_night: '',
    num_rooms: 1,
    num_adults: 2,
    num_children: 0,
    source: 'Microsite',
    category: 'Friend',
    side: 'Groom',
    special_requests: ''
  });

  // Fetch inventory on mount or when eventId changes
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const data = await inventoryAPI.getEventInventory(eventId);
        setInventory(data);
      } catch (err) {
        console.error('Failed to fetch inventory:', err);
      }
    };
    fetchInventory();
  }, [eventId]);

  // Email validation with domain check API
  const validateEmailWithAPI = async (email) => {
    console.log('🔍 Email validation started for:', email);

    if (!email) {
      console.log('⏭️ Email is empty, skipping validation');
      return { valid: true }; // Email is optional
    }

    // Basic format check first
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Email failed format check');
      return { valid: false, error: 'Invalid email format (e.g., guest@email.com)' };
    }

    console.log('✅ Email format valid, calling validation API via backend...');

    // Check domain existence using backend proxy (avoids CORS)
    try {
      const API_BASE = API_BASE_URL;
      const response = await fetch(`${API_BASE}/validation/email?email=${encodeURIComponent(email)}`);

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        console.warn('⚠️ Email validation API error, falling back to format check');
        return { valid: true }; // Fallback to basic validation
      }

      const data = await response.json();
      console.log('📦 API Response data:', data);

      // Check if using fallback
      if (data.fallback) {
        console.log('⚠️ Using fallback validation');
        return { valid: true };
      }

      // Check if email is deliverable
      if (!data.valid) {
        console.log('❌ Email marked as invalid:', data.status);
        // Check if there's a suggestion
        if (data.did_you_mean) {
          return {
            valid: false,
            error: `Email may be invalid. Did you mean ${data.did_you_mean}?`
          };
        }

        // Provide specific error messages
        if (data.status === 'INVALID_DOMAIN') {
          return {
            valid: false,
            error: 'Email domain does not exist'
          };
        } else if (data.status === 'INVALID_MAILBOX') {
          return {
            valid: false,
            error: 'Mailbox does not exist'
          };
        } else if (data.is_disposable) {
          return {
            valid: false,
            error: 'Disposable email addresses are not allowed'
          };
        }

        return {
          valid: false,
          error: 'Email is invalid or cannot be verified'
        };
      }

      console.log('✅ Email validation passed!');
      return { valid: true };
    } catch (error) {
      console.error('❌ Email validation API error:', error);
      return { valid: true }; // Fallback to basic validation on error
    }
  };

  // Phone validation using libphonenumber
  const validatePhone = (phone, country) => {
    if (!phone) return true; // Phone is optional

    // Remove negative signs if accidentally entered
    const cleanPhone = phone.replace(/-/g, '').trim();

    // Check for negative numbers
    if (cleanPhone.includes('-') || parseFloat(cleanPhone) < 0) {
      return false;
    }

    try {
      // Validate using libphonenumber
      return isValidPhoneNumber(cleanPhone, country);
    } catch (error) {
      return false;
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (phone, country) => {
    if (!phone) return '';

    try {
      const phoneNumber = parsePhoneNumber(phone, country);
      if (phoneNumber) {
        return phoneNumber.formatInternational();
      }
    } catch (error) {
      // Return the input as-is if parsing fails
    }
    return phone;
  };

  // Handle phone input with formatting
  const handlePhoneChange = (e) => {
    let value = e.target.value;

    // Prevent negative numbers
    value = value.replace(/^-+/, ''); // Remove leading negatives
    value = value.replace(/(?!^\+)\-/g, ''); // Remove negatives except after +

    setFormData(prev => ({ ...prev, guest_phone: value }));

    // Clear validation error when user types
    if (validationErrors.guest_phone) {
      setValidationErrors(prev => ({ ...prev, guest_phone: undefined }));
    }
  };

  // Validate form fields
  const validateForm = async () => {
    const errors = {};

    if (!formData.guest_name.trim()) {
      errors.guest_name = 'Guest name is required';
    }

    // Validate email with API
    if (formData.guest_email) {
      const emailValidation = await validateEmailWithAPI(formData.guest_email);
      if (!emailValidation.valid) {
        errors.guest_email = emailValidation.error;
      }
    }

    if (formData.guest_phone && !validatePhone(formData.guest_phone, phoneCountry)) {
      const countryName = phoneCountry === 'IN' ? 'India' : phoneCountry === 'US' ? 'USA' : phoneCountry === 'GB' ? 'UK' : phoneCountry;
      errors.guest_phone = `Invalid phone number for ${countryName}`;
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkIn < today) {
        errors.check_in_date = 'Check-in date cannot be in the past';
      }

      if (checkOut <= checkIn) {
        errors.check_out_date = 'Check-out must be after check-in date';
      }
    }

    if (!formData.inventory_id) {
      errors.inventory_id = 'Please select a room type';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInventoryChange = (inventoryId) => {
    const selected = inventory.find(inv => inv.id === inventoryId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        inventory_id: inventoryId,
        room_type: selected.room_type,
        rate_per_night: selected.negotiated_rate
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Show validating message
    setError('Validating email...');

    // Validate form (now async for email API check)
    const isValid = await validateForm();
    if (!isValid) {
      setError('Please fix the validation errors below');
      return;
    }

    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      await bookingsAPI.createBooking({
        ...formData,
        event_id: eventId,
        rate_per_night: parseFloat(formData.rate_per_night),
        num_rooms: parseInt(formData.num_rooms),
        num_adults: parseInt(formData.num_adults),
        num_children: parseInt(formData.num_children)
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create booking:', err);
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
      <div className={`rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
        {/* Modal Header */}
        <div className={`sticky top-0 px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Add New Booking</h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg ${darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Guest Information */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Guest Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Guest Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.guest_name}
                  onChange={(e) => {
                    setFormData({ ...formData, guest_name: e.target.value });
                    if (validationErrors.guest_name) {
                      setValidationErrors({ ...validationErrors, guest_name: null });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    validationErrors.guest_name
                      ? 'border-red-500'
                      : darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                  placeholder="e.g., Mr. John Doe"
                />
                {validationErrors.guest_name && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.guest_name}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.guest_email}
                  onChange={(e) => {
                    setFormData({ ...formData, guest_email: e.target.value });
                    if (validationErrors.guest_email) {
                      setValidationErrors({ ...validationErrors, guest_email: null });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    validationErrors.guest_email
                      ? 'border-red-500'
                      : darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                  placeholder="guest@email.com"
                />
                {validationErrors.guest_email && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.guest_email}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phone Number
                </label>
                <div className="flex gap-2">
                  <CountrySelector
                    value={phoneCountry}
                    onChange={(countryCode) => {
                      setPhoneCountry(countryCode);
                      // Clear validation error when country changes
                      if (validationErrors.guest_phone) {
                        setValidationErrors({ ...validationErrors, guest_phone: null });
                      }
                    }}
                    darkMode={darkMode}
                  />
                  <input
                    type="tel"
                    value={formData.guest_phone}
                    onChange={handlePhoneChange}
                    className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                      validationErrors.guest_phone
                        ? 'border-red-500'
                        : darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                    }`}
                    placeholder={phoneCountry === 'IN' ? '9876543210' : phoneCountry === 'US' ? '(555) 123-4567' : 'Phone number'}
                  />
                </div>
                {validationErrors.guest_phone && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.guest_phone}</p>
                )}
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Enter number without country code (e.g., {phoneCountry === 'IN' ? '9876543210' : phoneCountry === 'US' ? '5551234567' : 'local number'})
                </p>
              </div>
            </div>
          </div>

          {/* Room Selection */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Room Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Hotel & Room Type *
                </label>
                <select
                  required
                  value={formData.inventory_id}
                  onChange={(e) => {
                    handleInventoryChange(e.target.value);
                    if (validationErrors.inventory_id) {
                      setValidationErrors({ ...validationErrors, inventory_id: null });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    validationErrors.inventory_id
                      ? 'border-red-500'
                      : darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                >
                  <option value="">Select room type</option>
                  {inventory.map(inv => (
                    <option key={inv.id} value={inv.id}>
                      {inv.hotel_name} - {inv.room_type} (₹{inv.negotiated_rate}/night) - {inv.rooms_available} available
                    </option>
                  ))}
                </select>
                {validationErrors.inventory_id && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.inventory_id}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Check-in Date *
                </label>
                <input
                  type="date"
                  required
                  min={getTodayDate()}
                  value={formData.check_in_date}
                  onChange={(e) => {
                    setFormData({ ...formData, check_in_date: e.target.value });
                    if (validationErrors.check_in_date) {
                      setValidationErrors({ ...validationErrors, check_in_date: null });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    validationErrors.check_in_date
                      ? 'border-red-500'
                      : darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                />
                {validationErrors.check_in_date && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.check_in_date}</p>
                )}
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Check-out Date *
                </label>
                <input
                  type="date"
                  required
                  min={formData.check_in_date || getTodayDate()}
                  value={formData.check_out_date}
                  onChange={(e) => {
                    setFormData({ ...formData, check_out_date: e.target.value });
                    if (validationErrors.check_out_date) {
                      setValidationErrors({ ...validationErrors, check_out_date: null });
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    validationErrors.check_out_date
                      ? 'border-red-500'
                      : darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                />
                {validationErrors.check_out_date && (
                  <p className="text-xs text-red-500 mt-1">{validationErrors.check_out_date}</p>
                )}
              </div>
            </div>
          </div>

          {/* Occupancy */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Occupancy</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rooms *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.num_rooms}
                  onChange={(e) => setFormData({ ...formData, num_rooms: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Adults *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.num_adults}
                  onChange={(e) => setFormData({ ...formData, num_adults: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Children
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.num_children}
                  onChange={(e) => setFormData({ ...formData, num_children: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Additional Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Source
                </label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                >
                  <option value="Microsite">Microsite</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="Agent">Agent</option>
                  <option value="Phone">Phone</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                >
                  <option value="Family">Family</option>
                  <option value="Friend">Friend</option>
                  <option value="Colleague">Colleague</option>
                  <option value="VIP">VIP</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Side
                </label>
                <select
                  value={formData.side}
                  onChange={(e) => setFormData({ ...formData, side: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                >
                  <option value="Bride">Bride</option>
                  <option value="Groom">Groom</option>
                </select>
              </div>
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Special Requests
            </label>
            <textarea
              value={formData.special_requests}
              onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
              }`}
              placeholder="Any special requests or dietary requirements..."
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                darkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// VIEW BOOKING MODAL
// ============================================================

function ViewBookingModal({ darkMode, booking, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
      <div className={`rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
        {/* Header */}
        <div className={`sticky top-0 px-6 py-4 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} z-10`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Booking Details
              </h2>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Reference: {booking.ref}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badges */}
          <div className="flex items-center gap-3">
            <StatusBadge status={booking.status} darkMode={darkMode} />
            <PaymentBadge status={booking.paymentStatus} darkMode={darkMode} />
          </div>

          {/* Guest Information */}
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Guest Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Name</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.guest}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.email || 'N/A'}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.phone || 'N/A'}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Booking Source</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.source}</p>
              </div>
              {booking.category && (
                <div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Category</p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.category}</p>
                </div>
              )}
              {booking.side && (
                <div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Side</p>
                  <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.side}</p>
                </div>
              )}
            </div>
          </div>

          {/* Accommodation Details */}
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Accommodation Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Hotel</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.hotel}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Room Type</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.room}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Check-in</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.checkIn}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Check-out</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.checkOut}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Nights</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.nights}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Rooms</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.rooms}</p>
              </div>
            </div>
          </div>

          {/* Guest Count */}
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Guest Count
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Adults</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.adults}</p>
              </div>
              <div>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Children</p>
                <p className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{booking.children}</p>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Payment Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Amount</span>
                <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>₹{booking.total?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Paid</span>
                <span className={`text-sm font-semibold text-green-500`}>₹{booking.paid?.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between items-center pt-3 border-t ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                <span className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Due</span>
                <span className={`text-sm font-semibold ${booking.due > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  ₹{booking.due?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Dietary Requirements */}
          {booking.dietary && booking.dietary.length > 0 && (
            <div className={`rounded-lg p-4 ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Dietary Requirements
              </h3>
              <div className="flex flex-wrap gap-2">
                {booking.dietary.map((req, idx) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      darkMode ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {req}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`sticky bottom-0 px-6 py-4 border-t ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`w-full px-4 py-2 rounded-lg text-sm font-medium ${
              darkMode ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EDIT BOOKING MODAL
// ============================================================

function EditBookingModal({ darkMode, booking, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [phoneCountry, setPhoneCountry] = useState('IN');

  // Parse dates from booking
  const parseDate = (dateStr) => {
    if (!dateStr) return '';
    // Handle various date formats
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const [formData, setFormData] = useState({
    guest_name: booking.guest || '',
    guest_email: booking.email || '',
    guest_phone: booking.phone || '',
    num_rooms: booking.rooms || 1,
    num_adults: booking.adults || 2,
    num_children: booking.children || 0,
    status: booking.status || 'pending',
    payment_status: booking.paymentStatus || 'pending'
  });

  // Email validation
  const validateEmail = (email) => {
    if (!email) return true;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Phone validation using libphonenumber
  const validatePhone = (phone, country) => {
    if (!phone) return true;

    // Remove negative signs
    const cleanPhone = phone.replace(/-/g, '').trim();

    // Check for negative numbers
    if (cleanPhone.includes('-') || parseFloat(cleanPhone) < 0) {
      return false;
    }

    try {
      return isValidPhoneNumber(cleanPhone, country);
    } catch (error) {
      return false;
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!formData.guest_name.trim()) {
      errors.guest_name = 'Guest name is required';
    }

    if (formData.guest_email && !validateEmail(formData.guest_email)) {
      errors.guest_email = 'Invalid email format';
    }

    if (formData.guest_phone && !validatePhone(formData.guest_phone, phoneCountry)) {
      const countryName = phoneCountry === 'IN' ? 'India' : phoneCountry === 'US' ? 'USA' : phoneCountry === 'GB' ? 'UK' : phoneCountry;
      errors.guest_phone = `Invalid phone number for ${countryName}`;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      setError('Please fix the validation errors below');
      return;
    }

    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      await bookingsAPI.update(booking.id, {
        status: formData.status,
        payment_status: formData.payment_status
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to update booking:', err);
      setError(err.message || 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 modal-overlay">
      <div className={`rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto modal-content ${darkMode ? 'bg-gray-800' : 'bg-white shadow-2xl'}`}>
        {/* Modal Header */}
        <div className={`sticky top-0 px-6 py-4 border-b flex items-center justify-between ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div>
            <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>Edit Booking</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Ref: {booking.ref}</p>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg ${darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Booking Summary */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <h3 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Booking Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Hotel:</span>
                <span className={`ml-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{booking.hotel}</span>
              </div>
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Room:</span>
                <span className={`ml-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{booking.room}</span>
              </div>
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Check-in:</span>
                <span className={`ml-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{booking.checkIn}</span>
              </div>
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Check-out:</span>
                <span className={`ml-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{booking.checkOut}</span>
              </div>
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Total Amount:</span>
                <span className={`ml-2 font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>₹{booking.total.toLocaleString()}</span>
              </div>
              <div>
                <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Amount Due:</span>
                <span className={`ml-2 font-medium ${darkMode ? 'text-red-400' : 'text-red-600'}`}>₹{booking.due.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Guest Information (Read-only display) */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Guest Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Guest Name
                </label>
                <input
                  type="text"
                  value={formData.guest_name}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.guest_email}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.guest_phone}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Occupancy (Read-only) */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Occupancy</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Rooms
                </label>
                <input
                  type="number"
                  value={formData.num_rooms}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Adults
                </label>
                <input
                  type="number"
                  value={formData.num_adults}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Children
                </label>
                <input
                  type="number"
                  value={formData.num_children}
                  readOnly
                  className={`w-full px-3 py-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Editable Status Fields */}
          <div>
            <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>Update Status</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Booking Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Payment Status *
                </label>
                <select
                  value={formData.payment_status}
                  onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'
                  }`}
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className={`flex items-center justify-end space-x-3 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 border rounded-lg text-sm font-medium ${
                darkMode
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Update Booking
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// REUSABLE COMPONENTS
// ============================================================

function StatCard({ title, value, subtitle, icon: Icon, color, trend, trendUp, darkMode }) {
  const colorClasses = {
    blue: darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600',
    green: darkMode ? 'bg-green-900/50 text-green-400' : 'bg-green-50 text-green-600',
    amber: darkMode ? 'bg-amber-900/50 text-amber-400' : 'bg-amber-50 text-amber-600',
    purple: darkMode ? 'bg-purple-900/50 text-purple-400' : 'bg-purple-50 text-purple-600',
  };

  return (
    <div className={`rounded-xl border p-5 hover-lift animate-fadeIn ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
          <p className={`text-2xl font-bold mt-1 counter-animate ${darkMode ? 'text-white' : 'text-gray-800'}`}>{value}</p>
          <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>
        </div>
        <div className={`p-3 rounded-lg transition-transform hover:scale-110 ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className={`flex items-center mt-3 text-xs ${trendUp ? (darkMode ? 'text-green-400' : 'text-green-600') : (darkMode ? 'text-red-400' : 'text-red-600')}`}>
        {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
        {trend}
      </div>
    </div>
  );
}

function ProgressBar({ label, value, total, color, darkMode }) {
  const percentage = Math.round((value / total) * 100);
  const colorClasses = {
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div className="group">
      <div className="flex justify-between text-sm mb-1">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{label}</span>
        <span className={`font-medium transition-colors ${darkMode ? 'text-gray-200 group-hover:text-white' : 'group-hover:text-gray-900'}`}>{value} ({percentage}%)</span>
      </div>
      <div className={`w-full rounded-full h-2 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div
          className={`${colorClasses[color]} h-2 rounded-full progress-bar`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status, size = 'md', darkMode }) {
  const config = {
    confirmed: {
      bg: darkMode ? 'bg-green-900/50' : 'bg-green-100',
      text: darkMode ? 'text-green-400' : 'text-green-700',
      label: 'Confirmed'
    },
    pending: {
      bg: darkMode ? 'bg-yellow-900/50' : 'bg-yellow-100',
      text: darkMode ? 'text-yellow-400' : 'text-yellow-700',
      label: 'Pending'
    },
    waitlisted: {
      bg: darkMode ? 'bg-blue-900/50' : 'bg-blue-100',
      text: darkMode ? 'text-blue-400' : 'text-blue-700',
      label: 'Waitlisted'
    },
    cancelled: {
      bg: darkMode ? 'bg-red-900/50' : 'bg-red-100',
      text: darkMode ? 'text-red-400' : 'text-red-700',
      label: 'Cancelled'
    },
  };

  const { bg, text, label } = config[status] || config.pending;
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-xs px-2 py-1';

  return (
    <span className={`inline-flex items-center ${bg} ${text} ${sizeClasses} rounded-full font-medium`}>
      {label}
    </span>
  );
}

function PaymentBadge({ status, darkMode }) {
  const config = {
    paid: {
      bg: darkMode ? 'bg-green-900/50' : 'bg-green-100',
      text: darkMode ? 'text-green-400' : 'text-green-700',
      icon: CheckCircle,
      label: 'Paid'
    },
    partial: {
      bg: darkMode ? 'bg-yellow-900/50' : 'bg-yellow-100',
      text: darkMode ? 'text-yellow-400' : 'text-yellow-700',
      icon: Clock,
      label: 'Partial'
    },
    pending: {
      bg: darkMode ? 'bg-red-900/50' : 'bg-red-100',
      text: darkMode ? 'text-red-400' : 'text-red-700',
      icon: AlertTriangle,
      label: 'Pending'
    },
  };

  const { bg, text, icon: Icon, label } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center ${bg} ${text} text-xs px-2 py-1 rounded-full font-medium`}>
      <Icon className="w-3 h-3 mr-1" />
      {label}
    </span>
  );
}

function ActionButton({ icon: Icon, label, color, onClick, darkMode }) {
  const colorClasses = {
    amber: darkMode
      ? 'bg-amber-900/30 text-amber-400 hover:bg-amber-900/50 border-amber-800'
      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200',
    blue: darkMode
      ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border-blue-800'
      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200',
    green: darkMode
      ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border-green-800'
      : 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200',
    purple: darkMode
      ? 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 border-purple-800'
      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200',
    slate: darkMode
      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-600'
      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200',
    cyan: darkMode
      ? 'bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50 border-cyan-800'
      : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border-cyan-200',
  };

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-sm font-medium flex items-center justify-center btn-press transition-all hover:scale-[1.02] hover:shadow-md ${colorClasses[color]}`}
    >
      <Icon className="w-4 h-4 mr-2 transition-transform group-hover:scale-110" />
      {label}
    </button>
  );
}

function AlertItem({ type, title, description, action, darkMode }) {
  const config = {
    warning: {
      bg: darkMode ? 'bg-yellow-900/20' : 'bg-yellow-50',
      border: darkMode ? 'border-yellow-800' : 'border-yellow-200',
      icon: AlertTriangle,
      iconColor: darkMode ? 'text-yellow-400' : 'text-yellow-500'
    },
    info: {
      bg: darkMode ? 'bg-blue-900/20' : 'bg-blue-50',
      border: darkMode ? 'border-blue-800' : 'border-blue-200',
      icon: Clock,
      iconColor: darkMode ? 'text-blue-400' : 'text-blue-500'
    },
    success: {
      bg: darkMode ? 'bg-green-900/20' : 'bg-green-50',
      border: darkMode ? 'border-green-800' : 'border-green-200',
      icon: CheckCircle,
      iconColor: darkMode ? 'text-green-400' : 'text-green-500'
    },
  };

  const { bg, border, icon: Icon, iconColor } = config[type];

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg animate-slideUp transition-all hover:scale-[1.01] ${bg} border ${border}`}>
      <div className="flex items-center space-x-3">
        <Icon className={`w-5 h-5 ${iconColor} animate-pulse-slow`} />
        <div>
          <div className={`font-medium text-sm ${darkMode ? 'text-white' : 'text-gray-800'}`}>{title}</div>
          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{description}</div>
        </div>
      </div>
      <button className={`px-3 py-1.5 border rounded-lg text-sm font-medium btn-press transition-all hover:shadow-sm ${
        darkMode
          ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600'
          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}>
        {action}
      </button>
    </div>
  );
}
