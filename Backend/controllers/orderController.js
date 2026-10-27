import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import MenuItem from "../models/MenuItem.js";
import Order from "../models/Order.js";
import { buildLine } from "../utils/pricing.js";
import { applyCoupon } from "../utils/coupon.js";

const DELIVERY_FEE = 30;
const DELIVERY_FEE_FROM = 149; // 149 ya usse upar ke order pe delivery fee lagegi

// Order ka status kahan se kahan jaa sakta hai
const FLOW = {
    delivery: {
        placed: ["preparing", "cancelled"],
        preparing: ["out_for_delivery", "cancelled"],
        out_for_delivery: ["delivered"],
    },
    pickup: {
        placed: ["preparing", "cancelled"],
        preparing: ["ready", "cancelled"],
        ready: ["completed"],
    },
};

const onlineConfigured = () =>
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const present = (o) => ({
    id: String(o._id),
    type: o.type,
    status: o.status,
    phone: o.phone,
    address: o.address && o.address.line1 ? o.address : null,
    note: o.note,
    items: o.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice,
        choices: i.choices.map((c) => ({ group: c.group, options: [...c.options] })),
    })),
    subtotal: o.subtotal,
    couponCode: o.couponCode || "",
    discount: o.discount || 0,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    refundNeeded:
        o.status === "cancelled" && o.paymentMethod === "online" && o.paymentStatus === "paid",
    createdAt: o.createdAt,
    history: o.history,
    nextStatuses: (FLOW[o.type] && FLOW[o.type][o.status]) || [],
    customer: o.user && o.user.name ? { name: o.user.name, email: o.user.email } : null,
});

const bad = (res, message, status = 400) =>
    res.status(status).json({ success: false, message });

// POST /api/orders : cart se order banao
export const placeOrder = async (req, res) => {
    try {
        const { type, phone, address = {}, note = "", paymentMethod = "cash", couponCode = "" } = req.body;

        if (!["delivery", "pickup"].includes(type)) return bad(res, "Choose delivery or pickup");
        if (!["cash", "online"].includes(paymentMethod)) return bad(res, "Choose a payment method");
        if (paymentMethod === "online" && !onlineConfigured()) {
            return bad(res, "Online payments are not available right now. Please choose cash.", 503);
        }
        if (!/^\d{10}$/.test(String(phone))) return bad(res, "Enter a valid 10-digit phone number");
        if (typeof note !== "string" || note.length > 200) return bad(res, "Note is too long");

        let cleanAddress;
        if (type === "delivery") {
            const line1 = String(address.line1 || "").trim();
            const city = String(address.city || "").trim();
            const pincode = String(address.pincode || "").trim();
            if (line1.length < 5) return bad(res, "Enter your full delivery address");
            if (!city) return bad(res, "Enter your city");
            if (!/^\d{6}$/.test(pincode)) return bad(res, "Enter a valid 6-digit pincode");
            cleanAddress = { line1, city, pincode };
        }

        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart || cart.items.length === 0) return bad(res, "Your cart is empty");

        const menu = await MenuItem.find({ _id: { $in: cart.items.map((l) => l.menuItem) } });
        const byId = new Map(menu.map((m) => [String(m._id), m]));

        // Har item dobara server pe check hota hai, browser ke price pe bharosa nahi
        const items = [];
        let subtotal = 0;
        for (const line of cart.items) {
            const m = byId.get(String(line.menuItem));
            if (!m) {
                return bad(res, "An item in your cart is no longer on the menu. Please remove it.", 409);
            }
            let priced;
            try {
                priced = buildLine(
                    m,
                    line.choices.map((c) => ({ group: c.group, options: [...c.options] }))
                );
            } catch (err) {
                return bad(res, `${m.name}: ${err.message}. Please update your cart.`, 409);
            }
            items.push({
                menuItem: m._id,
                name: m.name,
                qty: line.qty,
                unitPrice: priced.unitPrice,
                choices: priced.choices,
            });
            subtotal += priced.unitPrice * line.qty;
        }

        const deliveryFee = type === "delivery" && subtotal >= DELIVERY_FEE_FROM ? DELIVERY_FEE : 0;
        const coupon = await applyCoupon(couponCode, subtotal);
        if (coupon.error) return bad(res, coupon.error);
        const discount = coupon.discount;

        // Online payment wale order tab tak "awaiting_payment" mein rehte hain jab tak payment verify na ho
        const status = paymentMethod === "online" ? "awaiting_payment" : "placed";

        const order = await Order.create({
            user: req.user._id,
            items,
            type,
            phone: String(phone),
            address: cleanAddress,
            note: note.trim(),
            subtotal,
            deliveryFee,
            couponCode: coupon.code,
            discount,
            total: subtotal - discount + deliveryFee,
            paymentMethod,
            status,
            history: [{ status }],
        });

        cart.items = [];
        await cart.save();

        res.status(201).json({ success: true, order: present(order) });
    } catch (err) {
        if (err.name === "ValidationError") {
            return bad(res, Object.values(err.errors)[0].message);
        }
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET /api/orders/mine
export const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
        res.status(200).json({ success: true, orders: orders.map(present) });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// PATCH /api/orders/:id/cancel : customer sirf tab cancel kar sakta hai jab kitchen ne shuru nahi kiya
export const cancelMyOrder = async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.isValidObjectId(id)) return bad(res, "Invalid order");

        const order = await Order.findOne({ _id: id, user: req.user._id });
        if (!order) return bad(res, "Order not found", 404);

        if (!["placed", "awaiting_payment"].includes(order.status)) {
            return bad(res, "This order is already being prepared and cannot be cancelled", 409);
        }
        if (order.paymentStatus === "paid") {
            return bad(
                res,
                "This order is already paid online. Please contact the cafe to cancel and get a refund.",
                409
            );
        }

        order.status = "cancelled";
        order.history.push({ status: "cancelled" });
        await order.save();

        res.status(200).json({ success: true, order: present(order) });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// GET /api/orders?status=placed : staff aur admin ke liye saare orders
export const listOrders = async (req, res) => {
    try {
        const filter = {};
        // Jinki payment baaki hai woh kitchen ko tab tak nahi dikhte
        if (req.query.status) filter.status = String(req.query.status);
        else filter.status = { $ne: "awaiting_payment" };

        const orders = await Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(100)
            .populate("user", "name email");

        res.status(200).json({ success: true, orders: orders.map(present) });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// PATCH /api/orders/:id/status : staff status aage badhata hai
export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        if (!mongoose.isValidObjectId(id)) return bad(res, "Invalid order");

        const order = await Order.findById(id).populate("user", "name email");
        if (!order) return bad(res, "Order not found", 404);

        const allowed = (FLOW[order.type] && FLOW[order.type][order.status]) || [];
        if (!allowed.includes(status)) {
            return bad(res, `Cannot move a ${order.status} order to ${status}`, 409);
        }

        order.status = status;
        order.history.push({ status });

        // Cash order ka paisa tab mila maana jaata hai jab order de diya gaya
        if (["delivered", "completed"].includes(status) && order.paymentMethod === "cash") {
            order.paymentStatus = "paid";
        }
        await order.save();

        res.status(200).json({ success: true, order: present(order) });
    } catch {
        res.status(500).json({ success: false, message: "Server error" });
    }
};