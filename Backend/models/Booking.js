import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // 2026-10-30
    slot: { type: String, required: true }, // "13:00"
    guests: { type: Number, required: true, min: 1, max: 12 },
    note: { type: String, trim: true, maxlength: 200, default: "" },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
  },
  { timestamps: true }
);

// Ek table, ek date, ek slot pe sirf ek confirmed booking (cancel hone pe slot khaali)
bookingSchema.index(
  { table: 1, date: 1, slot: 1 },
  { unique: true, partialFilterExpression: { status: "confirmed" } }
);
bookingSchema.index({ user: 1, date: 1 });

const Booking = mongoose.model("Booking", bookingSchema);

export default Booking;