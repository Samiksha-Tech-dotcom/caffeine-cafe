import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";

const STATUS_LABELS = {
  placed: "Placed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  ready: "Ready for pickup",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

// "13:00" -> "1:00 PM"
const formatSlot = (slot) => {
  const [h, m] = slot.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

export default function AdminOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setError("");
      } else {
        setError(data.message || "Could not load the overview");
      }
    } catch {
      setError("Could not connect to the server");
    }
  };

  // Load once, then refresh every 30 seconds
  useEffect(() => {
    loadStats();
    const timer = setInterval(loadStats, 30000);
    return () => clearInterval(timer);
  }, []);

  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const topQty = stats && stats.popular.length > 0 ? stats.popular[0].qty : 1;

  // Needs attention: har line ek kaam hai jo admin ko dekhna chahiye
  const attention = [];
  if (stats) {
    if (stats.newOrders > 0) {
      attention.push({
        key: "orders",
        to: "/admin/orders",
        text: `${stats.newOrders} new ${
          stats.newOrders === 1 ? "order is" : "orders are"
        } waiting to be accepted`,
      });
    }
    if (stats.soldOutCount > 0) {
      attention.push({
        key: "soldout",
        to: "/admin",
        text: `${stats.soldOutCount} menu ${
          stats.soldOutCount === 1 ? "item is" : "items are"
        } marked out of stock`,
      });
    }
    stats.expiringOffers.forEach((o) => {
      attention.push({
        key: `offer-${o.id}`,
        to: "/admin/offers",
        text: `Offer "${o.title}" expires on ${new Date(o.expiresAt).toLocaleDateString()}`,
      });
    });
  }

  return (
    <div className="admin-page">
      <h2>Overview</h2>
      <p className="admin-sub">
        {firstName ? `Hi ${firstName}, here` : "Here"} is how the cafe is doing today.
        This page refreshes every 30 seconds.
      </p>

      {error && <div className="admin-msg admin-error">{error}</div>}
      {!stats && !error && <p>Loading...</p>}

      {stats && (
        <>
          {/* ---------- Quick actions ---------- */}
          <div className="quick-actions">
            <Link to="/admin" className="admin-btn admin-btn-primary">
              + Add menu item
            </Link>
            <Link to="/admin/offers" className="admin-btn">
              + Add offer
            </Link>
            <Link to="/admin/orders" className="admin-btn">
              View orders
            </Link>
            <Link to="/admin/bookings" className="admin-btn">
              View bookings
            </Link>
          </div>

          {/* ---------- Needs attention ---------- */}
          <h3 className="admin-list-title">Needs attention</h3>
          <div className="admin-form attention-box">
            {attention.length === 0 && (
              <p style={{ margin: 0 }}>All clear. Nothing needs your attention right now.</p>
            )}
            {attention.map((a) => (
              <Link key={a.key} to={a.to} className="attention-row">
                <span>{a.text}</span>
                <span className="attention-arrow">View</span>
              </Link>
            ))}
          </div>

          {/* ---------- Stat cards ---------- */}
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-label">Orders today</span>
              <strong className="stat-value">{stats.ordersToday}</strong>
            </div>

            <div className="stat-card">
              <span className="stat-label">Revenue today</span>
              <strong className="stat-value">₹{stats.revenueToday}</strong>
            </div>

            <Link to="/admin/orders" className="stat-card stat-link">
              <span className="stat-label">Orders in progress</span>
              <strong className="stat-value">{stats.activeOrders}</strong>
              <span className="stat-hint">View orders</span>
            </Link>

            <Link to="/admin/bookings" className="stat-card stat-link">
              <span className="stat-label">Bookings today</span>
              <strong className="stat-value">{stats.bookingsToday}</strong>
              <span className="stat-hint">View bookings</span>
            </Link>

            <Link to="/admin/offers" className="stat-card stat-link">
              <span className="stat-label">Active offers</span>
              <strong className="stat-value">{stats.activeOffers}</strong>
              <span className="stat-hint">Manage offers</span>
            </Link>

            <Link to="/admin" className="stat-card stat-link">
              <span className="stat-label">Menu items</span>
              <strong className="stat-value">{stats.menuCount}</strong>
              <span className="stat-hint">
                {stats.soldOutCount > 0
                  ? `${stats.soldOutCount} out of stock`
                  : "All available"}
              </span>
            </Link>
          </div>

          {/* ---------- Recent orders + Today's bookings ---------- */}
          <div className="overview-split">
            <div>
              <div className="overview-head">
                <h3>Recent orders</h3>
                <Link to="/admin/orders" className="overview-link">
                  View all
                </Link>
              </div>
              <div className="admin-form popular-box">
                {stats.recentOrders.length === 0 && (
                  <p style={{ margin: 0 }}>No orders yet.</p>
                )}
                {stats.recentOrders.map((o) => (
                  <Link to="/admin/orders" className="mini-row" key={o.id}>
                    <div className="mini-main">
                      <strong>#{o.id.slice(-6).toUpperCase()}</strong>
                      <span>
                        {o.customer} · {o.type === "delivery" ? "Delivery" : "Pickup"} · ₹
                        {o.total}
                      </span>
                    </div>
                    <span className={`admin-status admin-status-${o.status}`}>
                      {STATUS_LABELS[o.status] || o.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="overview-head">
                <h3>Today's bookings</h3>
                <Link to="/admin/bookings" className="overview-link">
                  View all
                </Link>
              </div>
              <div className="admin-form popular-box">
                {stats.todayBookings.length === 0 && (
                  <p style={{ margin: 0 }}>No tables booked for today.</p>
                )}
                {stats.todayBookings.map((b) => (
                  <Link to="/admin/bookings" className="mini-row" key={b.id}>
                    <div className="mini-main">
                      <strong>{formatSlot(b.slot)}</strong>
                      <span>
                        {b.customer} · Table {b.tableNumber ?? "-"} · {b.guests}{" "}
                        {b.guests === 1 ? "guest" : "guests"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ---------- Popular items ---------- */}
          <h3 className="admin-list-title">Popular items (last 7 days)</h3>

          <div className="admin-form popular-box">
            {stats.popular.length === 0 && (
              <p style={{ margin: 0 }}>No orders yet in the last 7 days.</p>
            )}

            {stats.popular.map((p, i) => (
              <div className="popular-row" key={p.name}>
                <div className="popular-top">
                  <span>
                    {i + 1}. {p.name}
                  </span>
                  <span>
                    {p.qty} sold · ₹{p.revenue}
                  </span>
                </div>
                <div className="popular-bar">
                  <div
                    className="popular-fill"
                    style={{ width: `${(p.qty / topQty) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}