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

// Floor plan mein har table kahan baithi hai (12 column wali grid ke hisaab se)
const LAYOUT = {
  1: { col: 1, row: 2, w: 2, h: 1, round: true },
  2: { col: 3, row: 2, w: 2, h: 1, round: true },
  3: { col: 5, row: 2, w: 2, h: 1, round: true },
  4: { col: 7, row: 2, w: 2, h: 1, round: true },
  5: { col: 1, row: 4, w: 2, h: 2 },
  6: { col: 4, row: 4, w: 2, h: 2 },
  7: { col: 7, row: 4, w: 2, h: 2 },
  8: { col: 1, row: 7, w: 3, h: 2 },
  9: { col: 5, row: 7, w: 3, h: 2 },
  10: { col: 10, row: 4, w: 3, h: 3 },
};

const STATUS_TEXT = {
  available: "Available",
  booked: "Booked",
  too_small: "Too small",
  too_large: "For larger groups",
};

export default function Book() {
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
  const [tables, setTables] = useState([]);
  const [tablesError, setTablesError] = useState("");
  const [tableId, setTableId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: "error" | "success", text }
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [version, setVersion] = useState(0); // badalte hi sab dobara load hota hai

  // Date ya guests badalte hi khaali time slots laao
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

  // Floor plan: har table ka status (slot chuna ho toh booked bhi dikhta hai)
  useEffect(() => {
    if (!date) {
      setTables([]);
      return;
    }
    let ignore = false;
    setTablesError("");

    const query = `date=${date}&guests=${guests}${slot ? `&slot=${slot}` : ""}`;

    fetch(`${API_URL}/api/bookings/tables?${query}`, { credentials: "include" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Could not load the floor plan");
        return data;
      })
      .then((data) => {
        if (ignore) return;
        setTables(data.tables);
        // Chuni hui table ab free na ho toh selection hata do
        setTableId((cur) =>
          slot && data.tables.some((t) => t.id === cur && t.status === "available") ? cur : ""
        );
      })
      .catch((err) => {
        if (ignore) return;
        setTables([]);
        setTablesError(
          err.message === "Failed to fetch"
            ? "Could not reach the server. Please try again."
            : err.message
        );
      });

    return () => {
      ignore = true;
    };
  }, [date, guests, slot, version]);

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

  const selectedTable = tables.find((t) => t.id === tableId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!slot || !selectedTable) {
      setMessage({ type: "error", text: "Please pick a time and a table." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slot, guests, note, tableId }),
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
    <main className="home-section">
      <h2>Book a table</h2>
      <p className="muted">
        Choose a date and time, then pick your favourite spot on the floor plan.
      </p>

      <form className="book-form" onSubmit={handleSubmit}>
        <h3 className="step-title">1. Date and guests</h3>
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

        <h3 className="step-title">2. Time</h3>
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

        <h3 className="step-title">3. Choose your table</h3>
        {!slot && <p className="muted">Pick a time first to see which tables are free.</p>}
        {tablesError && (
          <p className="form-error" role="alert">
            {tablesError}
          </p>
        )}

        <div className="floor-scroll">
          <div className="floor" role="group" aria-label="Cafe floor plan">
            <div className="floor-label" style={{ gridColumn: "1 / span 8", gridRow: 1 }}>
              Window side
            </div>
            <div className="floor-label" style={{ gridColumn: "1 / span 8", gridRow: 3 }}>
              Main hall
            </div>
            <div className="floor-label" style={{ gridColumn: "1 / span 8", gridRow: 6 }}>
              Lounge
            </div>
            <div className="floor-label" style={{ gridColumn: "10 / span 3", gridRow: 3 }}>
              Private corner
            </div>
            <div className="floor-block" style={{ gridColumn: "9 / span 4", gridRow: "1 / span 2" }}>
              Counter
            </div>
            <div className="floor-block" style={{ gridColumn: "10 / span 3", gridRow: 8 }}>
              Entrance
            </div>

            {tables.map((t) => {
              const pos = LAYOUT[t.number];
              if (!pos) return null;
              const selectable = Boolean(slot) && t.status === "available";

              return (
                <button
                  key={t.id}
                  type="button"
                  className={`tbl ${t.status} ${tableId === t.id ? "selected" : ""} ${
                    pos.round ? "round" : ""
                  }`}
                  style={{
                    gridColumn: `${pos.col} / span ${pos.w}`,
                    gridRow: `${pos.row} / span ${pos.h}`,
                  }}
                  disabled={!selectable}
                  aria-pressed={tableId === t.id}
                  aria-label={`Table ${t.number}, ${t.seats} seats, ${STATUS_TEXT[t.status]}`}
                  onClick={() => setTableId(t.id)}
                >
                  <strong>T{t.number}</strong>
                  <small>{t.seats} seats</small>
                  {t.status !== "available" && <small>{STATUS_TEXT[t.status]}</small>}
                </button>
              );
            })}
          </div>
        </div>

        <ul className="legend">
          <li>
            <span className="dot" /> Available
          </li>
          <li>
            <span className="dot selected" /> Your pick
          </li>
          <li>
            <span className="dot booked" /> Booked
          </li>
          <li>
            <span className="dot muted" /> Not suitable for {guests} {guests === 1 ? "guest" : "guests"}
          </li>
        </ul>

        <div className="book-confirm">
          {selectedTable ? (
            <p className="chosen">
              Table {selectedTable.number} ({selectedTable.seats} seats) · {dateLabel(date)} ·{" "}
              {timeLabel(slot)} · {guests} {guests === 1 ? "guest" : "guests"}
            </p>
          ) : (
            <p className="muted">
              {slot ? "Tap a free table on the map." : "Pick a time to continue."}
            </p>
          )}

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

          <button type="submit" className="btn btn-solid" disabled={submitting || !selectedTable}>
            {submitting
              ? "Booking..."
              : selectedTable
              ? `Confirm Table ${selectedTable.number}`
              : "Confirm booking"}
          </button>
        </div>
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
    </main>
  );
}