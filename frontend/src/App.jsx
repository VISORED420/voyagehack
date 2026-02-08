import React from 'react';
import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import GroupBookingDashboard from './GroupBookingDashboard';
import EventMicrosite from './EventMicrosite';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardWrapper />} />
        <Route path="/event/:eventSlug" element={<MicrositePage />} />
      </Routes>
    </Router>
  );
}

function DashboardWrapper() {
  const handleOpenMicrosite = (eventName, eventId) => {
    const slug = eventName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    window.open(`/event/${slug}?id=${eventId}`, '_blank');
  };

  return <GroupBookingDashboard onOpenMicrosite={handleOpenMicrosite} />;
}

function MicrositePage() {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const eventId = searchParams.get('id') || '33333333-3333-3333-3333-333333333333';

  return (
    <EventMicrosite
      eventId={eventId}
      onBack={() => navigate('/')}
    />
  );
}

export default App;
