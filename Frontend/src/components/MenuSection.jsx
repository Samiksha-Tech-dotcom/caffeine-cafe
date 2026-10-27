import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_URL } from "../config.js";
import { useCart } from "../context/CartContext.jsx";
import { useSaved } from "../context/SavedContext.jsx";
import MenuCard from "./MenuCard.jsx";
import ProductModal from "./ProductModal.jsx";

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "coffee", label: "Coffee" },
  { value: "cold-drinks", label: "Cold drinks" },
  { value: "snacks", label: "Snacks" },
  { value: "desserts", label: "Desserts" },
  { value: "mains", label: "Mains" },
];

export default function MenuSection() {
  const { addItem, openCart } = useCart();
  const { savedIds, toggleSaved } = useSaved();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [veg, setVeg] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null); // jis product pe click hua

  // Category URL se aati hai: /menu?category=coffee
  const category = searchParams.get("category") || "";
  const setCategory = (value) => {
    if (value) setSearchParams({ category: value });
    else setSearchParams({});
  };

  useEffect(() => {
    let ignore = false;

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (veg) params.set("veg", veg);
    if (search.trim()) params.set("search", search.trim());

    setLoading(true);
    setError("");

    fetch(`${API_URL}/api/menu?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.success) setItems(data.items);
        else setError("Could not load the menu.");
      })
      .catch(() => {
        if (!ignore) setError("Could not reach the server. Please try again.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [category, veg, search]);

  const handleAdd = (order) => {
    addItem(order);
    setActive(null);
    openCart();
  };

  return (
    <section id="menu" className="home-section">
      <h2>Our menu</h2>

      <div className="menu-filters">
        <div className="chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`chip ${category === c.value ? "active" : ""}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="filter-inputs">
          <input
            type="search"
            placeholder="Search the menu"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search the menu"
          />
          <select value={veg} onChange={(e) => setVeg(e.target.value)} aria-label="Veg filter">
            <option value="">Veg & non-veg</option>
            <option value="true">Veg only</option>
            <option value="false">Non-veg only</option>
          </select>
        </div>
      </div>

      {loading && <p className="muted">Loading menu...</p>}
      {error && <p className="muted">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="muted">No items match your filters.</p>
      )}

      <div className="menu-grid">
        {items.map((item) => (
          <MenuCard key={item._id} item={item} onOpen={setActive} />
        ))}
      </div>

      {active && (
        <ProductModal
          key={active._id}
          item={active}
          onClose={() => setActive(null)}
          onAdd={handleAdd}
          isSaved={savedIds.includes(active._id)}
          onToggleSaved={toggleSaved}
        />
      )}
    </section>
  );
}