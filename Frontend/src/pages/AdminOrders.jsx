import { useEffect, useState } from "react";
import { API_URL } from "../config.js";

const LABELS = {
  awaiting_payment: "Awaiting payment",
  placed: "Placed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  ready: "Ready for pickup",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

const FILTERS = [
  "all",
  "placed",
  "preparing",
  "out_for_delivery",
  "ready",
  "delivered",
  "completed",
  "cancelled",
];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOrders = async () => {
    try {
      const url =
        filter === "all"
          ? `${API_URL}/api/orders`
          : `${API_URL}/api/orders?status=${filter}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
        setError("");
      } else {
        setError(data.message || "Could not load orders");
      }
    } catch {
      setError("Could not connect to the server");
    } finally {
      setLoading(false);
    }
  };

  // Load when the filter changes, and refresh every 30 seconds
  useEffect(() => {
    setLoading(true);
    loadOrders();
    const timer = setInterval(loadOrders, 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const changeStatus = async (order, status) => {
    if (
      status === "cancelled" &&
      !window.confirm("Cancel this order? This cannot be undone.")
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setUpdatingId(order.id);

    try {
      const res = await fetch(`${API_URL}/api/orders/${order.id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.message || "Could not update the status");
      } else {
        setSuccess(`Order moved to "${LABELS[status]}"`);
        loadOrders();
      }
    } catch {
      setError("Could not connect to the server");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="admin-page">
      <h2>Orders</h2>
      <p className="admin-sub">
        View orders and update their status. This page refreshes every 30 seconds.
      </p>

      {error && <div className="admin-msg admin-error">{error}</div>}
      {success && <div className="admin-msg admin-success">{success}</div>}

      <div className="admin-filters">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`admin-chip ${filter === f ? "admin-chip-active" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : LABELS[f]}
          </button>
        ))}
      </div>

      {loading && <p>Loading orders...</p>}

      <div className="admin-list">
        {orders.map((o) => (
          <div className="admin-order" key={o.id}>
            <div className="admin-order-head">
              <div>
                <strong>Order #{o.id.slice(-6).toUpperCase()}</strong>
                <span className="admin-order-time">
                  {new Date(o.createdAt).toLocaleString()}
                </span>
              </div>
              <span className={`admin-status admin-status-${o.status}`}>
                {LABELS[o.status] || o.status}
              </span>
            </div>

            <div className="admin-order-meta">
              <span>
                <b>{o.type === "delivery" ? "Delivery" : "Pickup"}</b>
              </span>
              {o.customer && (
                <span>
                  {o.customer.name} · {o.customer.email}
                </span>
              )}
              <span>Phone: {o.phone}</span>
              {o.address && (
                <span>
                  {o.address.line1}, {o.address.city} - {o.address.pincode}
                </span>
              )}
            </div>

            <div className="admin-order-items">
              {o.items.map((item, idx) => (
                <div key={idx} className="admin-order-item">
                  <span>
                    {item.qty} x {item.name}
                    {item.choices.length > 0 && (
                      <small>
                        {item.choices
                          .map((c) => `${c.group}: ${c.options.join(", ")}`)
                          .join(" | ")}
                      </small>
                    )}
                  </span>
                  <span>₹{item.unitPrice * item.qty}</span>
                </div>
              ))}
            </div>

            {o.note && <p className="admin-order-note">Note: {o.note}</p>}

            <div className="admin-order-foot">
              <div className="admin-order-total">
                <span>
                  Total: <b>₹{o.total}</b>
                  {o.deliveryFee > 0 && ` (incl. ₹${o.deliveryFee} delivery)`}
                </span>
                <span>
                  {o.paymentMethod === "online" ? "Online" : "Cash"} ·{" "}
                  {o.paymentStatus === "paid" ? "Paid" : "Payment pending"}
                </span>
                {o.refundNeeded && (
                  <span className="admin-out">
                    Refund needed (paid online, order cancelled)
                  </span>
                )}
              </div>

              <div className="admin-card-actions">
                {o.nextStatuses.length === 0 && (
                  <span className="admin-order-done">No further actions</span>
                )}
                {o.nextStatuses.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={updatingId === o.id}
                    className={`admin-btn ${
                      s === "cancelled"
                        ? "admin-btn-danger"
                        : "admin-btn-primary"
                    }`}
                    onClick={() => changeStatus(o, s)}
                  >
                    {s === "cancelled" ? "Cancel order" : `Mark ${LABELS[s]}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {!loading && orders.length === 0 && <p>No orders found.</p>}
      </div>
    </div>
  );
}