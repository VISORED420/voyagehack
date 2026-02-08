/**
 * Custom hook for dashboard data fetching
 */
import { useState, useEffect, useCallback } from 'react';
import { dashboardAPI, bookingsAPI } from '../api';

// Default event ID for demo
const DEFAULT_EVENT_ID = '33333333-3333-3333-3333-333333333333';

export function useDashboard(eventId = DEFAULT_EVENT_ID) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dashboardData = await dashboardAPI.getFullDashboard(eventId);
      setData(dashboardData);
    } catch (err) {
      setError(err.message);
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh };
}

export function useBookings(eventId = DEFAULT_EVENT_ID) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBookings = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const data = await bookingsAPI.getByEvent(eventId, filters);
      setBookings(data);
    } catch (err) {
      setError(err.message);
      console.error('Bookings fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const refresh = useCallback((filters = {}) => {
    fetchBookings(filters);
  }, [fetchBookings]);

  return { bookings, loading, error, refresh };
}

export function useAlerts(eventId = DEFAULT_EVENT_ID) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await dashboardAPI.getAlerts(eventId);
      setAlerts(data);
    } catch (err) {
      setError(err.message);
      console.error('Alerts fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const refresh = useCallback(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return { alerts, loading, error, refresh };
}

export default useDashboard;
