import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Table from "../models/Table.js";
import { SLOTS, MAX_GUESTS, checkBookable, isSlotPast } from "../utils/slots.js";

// Chhote group ko bahut badi table nahi milti (badi tables badi parties ke liye hain)
const MAX_EXTRA_SEATS = 2;

const parseGuests = (value) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_GUESTS ? n : null;
};

const guestsError = `Guests must be between 1 and ${MAX_GUESTS}`;

// Itne guests ke liye kaun si seats wali tables theek hain
const fits = (guests) => ({ $gte: guests, $lte: guests + MAX_EXTRA_SEATS });

const bad = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

// GET /api/bookings/availability?date=2026-10-30&guests=2
export const getAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    const guests = parseGuests(req.query.guests);

    const problem = checkBookable(date);
    if (problem) return bad(res, problem);
    if (guests === null) return bad(res, guestsError);

    const tables = await Table.find({ seats: fits(guests) });
    const booked = await Booking.find({
      date,
      status: "confirmed",
      table: { $in: tables.map((t) => t._id) },
    }).select("slot");

    const slots = SLOTS.map((slot) => {
      const taken = booked.filter((b) => b.slot === slot).length;
      const left = isSlotPast(date, slot) ? 0 : Math.max(0, tables.length - taken);
      return { slot, available: left > 0, tablesLeft: left };
    });

    res.status(200).json({ success: true, date, guests, slots });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/bookings/tables?date=2026-10-30&guests=2&slot=13:00  (slot optional)
// Floor plan ke liye har table ka status
export const getTableMap = async (req, res) => {
  try {
    const { date, slot } = req.query;
    const guests = parseGuests(req.query.guests);

    const problem = checkBookable(date, slot || undefined);
    if (problem) return bad(res, problem);
    if (guests === null) return bad(res, guestsError);

    const tables = await Table.find().sort({ number: 1 });

    const bookedIds = new Set();
    if (slot) {
      const booked = await Booking.find({ date, slot, status: "confirmed" }).select("table");
      booked.forEach((b) => bookedIds.add(String(b.table)));
    }

    const map = tables.map((t) => {
      let status = "available";
      if (t.seats < guests) status = "too_small";
      else if (t.seats > guests + MAX_EXTRA_SEATS) status = "too_large";
      else if (bookedIds.has(String(t._id))) status = "booked";

      return { id: String(t._id), number: t.number, seats: t.seats, status };
    });

    res.status(200).json({ success: true, date, slot: slot || null, guests, tables: map });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/bookings   (tableId dena optional hai: na ho toh best-fit table mil jaati hai)
export const createBooking = async (req, res) => {
  try {
    const { date, slot, tableId, note = "" } = req.body;
    const guests = parseGuests(req.body.guests);

    const problem = checkBookable(date, slot);
    if (problem) return bad(res, problem);
    if (guests === null) return bad(res, guestsError);
    if (typeof note !== "string" || note.length > 200) return bad(res, "Note is too long");

    // Is user ki usi waqt pe pehle se booking toh nahi
    const clash = await Booking.exists({
      user: req.user._id,
      date,
      slot,
      status: "confirmed",
    });
    if (clash) return bad(res, "You already have a booking at this time", 409);

    const make = (table) =>
      Booking.create({
        user: req.user._id,
        table: table._id,
        date,
        slot,
        guests,
        note: note.trim(),
      });

    const reply = (booking, table) =>
      res.status(201).json({
        success: true,
        booking: {
          id: booking._id,
          date,
          slot,
          guests,
          status: booking.status,
          tableNumber: table.number,
          seats: table.seats,
        },
      });

    // User ne khud table chuni hai
    if (tableId !== undefined && tableId !== null && tableId !== "") {
      if (!mongoose.isValidObjectId(tableId)) return bad(res, "Invalid table");

      const table = await Table.findById(tableId);
      if (!table) return bad(res, "Table not found", 404);
      if (table.seats < guests) {
        return bad(res, `Table ${table.number} seats only ${table.seats} people`);
      }
      if (table.seats > guests + MAX_EXTRA_SEATS) {
        return bad(res, `Table ${table.number} is kept for larger groups`);
      }

      try {
        const booking = await make(table);
        return reply(booking, table);
      } catch (err) {
        // 11000 = yeh table abhi kisi aur ne le li
        if (err.code === 11000) {
          return bad(res, "Someone just booked that table. Please pick another one.", 409);
        }
        throw err;
      }
    }

    // Sabse chhoti suitable table (best fit)
    const tables = await Table.find({ seats: fits(guests) }).sort({ seats: 1, number: 1 });

    for (const table of tables) {
      try {
        const booking = await make(table);
        return reply(booking, table);
      } catch (err) {
        if (err.code === 11000) continue;
        throw err;
      }
    }

    bad(res, "No table available for that time. Please pick another slot.", 409);
  } catch (err) {
    if (err.name === "ValidationError") {
      return bad(res, Object.values(err.errors)[0].message);
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/bookings/mine
export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("table")
      .sort({ date: -1, slot: -1 });

    const list = bookings.map((b) => ({
      id: b._id,
      date: b.date,
      slot: b.slot,
      guests: b.guests,
      note: b.note,
      status: b.status,
      tableNumber: b.table ? b.table.number : null,
      upcoming: b.status === "confirmed" && !isSlotPast(b.date, b.slot),
    }));

    res.status(200).json({ success: true, bookings: list });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /api/bookings/:id/cancel
export const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return bad(res, "Invalid booking");

    // user ke saath dhundte hain, taaki koi doosre ki booking cancel na kar sake
    const booking = await Booking.findOne({ _id: id, user: req.user._id });
    if (!booking) return bad(res, "Booking not found", 404);
    if (booking.status === "cancelled") return bad(res, "Booking is already cancelled", 409);
    if (isSlotPast(booking.date, booking.slot)) {
      return bad(res, "You cannot cancel a booking that has already started");
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// GET /api/bookings/all : admin ke liye saari bookings
export const listAllBookings = async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) filter.date = String(req.query.date);
    if (req.query.status) filter.status = String(req.query.status);

    const bookings = await Booking.find(filter)
      .populate("table")
      .populate("user", "name email")
      .sort({ date: -1, slot: -1 })
      .limit(200);

    const list = bookings.map((b) => ({
      id: String(b._id),
      date: b.date,
      slot: b.slot,
      guests: b.guests,
      note: b.note,
      status: b.status,
      tableNumber: b.table ? b.table.number : null,
      seats: b.table ? b.table.seats : null,
      upcoming: b.status === "confirmed" && !isSlotPast(b.date, b.slot),
      customer: b.user ? { name: b.user.name, email: b.user.email } : null,
      createdAt: b.createdAt,
    }));

    res.status(200).json({ success: true, bookings: list });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PATCH /api/bookings/:id/admin-cancel : admin kisi bhi booking ko cancel kar sakta hai
export const adminCancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return bad(res, "Invalid booking");

    const booking = await Booking.findById(id);
    if (!booking) return bad(res, "Booking not found", 404);
    if (booking.status === "cancelled") return bad(res, "Booking is already cancelled", 409);
    if (isSlotPast(booking.date, booking.slot)) {
      return bad(res, "This booking has already started and cannot be cancelled");
    }

    booking.status = "cancelled";
    await booking.save();

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};