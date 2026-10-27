import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../config.js";
import { useCart } from "../context/CartContext.jsx";
import { useSaved } from "../context/SavedContext.jsx";
import MenuCard from "../components/MenuCard.jsx";
import ProductModal from "../components/ProductModal.jsx";

export default function Saved() {
  const { savedIds, toggleSaved } = useSaved();
  const { addItem, openCart } = useCart();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);

  useEffect(() => {
    let ignore = false;

    fetch(`${API_URL}/api/menu`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return;
        if (data.success) setItems(data.items);
        else setError("Could not load your saved dishes.");
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
  }, []);

  const handleAdd = (order) => {
    addItem(order);
    setActive(null);
    openCart();
  };

  const shown = items.filter((i) => savedIds.includes(i._id));

  return (
    <main className="home-section">
      <h2>Saved dishes</h2>
      <p className="muted">Your bookmarked favourites, all in one place.</p>

      {loading && <p className="muted">Loading...</p>}
      {error && <p className="muted">{error}</p>}

      {!loading && !error && shown.length === 0 && (
        <div className="empty-state">
          <p>Nothing saved yet. Open any dish and tap Save to bookmark it.</p>
          <Link to="/home#menu" className="btn btn-solid">Browse the menu</Link>
        </div>
      )}

      <div className="menu-grid">
        {shown.map((item) => (
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
    </main>
  );
}