import mongoose from "mongoose";

const choiceSchema = new mongoose.Schema(
    {
        group: { type: String, required: true },
        options: { type: [String], default: [] },
    },
    { _id: false }
);

// Order ke waqt ka naam aur price yahin save hota hai (menu baad mein badle toh bhi purana order wahi rahe)
const orderItemSchema = new mongoose.Schema(
    {
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
        name: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true, min: 0 },
        choices: { type: [choiceSchema], default: [] },
    },
    { _id: false }
);

const historySchema = new mongoose.Schema(
    {
        status: { type: String, required: true },
        at: { type: Date, default: Date.now },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        items: {
            type: [orderItemSchema],
            validate: [(v) => v.length > 0, "Order must have at least one item"],
        },
        type: { type: String, enum: ["delivery", "pickup"], required: true },
        phone: { type: String, required: true },
        address: {
            line1: { type: String, trim: true },
            city: { type: String, trim: true },
            pincode: { type: String, trim: true },
        },
        note: { type: String, trim: true, maxlength: 200, default: "" },
        subtotal: { type: Number, required: true, min: 0 },
        couponCode: { type: String, default: "" },
        discount: { type: Number, default: 0, min: 0 },
        total: { type: Number, required: true, min: 0 },
        paymentMethod: { type: String, enum: ["cash", "online"], default: "cash" },
        paymentStatus: { type: String, enum: ["pending", "paid"], default: "pending" },
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        status: {
            type: String,
            enum: [
                "awaiting_payment",
                "placed",
                "preparing",
                "out_for_delivery",
                "ready",
                "delivered",
                "completed",
                "cancelled",
            ],
            default: "placed",
        },
        history: { type: [historySchema], default: [] },
    },
    { timestamps: true }
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const Order = mongoose.model("Order", orderSchema);

export default Order;