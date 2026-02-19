import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/admin/Login';
import { AdminLayout } from './components/layout/AdminLayout';
import { Dashboard } from './components/admin/Dashboard';
import { CreateEvent } from './components/admin/CreateEvent';
import { EditEvent } from './components/admin/EditEvent';
// EventList is now used inside Dashboard
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
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="events" element={<Navigate to="/admin/dashboard?tab=events" replace />} />
          <Route path="events/create" element={<CreateEvent />} />
          <Route path="events/edit/:id" element={<EditEvent />} />
        </Route>

        {/* Fallback / Default */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
