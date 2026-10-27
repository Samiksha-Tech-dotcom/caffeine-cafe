import crypto from "crypto";
import mongoose from "mongoose";
import Order from "../models/Order.js";

const configured = () =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const bad = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

// POST /api/payments/create : Razorpay pe order banao
export const createPayment = async (req, res) => {
  try {
    if (!configured()) return bad(res, "Online payments are not configured", 503);

    const { orderId } = req.body;
    if (!mongoose.isValidObjectId(orderId)) return bad(res, "Invalid order");

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return bad(res, "Order not found", 404);
    if (order.paymentMethod !== "online") return bad(res, "This order is not an online payment order");
    if (order.paymentStatus === "paid") return bad(res, "This order is already paid", 409);
    if (order.status !== "awaiting_payment") return bad(res, "This order can no longer be paid", 409);

    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString("base64");

    // Amount hamesha server ke order se aata hai, browser se nahi
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(order.total * 100), // paise mein
        currency: "INR",
        receipt: `ord_${String(order._id).slice(-12)}`,
        notes: { orderId: String(order._id) },
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      console.error("Razorpay error:", data.error && data.error.description);
      return bad(res, "Could not start the payment. Please try again.", 502);
    }

    order.razorpayOrderId = data.id;
    await order.save();

    res.status(200).json({
      success: true,
      keyId: process.env.RAZORPAY_KEY_ID, // yeh public key hai, secret nahi
      razorpayOrderId: data.id,
      amount: data.amount,
      currency: data.currency,
      phone: order.phone,
    });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/payments/verify : payment ki signature check karo
export const verifyPayment = async (req, res) => {
  try {
    if (!configured()) return bad(res, "Online payments are not configured", 503);

    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const parts = [razorpay_order_id, razorpay_payment_id, razorpay_signature];

    if (
      !mongoose.isValidObjectId(orderId) ||
      !parts.every((v) => typeof v === "string" && v.length > 0)
    ) {
      return bad(res, "Invalid payment details");
    }

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) return bad(res, "Order not found", 404);

    if (order.paymentStatus === "paid") return res.status(200).json({ success: true });
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) {
      return bad(res, "Payment does not match this order");
    }
    if (order.status !== "awaiting_payment") {
      return bad(res, "This order can no longer be paid", 409);
    }

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const a = Buffer.from(expected);
    const b = Buffer.from(razorpay_signature);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return bad(res, "Payment verification failed");
    }

    order.paymentStatus = "paid";
    order.razorpayPaymentId = razorpay_payment_id;
    order.status = "placed";
    order.history.push({ status: "placed" });
    await order.save();

    res.status(200).json({ success: true });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};