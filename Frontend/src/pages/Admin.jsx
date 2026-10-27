import { useEffect, useState } from "react";
import { API_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";

const CATEGORIES = ["coffee", "cold-drinks", "snacks", "desserts", "mains"];

const EMPTY_FORM = {
  name: "",
  description: "",
  price: "",
  category: "coffee",
  isVeg: true,
  isAvailable: true,
};

const EMPTY_GROUP = {
  name: "",
  selection: "single",
  isRequired: false,
  options: [{ label: "", priceDelta: "" }],
};

export default function Admin() {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customizations, setCustomizations] = useState([]);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [fileKey, setFileKey] = useState(0); // used to reset the file input
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load menu items
  const loadItems = async () => {
    try {
      const res = await fetch(`${API_URL}/api/menu`, { credentials: "include" });
      const data = await res.json();
      if (data.success) setItems(data.items);
      else setError(data.message || "Could not load menu");
    } catch {
      setError("Could not connect to the server");
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  // Form inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  // Show a preview when an image is selected
  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  // ---------- Customization helpers ----------
  const addGroup = () =>
    setCustomizations([
      ...customizations,
      { ...EMPTY_GROUP, options: [{ label: "", priceDelta: "" }] },
    ]);

  const updateGroup = (gi, patch) =>
    setCustomizations(
      customizations.map((g, i) => (i === gi ? { ...g, ...patch } : g))
    );

  const removeGroup = (gi) =>
    setCustomizations(customizations.filter((_, i) => i !== gi));

  const addOption = (gi) =>
    updateGroup(gi, {
      options: [...customizations[gi].options, { label: "", priceDelta: "" }],
    });

  const updateOption = (gi, oi, patch) =>
    updateGroup(gi, {
      options: customizations[gi].options.map((o, i) =>
        i === oi ? { ...o, ...patch } : o
      ),
    });

  const removeOption = (gi, oi) =>
    updateGroup(gi, {
      options: customizations[gi].options.filter((_, i) => i !== oi),
    });

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setCustomizations([]);
    setImageFile(null);
    setPreview("");
    setEditingId(null);
    setFileKey((k) => k + 1);
  };

  // Fill the form when Edit is clicked
  const startEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price,
      category: item.category,
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
    });
    setCustomizations(
      (item.customizations || []).map((g) => ({
        name: g.name,
        selection: g.selection,
        isRequired: g.isRequired,
        options: g.options.map((o) => ({
          label: o.label,
          priceDelta: o.priceDelta ? String(o.priceDelta) : "",
        })),
      }))
    );
    setImageFile(null);
    setPreview(item.image || "");
    setFileKey((k) => k + 1);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Empty groups and options are removed, and price extras become numbers
  const cleanCustomizations = () =>
    customizations
      .map((g) => ({
        name: g.name.trim(),
        selection: g.selection,
        isRequired: g.isRequired,
        options: g.options
          .map((o) => ({
            label: o.label.trim(),
            priceDelta: Number(o.priceDelta) || 0,
          }))
          .filter((o) => o.label),
      }))
      .filter((g) => g.name && g.options.length > 0);

  // Add or update
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!editingId && !imageFile) {
      setError("Please select an image first");
      return;
    }

    setSaving(true);
    try {
      const data = new FormData();
      data.append("name", form.name);
      data.append("description", form.description);
      data.append("price", form.price);
      data.append("category", form.category);
      data.append("isVeg", form.isVeg);
      data.append("isAvailable", form.isAvailable);
      data.append("customizations", JSON.stringify(cleanCustomizations()));
      if (imageFile) data.append("image", imageFile); // must match upload.single("image") on the backend

      const url = editingId
        ? `${API_URL}/api/menu/${editingId}`
        : `${API_URL}/api/menu`;

      // Do not set Content-Type manually, the browser does it for FormData
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        credentials: "include",
        body: data,
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.message || "Something went wrong");
      } else {
        setSuccess(editingId ? "Item updated" : "Item added");
        resetForm();
        loadItems();
      }
    } catch {
      setError("Could not connect to the server");
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this item?")) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_URL}/api/menu/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("Item deleted");
        loadItems();
      } else {
        setError(result.message || "Could not delete the item");
      }
    } catch {
      setError("Could not connect to the server");
    }
  };

  // Available / Out of stock toggle
  const toggleAvailable = async (item) => {
    try {
      await fetch(`${API_URL}/api/menu/${item._id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      loadItems();
    } catch {
      setError("Could not connect to the server");
    }
  };

  return (
    <div className="admin-page">
      <h2>Admin Dashboard</h2>
      <p className="admin-sub">Logged in as: {user?.name || user?.email}</p>

      {error && <div className="admin-msg admin-error">{error}</div>}
      {success && <div className="admin-msg admin-success">{success}</div>}

      {/* ---------- Add / Edit form ---------- */}
      <form className="admin-form" onSubmit={handleSubmit}>
        <h3>{editingId ? "Edit item" : "Add new item"}</h3>

        <label>Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />

        <label>Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
        />

        <div className="admin-row">
          <div>
            <label>Price (₹)</label>
            <input
              name="price"
              type="number"
              min="0"
              value={form.price}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Category</label>
            <select name="category" value={form.category} onChange={handleChange}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="admin-checks">
          <label>
            <input
              type="checkbox"
              name="isVeg"
              checked={form.isVeg}
              onChange={handleChange}
            />
            Veg
          </label>
          <label>
            <input
              type="checkbox"
              name="isAvailable"
              checked={form.isAvailable}
              onChange={handleChange}
            />
            Available
          </label>
        </div>

        <label>
          Image {editingId && "(upload a new one to replace the current image)"}
        </label>
        <input
          key={fileKey}
          type="file"
          accept="image/*"
          onChange={handleImage}
        />
        {preview && <img className="admin-preview" src={preview} alt="preview" />}

        {/* ---------- Customizations ---------- */}
        <div className="admin-cust">
          <h3>Customizations (optional)</h3>
          <p className="admin-sub" style={{ margin: "0 0 8px" }}>
            Options customers can choose, like Milk or Size. Each option can have an
            extra price.
          </p>

          {customizations.map((group, gi) => (
            <div className="admin-cust-group" key={gi}>
              <div className="admin-cust-head">
                <input
                  value={group.name}
                  onChange={(e) => updateGroup(gi, { name: e.target.value })}
                  placeholder="Group name, e.g. Milk"
                />
                <select
                  value={group.selection}
                  onChange={(e) => updateGroup(gi, { selection: e.target.value })}
                >
                  <option value="single">Choose one</option>
                  <option value="multi">Choose many</option>
                </select>
                <label className="admin-cust-req">
                  <input
                    type="checkbox"
                    checked={group.isRequired}
                    onChange={(e) =>
                      updateGroup(gi, { isRequired: e.target.checked })
                    }
                  />
                  Required
                </label>
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  onClick={() => removeGroup(gi)}
                >
                  Remove group
                </button>
              </div>

              {group.options.map((opt, oi) => (
                <div className="admin-cust-option" key={oi}>
                  <input
                    value={opt.label}
                    onChange={(e) =>
                      updateOption(gi, oi, { label: e.target.value })
                    }
                    placeholder="Option, e.g. Oat milk"
                  />
                  <input
                    type="number"
                    min="0"
                    value={opt.priceDelta}
                    onChange={(e) =>
                      updateOption(gi, oi, { priceDelta: e.target.value })
                    }
                    placeholder="Extra ₹"
                  />
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => removeOption(gi, oi)}
                    aria-label="Remove option"
                  >
                    ×
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="admin-btn"
                onClick={() => addOption(gi)}
              >
                + Add option
              </button>
            </div>
          ))}

          <button type="button" className="admin-btn" onClick={addGroup}>
            + Add customization group
          </button>
        </div>

        <div className="admin-actions">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update" : "Add item"}
          </button>
          {editingId && (
            <button type="button" className="admin-btn" onClick={resetForm}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ---------- Menu list ---------- */}
      <h3 className="admin-list-title">Menu Items ({items.length})</h3>

      <div className="admin-list">
        {items.map((item) => (
          <div className="admin-card" key={item._id}>
            {item.image ? (
              <img src={item.image} alt={item.name} className="admin-thumb" />
            ) : (
              <div className="admin-thumb admin-thumb-empty" />
            )}

            <div className="admin-info">
              <strong>{item.name}</strong>
              <span>
                ₹{item.price} · {item.category} · {item.isVeg ? "Veg" : "Non-veg"}
              </span>
              <span className={item.isAvailable ? "admin-ok" : "admin-out"}>
                {item.isAvailable ? "Available" : "Out of stock"}
              </span>
            </div>

            <div className="admin-card-actions">
              <button className="admin-btn" onClick={() => toggleAvailable(item)}>
                {item.isAvailable ? "Out of stock" : "Mark available"}
              </button>
              <button className="admin-btn" onClick={() => startEdit(item)}>
                Edit
              </button>
              <button
                className="admin-btn admin-btn-danger"
                onClick={() => handleDelete(item._id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

        {items.length === 0 && <p>No items yet.</p>}
      </div>
    </div>
  );
}