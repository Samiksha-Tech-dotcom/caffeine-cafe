import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Offer from "../models/offer.js";
import MenuItem from "../models/MenuItem.js";

// Cancel hue ya payment ke intezaar wale orders ginti mein nahi aate
const COUNTED = { $nin: ["cancelled", "awaiting_payment"] };

// "2026-10-30" format mein aaj ki date
const todayString = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
};

export const getStats = async (req, res) => {
    try {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Aaj ko milake pichle 7 din
        const weekStart = new Date(startOfToday);
        weekStart.setDate(weekStart.getDate() - 6);

        // Agle 2 din mein expire hone wale offers
        const now = new Date();
        const twoDaysLater = new Date(now);
        twoDaysLater.setDate(twoDaysLater.getDate() + 2);

        const [
            todayAgg,
            activeOrders,
            newOrders,
            popular,
            recentOrders,
            bookingsToday,
            activeOffers,
            expiringOffers,
            menuCount,
            soldOutCount,
        ] = await Promise.all([
            Order.aggregate([
                { $match: { createdAt: { $gte: startOfToday }, status: COUNTED } },
                { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
            ]),
            Order.countDocuments({
                status: { $in: ["placed", "preparing", "out_for_delivery", "ready"] },
            }),
            // Naye orders jinpe abhi kuch kiya nahi
            Order.countDocuments({ status: "placed" }),
            Order.aggregate([
                { $match: { createdAt: { $gte: weekStart }, status: COUNTED } },
                { $unwind: "$items" },
                {
                    $group: {
                        _id: "$items.name",
                        qty: { $sum: "$items.qty" },
                        revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.qty"] } },
                    },
                },
                { $sort: { qty: -1 } },
                { $limit: 5 },
            ]),
            Order.find({ status: { $ne: "awaiting_payment" } })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate("user", "name"),
            Booking.find({ date: todayString(), status: "confirmed" })
                .sort({ slot: 1 })
                .populate("table")
                .populate("user", "name"),
            Offer.countDocuments({
                isActive: true,
                $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
            }),
            Offer.find({
                isActive: true,
                expiresAt: { $gt: now, $lte: twoDaysLater },
            })
                .sort({ expiresAt: 1 })
                .select("title expiresAt"),
            MenuItem.countDocuments(),
            MenuItem.countDocuments({ isAvailable: false }),
        ]);

        const today = todayAgg[0] || { orders: 0, revenue: 0 };

        res.status(200).json({
            success: true,
            stats: {
                ordersToday: today.orders,
                revenueToday: today.revenue,
                activeOrders,
                newOrders,
                bookingsToday: bookingsToday.length,
                activeOffers,
                menuCount,
                soldOutCount,
                expiringOffers: expiringOffers.map((o) => ({
                    id: String(o._id),
                    title: o.title,
                    expiresAt: o.expiresAt,
                })),
                popular: popular.map((p) => ({
                    name: p._id,
                    qty: p.qty,
                    revenue: p.revenue,
                })),
                recentOrders: recentOrders.map((o) => ({
                    id: String(o._id),
                    customer: o.user ? o.user.name : "Customer",
                    type: o.type,
                    total: o.total,
                    status: o.status,
                    createdAt: o.createdAt,
                })),
                todayBookings: bookingsToday.map((b) => ({
                    id: String(b._id),
                    slot: b.slot,
                    guests: b.guests,
                    tableNumber: b.table ? b.table.number : null,
                    customer: b.user ? b.user.name : "Customer",
                })),
            },
        });
    } catch (err) {
        console.error("Get stats error:", err.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};