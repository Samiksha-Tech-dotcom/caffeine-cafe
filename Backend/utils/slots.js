export const SLOTS = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00", "20:30"];
export const MAX_DAYS_AHEAD = 30;
export const MAX_GUESTS = 8;

// Abhi India mein kya date aur time hai
export const nowIST = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
};

const toMinutes = (slot) => {
  const [h, m] = slot.split(":").map(Number);
  return h * 60 + m;
};

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

export const isValidDate = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

// Slot shuru ho chuka hai ya nikal chuka hai?
export const isSlotPast = (date, slot) => {
  const now = nowIST();
  return date < now.date || (date === now.date && toMinutes(slot) <= now.minutes);
};

// Sab theek ho toh null, warna error ka message
export const checkBookable = (date, slot) => {
  if (!isValidDate(date)) return "Invalid date";
  if (slot !== undefined && !SLOTS.includes(slot)) return "Invalid time slot";

  const now = nowIST();
  if (date < now.date) return "You cannot book a past date";
  if (date > addDays(now.date, MAX_DAYS_AHEAD)) {
    return `Bookings open only ${MAX_DAYS_AHEAD} days ahead`;
  }
  if (slot !== undefined && isSlotPast(date, slot)) return "That time slot has already started";
  return null;
};