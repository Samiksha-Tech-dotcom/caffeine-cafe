import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import { payForOrder } from "../utils/payment.js";

const LABEL = {
  awaiting_payment: "Payment pending",
  placed: "Order placed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  ready: "Ready for pickup",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

const when = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const paymentText = (o) => {
  const how = o.paymentMethod === "online" ? "Paid online" : "Cash";
  if (o.paymentMethod === "online") return o.paymentStatus === "paid" ? how : "Online payment pending";
  return o.paymentStatus === "paid" ? "Cash, paid" : "Cash, pay on " + (o.type === "delivery" ? "delivery" : "pickup");
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/orders/mine`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setOrders(data.orders);
      setError("");
    } catch {
      setError("Could not load your orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const handleCancel = async (id) => {
    if (!window.confirm("Cancel this order?")) return;
    setMessage(null);

    try {
      const res = await fetch(`${API_URL}/api/orders/${id}/cancel`, {
        method: "PATCH",
        credentials: "include",
      });
      const data = await res.json();
      setMessage(
        res.ok
          ? { type: "success", text: "Order cancelled." }
          : { type: "error", text: data.message || "Could not cancel the order" }
      );
    } catch {
      setMessage({ type: "error", text: "Could not reach the server. Please try again." });
    }
    load();
  };

  const handlePay = async (id) => {
    setMessage(null);
    setPayingId(id);
    const result = await payForOrder({ orderId: id, user });
    setPayingId(null);
    setMessage(
      result.ok
        ? { type: "success", text: "Payment received. Your order is placed." }
        : { type: "error", text: result.message }
    );
    load();
  };

  return (
    <main className="home-section">
      <h2>My orders</h2>
      <p className="muted">Status updates here automatically.</p>

      {message && (
        <p className={message.type === "error" ? "form-error" : "form-success"} role="alert">
          {message.text}
        </p>
      )}
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="form-error">{error}</p>}

      {!loading && !error && orders.length === 0 && (
        <div className="empty-state">
          <p>You have not placed any orders yet.</p>
          <Link to="/home#menu" className="btn btn-solid">
            Browse the menu
          </Link>
        </div>
      )}

      {orders.map((o) => {
        const canCancel =
          o.status === "awaiting_payment" || (o.status === "placed" && o.paymentStatus !== "paid");

        return (
          <article className="panel-card order-card" key={o.id}>
            <div className="order-head">
              <div>
                <strong>Order #{o.id.slice(-6).toUpperCase()}</strong>
                <span className="muted-line">
                  {when(o.createdAt)} · {o.type === "delivery" ? "Delivery" : "Pickup"}
                </span>
              </div>
              <span className={`badge ${o.status}`}>{LABEL[o.status]}</span>
            </div>

            <ul className="order-items">
              {o.items.map((i, idx) => (
                <li key={idx}>
                  <span>
                    {i.qty} × {i.name}
                    {i.choices.length > 0 && (
                      <span className="muted-line">
                        {i.choices.map((c) => c.options.join(", ")).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span>₹{i.unitPrice * i.qty}</span>
                </li>
              ))}
            </ul>

            <div className="order-totals">
              <span className="muted-line">
                Subtotal ₹{o.subtotal}
                {o.type === "delivery"
                  ? ` · Delivery ${o.deliveryFee === 0 ? "free" : `₹${o.deliveryFee}`}`
                  : ""}
              </span>
              <strong>Total ₹{o.total}</strong>
            </div>
            <p className="muted-line">Payment: {paymentText(o)}</p>

            {o.address && (
              <p className="muted-line">
                Deliver to: {o.address.line1}, {o.address.city} {o.address.pincode}
              </p>
            )}

            <ol className="timeline">
              {o.history.map((h, idx) => (
                <li key={idx}>
                  {LABEL[h.status]} <span>{when(h.at)}</span>
                </li>
              ))}
            </ol>

            {o.refundNeeded && (
              <p className="muted-line">This order was paid online. The cafe will process your refund.</p>
            )}
            {o.status === "placed" && o.paymentMethod === "online" && o.paymentStatus === "paid" && (
              <p className="muted-line">Paid online. To cancel, please contact the cafe.</p>
            )}

            <div className="pay-line">
              {o.status === "awaiting_payment" && (
                <button
                  type="button"
                  className="btn btn-solid"
                  disabled={payingId === o.id}
                  onClick={() => handlePay(o.id)}
                >
                  {payingId === o.id ? "Opening payment..." : `Pay ₹${o.total} now`}
                </button>
              )}
              {canCancel && (
                <button type="button" className="line-remove" onClick={() => handleCancel(o.id)}>
                  Cancel order
                </button>
              )}
            </div>
          </article>
        );
      })}
    </main>
  );
}