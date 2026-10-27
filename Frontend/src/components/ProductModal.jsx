import { useEffect, useState } from "react";

// Har required (single) option mein pehla option pehle se chuna hua rahe
const defaultSelections = (item) => {
  const sel = {};
  (item.customizations || []).forEach((group) => {
    sel[group.name] =
      group.selection === "single" && group.isRequired && group.options.length
        ? [group.options[0].label]
        : [];
  });
  return sel;
};

export default function ProductModal({ item, onClose, onAdd, isSaved, onToggleSaved }) {
  const groups = item.customizations || [];
    const images = item.images && item.images.length ? item.images : item.image ? [item.image] : [];

  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [selected, setSelected] = useState(() => defaultSelections(item));

  // Esc se band ho, aur popup khula ho toh peeche ka page scroll na ho
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const choose = (group, label) => {
    setSelected((prev) => {
      const current = prev[group.name] || [];
      if (group.selection === "single") {
        return { ...prev, [group.name]: [label] };
      }
      return {
        ...prev,
        [group.name]: current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label],
      };
    });
  };

  // Ek item ka price = base price + chune hue options ka extra
  const extra = groups.reduce(
    (sum, group) =>
      sum +
      group.options
        .filter((o) => (selected[group.name] || []).includes(o.label))
        .reduce((s, o) => s + o.priceDelta, 0),
    0
  );
  const unitPrice = item.price + extra;
  const total = unitPrice * qty;

  const handleAdd = () => {
    const choices = groups
      .map((g) => ({ group: g.name, options: selected[g.name] || [] }))
      .filter((c) => c.options.length > 0);
    onAdd({ item, qty, choices, unitPrice });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <button
          type="button"
          className={`modal-save ${isSaved ? "saved" : ""}`}
          onClick={() => onToggleSaved(item._id)}
          aria-pressed={isSaved}
          aria-label={isSaved ? "Remove from saved" : "Save to collection"}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z"
              fill={isSaved ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
          <span>{isSaved ? "Saved" : "Save"}</span>
        </button>

        <div className="modal-gallery">
          <div className="modal-main-img">
            {images[imgIndex] ? (
              <img src={images[imgIndex]} alt={item.name} />
            ) : (
              <div className="menu-img-placeholder">☕</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="modal-thumbs">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  className={`thumb ${i === imgIndex ? "active" : ""}`}
                  onClick={() => setImgIndex(i)}
                  aria-label={`Show photo ${i + 1}`}
                >
                  <img src={src} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal-body">
          <span className="modal-cat">{item.category.replace("-", " ")}</span>
          <div className="modal-title">
            <h3>{item.name}</h3>
            <span
              className={`veg-dot ${item.isVeg ? "veg" : "nonveg"}`}
              title={item.isVeg ? "Vegetarian" : "Non-vegetarian"}
            />
          </div>
          <p className="modal-price">₹{item.price}</p>
          <p className="modal-desc">{item.description}</p>

          {groups.map((group) => (
            <fieldset className="cust-group" key={group.name}>
              <legend className="cust-title">
                {group.name}
                {group.isRequired && <span className="req">Required</span>}
                {group.selection === "multi" && <span className="req">Pick any</span>}
              </legend>
              <div className="cust-options">
                {group.options.map((o) => (
                  <label className="cust-option" key={o.label}>
                    <input
                      type={group.selection === "single" ? "radio" : "checkbox"}
                      name={group.name}
                      checked={(selected[group.name] || []).includes(o.label)}
                      onChange={() => choose(group, o.label)}
                    />
                    <span>
                      {o.label}
                      {o.priceDelta > 0 && <em className="cust-delta">+₹{o.priceDelta}</em>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}

          <div className="modal-footer">
            <div className="qty">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span>{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(20, q + 1))}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="btn btn-solid"
              onClick={handleAdd}
              disabled={!item.isAvailable}
            >
              {item.isAvailable ? `Add to cart · ₹${total}` : "Sold out"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}