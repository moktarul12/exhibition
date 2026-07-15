import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Exhibitions from './pages/Exhibitions';
import ExhibitionDetail from './pages/ExhibitionDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import MyBookings from './pages/MyBookings';
import AdminDashboard from './pages/AdminDashboard';
import AdminFloorPlan from './pages/AdminFloorPlan';
import AdminEventForm from './pages/AdminEventForm';
import AdminDiscoverEvents from './pages/AdminDiscoverEvents';
import CompanyProfile from './pages/CompanyProfile';
import CompanyDashboard from './pages/CompanyDashboard';
import Marketing from './pages/Marketing';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product" element={<Marketing />} />
          <Route path="/marketing" element={<Marketing />} />
          <Route path="/exhibitions" element={<Exhibitions />} />
          <Route path="/exhibitions/:slug" element={<ExhibitionDetail />} />
          <Route path="/company/:id" element={<CompanyProfile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/my-bookings" element={<ProtectedRoute><MyBookings /></ProtectedRoute>} />
          <Route path="/company-dashboard" element={<ProtectedRoute roles={['exhibitor', 'admin']}><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/events/new" element={<ProtectedRoute roles={['admin']}><AdminEventForm /></ProtectedRoute>} />
          <Route path="/admin/events/:slug/edit" element={<ProtectedRoute roles={['admin']}><AdminEventForm /></ProtectedRoute>} />
          <Route path="/admin/floor-plan" element={<ProtectedRoute roles={['admin']}><AdminFloorPlan /></ProtectedRoute>} />
          <Route path="/admin/discover" element={<ProtectedRoute roles={['admin']}><AdminDiscoverEvents /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
