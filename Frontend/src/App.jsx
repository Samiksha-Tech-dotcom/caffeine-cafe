import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import CartDrawer from "./components/CartDrawer.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Home from "./pages/Home.jsx";
import Saved from "./pages/Saved.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";
import Book from "./pages/Book.jsx";
import Admin from "./pages/Admin.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import AdminOffers from "./pages/AdminOffers.jsx";
import AdminOrders from "./pages/AdminOrders.jsx";
import AdminBookings from "./pages/AdminBookings.jsx";
import AdminOverview from "./pages/AdminOverview.jsx";
import MenuPage from "./pages/MenuPage.jsx";
import AdminTeam from "./pages/AdminTeam.jsx";

// Sirf bina login wale logon ke liye (landing, login, signup)
function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return children;
  return <Navigate to={user.role === "admin" ? "/admin/overview" : "/home"} replace />;
}

// Sirf login wale customers ke liye (admin ko uske dashboard pe bhej do)
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin/overview" replace />;
  return children;
}

// Sirf admin ke liye
function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return user.role === "admin" ? children : <Navigate to="/home" replace />;
}

const LIGHT_PAGES = ["/home", "/saved", "/checkout", "/orders", "/book", "/admin","/menu"];

export default function App() {
  const { pathname } = useLocation();
  const isLight = LIGHT_PAGES.some((p) => pathname.startsWith(p));

  return (
    <div className={`frame ${isLight ? "theme-light" : ""}`}>
      <div className="panel">
        <Navbar />
        <CartDrawer />
        <Routes>
          <Route path="/" element={<GuestOnly><Landing /></GuestOnly>} />
          <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/signup" element={<GuestOnly><Signup /></GuestOnly>} />
          <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/saved" element={<RequireAuth><Saved /></RequireAuth>} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="/book" element={<RequireAuth><Book /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
          <Route path="/admin/offers" element={<RequireAdmin><AdminOffers /></RequireAdmin>} />
          <Route path="/admin/orders" element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
          <Route path="/admin/bookings" element={<RequireAdmin><AdminBookings /></RequireAdmin>} />
          <Route path="/admin/overview" element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
          <Route path="/menu" element={<RequireAuth><MenuPage /></RequireAuth>} />
          <Route path="/admin/team" element={<RequireAdmin><AdminTeam /></RequireAdmin>} />
        </Routes>
      </div>
    </div>
  );
}