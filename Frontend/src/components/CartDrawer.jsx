import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function CartDrawer() {
  const { user } = useAuth();
  const { items, isOpen, closeCart, setQty, removeItem, total, error } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && closeCart();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, closeCart]);

  if (!user || !isOpen) return null;

  const hasUnavailable = items.some((l) => !l.available);

  const goCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <div className="drawer-overlay" onClick={closeCart}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="drawer-head">
          <h3>Your cart</h3>
          <button className="drawer-close" onClick={closeCart} aria-label="Close cart">
            ×
          </button>
        </header>

        {error && (
          <p className="drawer-error" role="alert">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <p className="drawer-empty">Your cart is empty. Add something tasty from the menu.</p>
        ) : (
          <ul className="drawer-list">
            {items.map((l) => (
              <li className="drawer-line" key={l.key}>
                <div className="line-info">
                  <strong>{l.name}</strong>
                  {l.choices.length > 0 && (
                    <span className="line-choices">
                      {l.choices.map((c) => c.options.join(", ")).join(" · ")}
                    </span>
                  )}
                  {l.available ? (
                    <span className="line-price">₹{l.unitPrice} each</span>
                  ) : (
                    <span className="line-unavailable">Currently unavailable</span>
                  )}
                </div>
                <div className="line-actions">
                  <div className="qty qty-sm">
                    <button type="button" onClick={() => setQty(l.key, l.qty - 1)} aria-label="Decrease quantity">
                      −
                    </button>
                    <span>{l.qty}</span>
                    <button type="button" onClick={() => setQty(l.key, l.qty + 1)} aria-label="Increase quantity">
                      +
                    </button>
                  </div>
                  <span className="line-total">
                    {l.available ? `₹${l.unitPrice * l.qty}` : "—"}
                  </span>
                  <button type="button" className="line-remove" onClick={() => removeItem(l.key)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <footer className="drawer-foot">
          <div className="drawer-total">
            <span>Subtotal</span>
            <strong>₹{total}</strong>
          </div>
          {hasUnavailable && (
            <p className="line-unavailable">Remove unavailable items to continue.</p>
          )}
          <button
            type="button"
            className="btn btn-solid"
            onClick={goCheckout}
            disabled={items.length === 0 || hasUnavailable}
          >
            Checkout
          </button>
        </footer>
      </aside>
    </div>
  );
}