import { useEffect, useState } from "react";
import { API_URL } from "../config.js";

const toDateInput = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD

const timeLabel = (slot) => {
  const [h, m] = slot.split(":").map(Number);
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const dateLabel = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

const slotHint = (s) => {
  if (!s.available) return "Unavailable";
  return s.tablesLeft <= 2 ? `Only ${s.tablesLeft} left` : "Available";
};

export default function BookingSection() {
  const today = toDateInput(new Date());
  const maxDay = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toDateInput(d);
  })();

  const [date, setDate] = useState(today);
  const [guests, setGuests] = useState(2);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState("");
  const [slot, setSlot] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "success", text }
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [version, setVersion] = useState(0); // badalte hi sab dobara load hota hai

  // Date ya guests badalte hi khaali slots laao
  useEffect(() => {
    if (!date) {
      setSlots([]);
      setSlotsLoading(false);
      return;
    }
    let ignore = false;
    setSlotsLoading(true);
    setSlotsError("");

    fetch(`${API_URL}/api/bookings/availability?date=${date}&guests=${guests}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load time slots");
        return data;
      })
      .then((data) => {
        if (ignore) return;
        setSlots(data.slots);
        // Chuna hua slot ab full ho gaya ho toh hata do
        setSlot((cur) => (data.slots.some((s) => s.slot === cur && s.available) ? cur : ""));
      })
      .catch((err) => {
        if (ignore) return;
        setSlots([]);
        setSlotsError(
          err.message === "Failed to fetch"
            ? "Could not reach the server. Please try again."
            : err.message
        );
      })
      .finally(() => {
        if (!ignore) setSlotsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [date, guests, version]);

  // Meri bookings
  useEffect(() => {
    let ignore = false;
    setBookingsError("");

    fetch(`${API_URL}/api/bookings/mine`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        return data;
      })
      .then((data) => {
        if (!ignore) setBookings(data.bookings);
      })
      .catch(() => {
        if (!ignore) setBookingsError("Could not load your bookings.");
      })
      .finally(() => {
        if (!ignore) setBookingsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [version]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!slot) {
      setMessage({ type: "error", text: "Please pick a time slot." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slot, guests, note }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.message || "Booking failed" });
      } else {
        setMessage({
          type: "success",
          text: `Table ${data.booking.tableNumber} booked for ${dateLabel(date)} at ${timeLabel(slot)}.`,
        });
        setSlot("");
        setNote("");
      }
    } catch {
      setMessage({ type: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setSubmitting(false);
      setVersion((v) => v + 1);
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this booking?")) return;
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/bookings/${id}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      setMessage(
        res.ok
          ? { type: "success", text: "Booking cancelled." }
          : { type: "error", text: data.message || "Could not cancel the booking" }
      );
    } catch {
      setMessage({ type: "error", text: "Could not reach the server. Please try again." });
    }
    setVersion((v) => v + 1);
  };

  return (
    <section id="book" className="home-section">
      <h2>Book a table</h2>
      <p className="muted">
        Pick a date, party size and time. We will assign the best-fitting table for you.
      </p>

      <form className="booking-form" onSubmit={handleSubmit}>
        <div className="booking-fields">
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={date}
              min={today}
              max={maxDay}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span>Guests</span>
            <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "guest" : "guests"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div>
          <span className="field-label">Available times</span>
          {slotsLoading && <p className="muted">Checking availability...</p>}
          {slotsError && (
            <p className="form-error" role="alert">
              {slotsError}
            </p>
          )}
          <div className="slot-grid">
            {!slotsLoading &&
              slots.map((s) => (
                <button
                  key={s.slot}
                  type="button"
                  className={`slot ${slot === s.slot ? "active" : ""}`}
                  disabled={!s.available}
                  aria-pressed={slot === s.slot}
                  onClick={() => setSlot(s.slot)}
                >
                  {timeLabel(s.slot)}
                  <small>{slotHint(s)}</small>
                </button>
              ))}
          </div>
        </div>

        <label className="field">
          <span>Note (optional)</span>
          <input
            type="text"
            value={note}
            maxLength={200}
            placeholder="Birthday, high chair, window seat..."
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {message && (
          <p className={message.type === "error" ? "form-error" : "form-success"} role="alert">
            {message.text}
          </p>
        )}

        <button type="submit" className="btn btn-solid" disabled={submitting || !slot}>
          {submitting ? "Booking..." : "Confirm booking"}
        </button>
      </form>

      <h3 className="sub-heading">Your bookings</h3>
      {bookingsLoading && <p className="muted">Loading...</p>}
      {bookingsError && <p className="form-error">{bookingsError}</p>}
      {!bookingsLoading && !bookingsError && bookings.length === 0 && (
        <p className="muted">No bookings yet.</p>
      )}

      <ul className="booking-list">
        {bookings.map((b) => (
          <li key={b.id} className="booking-row">
            <div>
              <strong>
                {dateLabel(b.date)} · {timeLabel(b.slot)}
              </strong>
              <span className="muted-line">
                {b.guests} {b.guests === 1 ? "guest" : "guests"}
                {b.tableNumber ? ` · Table ${b.tableNumber}` : ""}
                {b.note ? ` · ${b.note}` : ""}
              </span>
            </div>
            <div className="booking-actions">
              <span className={`status ${b.status}`}>
                {b.status === "cancelled" ? "Cancelled" : b.upcoming ? "Confirmed" : "Completed"}
              </span>
              {b.upcoming && (
                <button type="button" className="line-remove" onClick={() => handleCancel(b.id)}>
                  Cancel
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}