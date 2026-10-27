import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { payForOrder } from "../utils/payment.js";

// Sirf dikhane ke liye. Asli price aur rules server hi tay karta hai
const DELIVERY_FEE = 30;
const DELIVERY_FEE_FROM = 149; // 149 ya usse upar ke delivery order pe fee lagegi

export default function Checkout() {
  const { user } = useAuth();
  const { items, total, clearCart } = useCart();
  const [type, setType] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState({ line1: "", city: "Bengaluru", pincode: "" });
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState(null);
  const [payState, setPayState] = useState("idle"); // idle | paying | paid | failed
  const [payMessage, setPayMessage] = useState("");

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount }
  const [couponError, setCouponError] = useState("");
  const [applying, setApplying] = useState(false);

  const hasUnavailable = items.some((l) => !l.available);
  const fee = type === "delivery" && total >= DELIVERY_FEE_FROM ? DELIVERY_FEE : 0;
  const discount = appliedCoupon ? appliedCoupon.discount : 0;

  const checkCoupon = async (code) => {
    const res = await fetch(`${API_URL}/api/offers/validate`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, subtotal: total }),
    });
    return res.json();
  };

  // Cart badalne par (item add ya hata) coupon dobara check karo
  useEffect(() => {
    if (!appliedCoupon) return;
    let ignore = false;

    checkCoupon(appliedCoupon.code)
      .then((data) => {
        if (ignore) return;
        if (data.success) {
          setAppliedCoupon({ code: data.code, discount: data.discount });
        } else {
          setAppliedCoupon(null);
          setCouponError(data.message || "Coupon removed");
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, appliedCoupon?.code]);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) {
      setCouponError("Enter a coupon code");
      return;
    }

    setCouponError("");
    setApplying(true);
    try {
      const data = await checkCoupon(couponInput);
      if (data.success) {
        setAppliedCoupon({ code: data.code, discount: data.discount });
        setCouponInput("");
      } else {
        setCouponError(data.message || "Could not apply this code");
      }
    } catch {
      setCouponError("Could not reach the server. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError("");
  };

  const runPayment = async (order) => {
    setPayState("paying");
    setPayMessage("");
    const result = await payForOrder({ orderId: order.id, user });
    setPayState(result.ok ? "paid" : "failed");
    setPayMessage(result.ok ? "" : result.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          phone,
          address,
          note,
          paymentMethod,
          couponCode: appliedCoupon ? appliedCoupon.code : "",
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Could not place your order");
        return;
      }

      setPlaced(data.order);
      await clearCart(); // server pe cart khaali ho chuka hai, screen bhi sync karo

      if (data.order.paymentMethod === "online") {
        setSubmitting(false);
        await runPayment(data.order);
      }
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (placed) {
    const shortId = placed.id.slice(-6).toUpperCase();
    const online = placed.paymentMethod === "online";

    return (
      <main className="home-section">
        <div className="order-success">
          {!online && (
            <>
              <h2>Order placed</h2>
              <p className="muted">
                Order #{shortId} · {placed.type === "delivery" ? "Delivery" : "Pickup"} · ₹
                {placed.total} (pay in cash)
              </p>
              <p>We have started on it. You can follow the status in your orders.</p>
            </>
          )}

          {online && payState === "paying" && (
            <>
              <h2>Complete your payment</h2>
              <p className="muted">
                Order #{shortId} · ₹{placed.total}
              </p>
              <p>Finish paying in the payment window. Please do not close this page.</p>
            </>
          )}

          {online && payState === "paid" && (
            <>
              <h2>Payment received</h2>
              <p className="muted">
                Order #{shortId} · {placed.type === "delivery" ? "Delivery" : "Pickup"} · ₹
                {placed.total} paid online
              </p>
              <p>Your order is placed and the kitchen has it.</p>
            </>
          )}

          {online && payState === "failed" && (
            <>
              <h2>Payment pending</h2>
              <p className="muted">
                Order #{shortId} · ₹{placed.total}
              </p>
              <p className="form-error" role="alert">
                {payMessage}
              </p>
              <p>Your order is saved. It goes to the kitchen once the payment is done.</p>
              <button type="button" className="btn btn-solid" onClick={() => runPayment(placed)}>
                Pay now
              </button>
            </>
          )}

          <div className="hero-actions">
            <Link to="/orders" className="btn btn-solid">
              Track my order
            </Link>
            <Link to="/menu" className="btn">
              Order more
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="home-section">
        <h2>Checkout</h2>
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <Link to="/menu" className="btn btn-solid">
            Browse the menu
          </Link>
        </div>
      </main>
    );
  }

  const grandTotal = total - discount + fee;

  return (
    <main className="home-section">
      <h2>Checkout</h2>

      <div className="checkout-grid">
        <form className="panel-card checkout-form" onSubmit={handleSubmit}>
          <div>
            <span className="field-label">How would you like your order?</span>
            <div className="chips">
              <button
                type="button"
                className={`chip ${type === "delivery" ? "active" : ""}`}
                onClick={() => setType("delivery")}
              >
                Delivery
              </button>
              <button
                type="button"
                className={`chip ${type === "pickup" ? "active" : ""}`}
                onClick={() => setType("pickup")}
              >
                Pickup
              </button>
            </div>
          </div>

          <label className="field">
            <span>Phone number</span>
            <input
              type="tel"
              inputMode="numeric"
              pattern="[0-9]{10}"
              maxLength={10}
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              required
            />
          </label>

          {type === "delivery" && (
            <>
              <label className="field">
                <span>Delivery address</span>
                <input
                  type="text"
                  placeholder="House no, street, area"
                  value={address.line1}
                  onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                  required
                />
              </label>
              <div className="booking-fields">
                <label className="field">
                  <span>City</span>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    required
                  />
                </label>
                <label className="field">
                  <span>Pincode</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="560001"
                    value={address.pincode}
                    onChange={(e) =>
                      setAddress({ ...address, pincode: e.target.value.replace(/\D/g, "") })
                    }
                    required
                  />
                </label>
              </div>
            </>
          )}

          <label className="field">
            <span>Note for the kitchen (optional)</span>
            <input
              type="text"
              maxLength={200}
              placeholder="Less spicy, ring the bell..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {/* ---------- Coupon ---------- */}
          <div className="coupon-section">
            <span className="field-label">Coupon code</span>

            {appliedCoupon ? (
              <div className="coupon-applied">
                <span>
                  <strong>{appliedCoupon.code}</strong> applied, you save ₹
                  {appliedCoupon.discount}
                </span>
                <button type="button" className="coupon-remove" onClick={removeCoupon}>
                  Remove
                </button>
              </div>
            ) : (
              <div className="coupon-row">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={couponInput}
                  maxLength={20}
                  onChange={(e) =>
                    setCouponInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
                  }
                  onKeyDown={(e) => {
                    // Enter dabane se poora order submit na ho jaye
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleApplyCoupon();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn"
                  onClick={handleApplyCoupon}
                  disabled={applying}
                >
                  {applying ? "Checking..." : "Apply"}
                </button>
              </div>
            )}

            {couponError && <p className="form-error">{couponError}</p>}
          </div>

          <fieldset className="pay-options">
            <legend className="field-label">Payment</legend>

            <label className={`pay-option ${paymentMethod === "cash" ? "active" : ""}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
              />
              <span>
                <strong>Cash on {type === "delivery" ? "delivery" : "pickup"}</strong>
                <small>Pay when you receive your order</small>
              </span>
            </label>

            <label className={`pay-option ${paymentMethod === "online" ? "active" : ""}`}>
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "online"}
                onChange={() => setPaymentMethod("online")}
              />
              <span>
                <strong>Pay online</strong>
                <small>UPI, card or netbanking via Razorpay</small>
              </span>
            </label>

            {paymentMethod === "online" && (
              <p className="pay-note">
                Test mode: no real money is charged. Use the UPI ID success@razorpay.
              </p>
            )}
          </fieldset>

          {hasUnavailable && (
            <p className="form-error">
              Some items in your cart are unavailable. Remove them to continue.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-solid"
            disabled={submitting || hasUnavailable}
          >
            {submitting
              ? "Placing order..."
              : paymentMethod === "online"
              ? `Pay ₹${grandTotal} online`
              : "Place order (pay in cash)"}
          </button>
        </form>

        <aside className="panel-card">
          <h3 className="sub-heading summary-title">Order summary</h3>
          {items.map((l) => (
            <div className="sum-line" key={l.key}>
              <div>
                <strong>
                  {l.qty} × {l.name}
                </strong>
                {l.choices.length > 0 && (
                  <span className="muted-line">
                    {l.choices.map((c) => c.options.join(", ")).join(" · ")}
                  </span>
                )}
              </div>
              <span>{l.available ? `₹${l.unitPrice * l.qty}` : "—"}</span>
            </div>
          ))}
          <div className="sum-line">
            <span>Subtotal</span>
            <span>₹{total}</span>
          </div>
          {discount > 0 && (
            <div className="sum-line sum-discount">
              <span>Discount ({appliedCoupon.code})</span>
              <span>−₹{discount}</span>
            </div>
          )}
          {type === "delivery" && (
            <div className="sum-line">
              <span>Delivery fee</span>
              <span>{fee === 0 ? "Free" : `₹${fee}`}</span>
            </div>
          )}
          <div className="sum-line sum-total">
            <span>Total</span>
            <span>₹{grandTotal}</span>
          </div>
          {type === "delivery" && (
            <p className="muted-line">
              Delivery is free for orders below ₹{DELIVERY_FEE_FROM}.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}