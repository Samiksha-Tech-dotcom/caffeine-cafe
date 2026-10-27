import { useEffect, useState } from "react";
import { API_URL } from "../config.js";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

// "13:00" -> "1:00 PM"
const formatSlot = (slot) => {
  const [h, m] = slot.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
};

// "2026-10-30" -> "Fri, 30 Oct 2026"
const formatDate = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function AdminBookings() {
  const [bookings, setBookings] = useState([]);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBookings = async () => {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (date) params.set("date", date);

      const res = await fetch(`${API_URL}/api/bookings/all?${params.toString()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setBookings(data.bookings);
        setError("");
      } else {
        setError(data.message || "Could not load bookings");
      }
    } catch {
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  // Load when a filter changes, and refresh every 30 seconds
  useEffect(() => {
    setLoading(true);
    loadBookings();
    const timer = setInterval(loadBookings, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, date]);

  const handleCancel = async (booking) => {
    if (!window.confirm("Cancel this booking? The table will become free again.")) {
      return;
    }

    setError("");
    setSuccess("");
    setCancellingId(booking.id);

    try {
      const res = await fetch(`${API_URL}/api/bookings/${booking.id}/admin-cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.message || "Could not cancel the booking");
      } else {
        setSuccess("Booking cancelled");
        loadBookings();
      }
    } catch {
      setError("Could not connect to the server");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="admin-page">
      <h2>Bookings</h2>
      <p className="admin-sub">
        View table reservations and cancel them if needed. This page refreshes every 30
        seconds.
      </p>

      {error && <div className="admin-msg admin-error">{error}</div>}
      {success && <div className="admin-msg admin-success">{success}</div>}

      <div className="admin-filters">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={`admin-chip ${status === f.value ? "admin-chip-active" : ""}`}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </button>
        ))}

        <input
          type="date"
          className="admin-date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Filter by date"
        />
        {date && (
          <button type="button" className="admin-chip" onClick={() => setDate("")}>
            Clear date
          </button>
        )}
      </div>

      {loading && <p>Loading bookings...</p>}

      <div className="admin-list">
        {bookings.map((b) => (
          <div className="admin-order" key={b.id}>
            <div className="admin-order-head">
              <div>
                <strong>
                  {formatDate(b.date)} · {formatSlot(b.slot)}
                </strong>
                <span className="admin-order-time">
                  Booked on {new Date(b.createdAt).toLocaleString()}
                </span>
              </div>
              <span className={`admin-status admin-status-${b.status}`}>
                {b.status === "confirmed" && !b.upcoming
                  ? "Confirmed (past)"
                  : b.status === "confirmed"
                  ? "Confirmed"
                  : "Cancelled"}
              </span>
            </div>

            <div className="admin-order-meta">
              <span>
                <b>Table {b.tableNumber ?? "-"}</b>
                {b.seats ? ` (seats ${b.seats})` : ""} · {b.guests}{" "}
                {b.guests === 1 ? "guest" : "guests"}
              </span>
              {b.customer && (
                <span>
                  {b.customer.name} · {b.customer.email}
                </span>
              )}
            </div>

            {b.note && <p className="admin-order-note">Note: {b.note}</p>}

            {b.upcoming && (
              <div className="admin-card-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  disabled={cancellingId === b.id}
                  onClick={() => handleCancel(b)}
                >
                  {cancellingId === b.id ? "Cancelling..." : "Cancel booking"}
                </button>
              </div>
            )}
          </div>
        ))}

        {!loading && bookings.length === 0 && <p>No bookings found.</p>}
      </div>
    </div>
  );
}