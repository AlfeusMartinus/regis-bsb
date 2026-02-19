import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/admin/Login';
import { AdminLayout } from './components/layout/AdminLayout';
import { CreateEvent } from './components/admin/CreateEvent';
import { EventList } from './components/admin/EventList';
import { PublicEventPage } from './pages/PublicEventPage';
// import { HomePage } from './pages/HomePage'; // Optional

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/e/:slug" element={<PublicEventPage />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<Login />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/events" replace />} />
          <Route path="events" element={<EventList />} />
          <Route path="events/create" element={<CreateEvent />} />
        </Route>

        {/* Fallback / Default */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
