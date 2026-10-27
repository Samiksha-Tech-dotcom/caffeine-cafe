import { useEffect, useState } from "react";
import { API_URL } from "../config.js";

const EMPTY_FORM = {
  title: "",
  description: "",
  tag: "",
  expiresAt: "",
  isActive: true,
  code: "",
  discountType: "percent",
  discountValue: "",
  minOrder: "",
};

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load all offers (active and inactive)
  const loadOffers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/offers/all`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setOffers(data.offers);
      else setError(data.message || "Could not load offers");
    } catch {
      setError("Could not connect to the server");
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  // Fill the form when Edit is clicked
  const startEdit = (offer) => {
    setEditingId(offer._id);
    setForm({
      title: offer.title,
      description: offer.description || "",
      tag: offer.tag || "",
      expiresAt: offer.expiresAt ? offer.expiresAt.slice(0, 10) : "",
      isActive: offer.isActive,
      code: offer.code || "",
      discountType: offer.discountType || "percent",
      discountValue: offer.code ? offer.discountValue : "",
      minOrder: offer.code && offer.minOrder ? offer.minOrder : "",
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Add or update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.code.trim() && !(Number(form.discountValue) > 0)) {
      setError("Enter a discount value for this coupon code");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `${API_URL}/api/offers/${editingId}`
        : `${API_URL}/api/offers`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.message || "Something went wrong");
      } else {
        setSuccess(editingId ? "Offer updated" : "Offer added");
        resetForm();
        loadOffers();
      }
    } catch {
      setError("Could not connect to the server");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this offer?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/api/offers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("Offer deleted");
        loadOffers();
      } else {
        setError(result.message || "Could not delete the offer");
      }
    } catch {
      setError("Could not connect to the server");
    }
  };

  // Turn an offer on or off
  const toggleActive = async (offer) => {
    try {
      await fetch(`${API_URL}/api/offers/${offer._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !offer.isActive }),
      });
      loadOffers();
    } catch {
      setError("Could not connect to the server");
    }
  };

  const isExpired = (offer) =>
    offer.expiresAt && new Date(offer.expiresAt) < new Date();

  // Short text describing the coupon, e.g. "20% off, min order ₹200"
  const couponText = (offer) => {
    if (!offer.code) return "";
    const value =
      offer.discountType === "percent"
        ? `${offer.discountValue}% off`
        : `₹${offer.discountValue} off`;
    const min = offer.minOrder > 0 ? `, min order ₹${offer.minOrder}` : "";
    return `${value}${min}`;
  };

  return (
    <div className="admin-page">
      <h2>Offers</h2>
      <p className="admin-sub">
        Create and manage offers. Add a coupon code if customers should be able to use the
        offer at checkout.
      </p>

      {error && <div className="admin-msg admin-error">{error}</div>}
      {success && <div className="admin-msg admin-success">{success}</div>}

      {/* ---------- Add / Edit form ---------- */}
      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? "Edit offer" : "Add new offer"}</h3>

        <label>Title</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          placeholder="e.g. Cold Coffee Combo"
          required
        />

        <label>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          placeholder="e.g. Get any cold coffee with a brownie at a special price"
        />

        <div className="admin-row">
          <div>
            <label>Badge text</label>
            <input
              name="tag"
              value={form.tag}
              onChange={handleChange}
              placeholder="e.g. 20% OFF"
            />
          </div>
          <div>
            <label>Expires on (optional)</label>
            <input
              name="expiresAt"
              type="date"
              value={form.expiresAt}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* ---------- Coupon (optional) ---------- */}
        <h3 style={{ marginTop: 18 }}>Coupon (optional)</h3>
        <p className="admin-sub" style={{ margin: "0 0 4px" }}>
          Leave the code empty if this offer is only a banner.
        </p>

        <label>Coupon code</label>
        <input
          name="code"
          value={form.code}
          onChange={(e) =>
            setForm({
              ...form,
              code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
            })
          }
          placeholder="e.g. COFFEE20"
          maxLength={20}
        />

        {form.code && (
          <>
            <div className="admin-row">
              <div>
                <label>Discount type</label>
                <select
                  name="discountType"
                  value={form.discountType}
                  onChange={handleChange}
                >
                  <option value="percent">Percent (%)</option>
                  <option value="flat">Flat amount (₹)</option>
                </select>
              </div>
              <div>
                <label>
                  {form.discountType === "percent"
                    ? "Discount (%)"
                    : "Discount amount (₹)"}
                </label>
                <input
                  name="discountValue"
                  type="number"
                  min="1"
                  max={form.discountType === "percent" ? 100 : undefined}
                  value={form.discountValue}
                  onChange={handleChange}
                />
              </div>
            </div>

            <label>Minimum order (₹, optional)</label>
            <input
              name="minOrder"
              type="number"
              min="0"
              value={form.minOrder}
              onChange={handleChange}
              placeholder="e.g. 200"
            />
          </>
        )}

        <div className="admin-checks">
          <label>
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            Active
          </label>
        </div>

        <div className="admin-actions">
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : editingId ? "Update" : "Add offer"}
          </button>
          {editingId && (
            <button type="button" className="admin-btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ---------- Offers list ---------- */}
      <h3 className="admin-list-title">All Offers ({offers.length})</h3>

      <div className="admin-list">
        {offers.map((offer) => (
          <div className="admin-card" key={offer._id}>
            <div className="admin-info">
              <strong>
                {offer.title}
                {offer.tag && <span className="admin-tag">{offer.tag}</span>}
              </strong>
              {offer.description && <span>{offer.description}</span>}
              {offer.code && (
                <span>
                  Code: <b>{offer.code}</b> · {couponText(offer)}
                </span>
              )}
              <span>
                {offer.expiresAt
                  ? `Expires on ${new Date(offer.expiresAt).toLocaleDateString()}`
                  : "No expiry date"}
              </span>
              <span
                className={
                  offer.isActive && !isExpired(offer) ? "admin-ok" : "admin-out"
                }
              >
                {isExpired(offer)
                  ? "Expired"
                  : offer.isActive
                  ? "Active"
                  : "Inactive"}
              </span>
            </div>

            <div className="admin-card-actions">
              <button className="admin-btn" onClick={() => toggleActive(offer)}>
                {offer.isActive ? "Turn off" : "Turn on"}
              </button>
              <button className="admin-btn" onClick={() => startEdit(offer)}>
                Edit
              </button>
              <button
                className="admin-btn admin-btn-danger"
                onClick={() => handleDelete(offer._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {offers.length === 0 && <p>No offers yet.</p>}
      </div>
    </div>
  );
}