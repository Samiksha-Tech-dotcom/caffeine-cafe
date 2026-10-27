import { Link } from "react-router-dom";

const CATEGORIES = [
  { value: "coffee", label: "Coffee", icon: "🫘" },
  { value: "cold-drinks", label: "Cold drinks", icon: "🧋" },
  { value: "snacks", label: "Snacks", icon: "🥪" },
  { value: "desserts", label: "Desserts", icon: "🍰" },
  { value: "mains", label: "Mains", icon: "🍜" },
];

export default function CategorySection() {
  return (
    <section id="categories" className="home-section">
      <h2>Browse by category</h2>

      <div className="category-grid">
        {CATEGORIES.map((c) => (
          <Link
            key={c.value}
            to={`/menu?category=${c.value}`}
            className="category-tile"
          >
            <span className="category-icon" aria-hidden="true">
              {c.icon}
            </span>
            <span>{c.label}</span>
          </Link>
        ))}
      </div>

      <div className="explore-cta">
        <p>Looking for something else?</p>
        <Link to="/menu" className="btn btn-solid">
          Explore our full menu
        </Link>
      </div>
    </section>
  );
}