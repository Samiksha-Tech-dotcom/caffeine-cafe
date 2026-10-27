import { useEffect, useState } from "react";
import { API_URL } from "../config.js";
import { useCart } from "../context/CartContext.jsx";
import { useSaved } from "../context/SavedContext.jsx";
import MenuCard from "./MenuCard.jsx";
import ProductModal from "./ProductModal.jsx";

export default function PopularSection() {
  const { addItem, openCart } = useCart();
  const { savedIds, toggleSaved } = useSaved();
  const [items, setItems] = useState([]);
  const [active, setActive] = useState(null); // jis product pe click hua

  useEffect(() => {
    let ignore = false;

    fetch(`${API_URL}/api/menu/popular`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) setItems(data.items);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  const handleAdd = (order) => {
    addItem(order);
    setActive(null);
    openCart();
  };

  // Koi item nahi hai to section dikhana hi nahi
  if (items.length === 0) return null;

  return (
    <section id="popular" className="home-section">
      <h2>Most ordered</h2>
      <p className="muted">What our customers keep coming back for.</p>

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