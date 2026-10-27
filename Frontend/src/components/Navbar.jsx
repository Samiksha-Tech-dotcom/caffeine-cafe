import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

const guestLinks = [
  { to: "/", label: "Home" },
  { to: "/#about", label: "About" },
  { to: "/#contact", label: "Contact" },
];

const memberLinks = [
  { to: "/home", label: "Home" },
    { to: "/menu", label: "Menu" },
  { to: "/saved", label: "Saved" },
  { to: "/orders", label: "Orders" },
  { to: "/book", label: "Book a table" },
  { to: "/home#about", label: "About" },
  { to: "/home#contact", label: "Contact" },
];

const adminLinks = [
  { to: "/admin/overview", label: "Overview" },
  { to: "/admin", label: "Menu" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/offers", label: "Offers" },
  { to: "/admin/team", label: "Team" },
];

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const { count, openCart } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isAdmin = user?.role === "admin";
  const links = isAdmin ? adminLinks : user ? memberLinks : guestLinks;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="navbar">
      <Link to={isAdmin ? "/admin/overview" : user ? "/home" : "/"} className="logo">
        <span className="logo-mark">C</span>
        <span className="logo-name">Caffeine</span>
      </Link>

      <nav className="nav-links" aria-label="Main">
        {links.map((l) => (
          <Link key={l.label} to={l.to} className={l.to === pathname ? "active" : ""}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="nav-actions">
        {!loading &&
          (user ? (
            <>
              {!isAdmin && (
                <button
                  type="button"
                  className="pill cart-btn"
                  onClick={openCart}
                  aria-label={`Open cart, ${count} items`}
                >
                  Cart
                  {count > 0 && <span className="cart-badge">{count}</span>}
                </button>
              )}
              <span className="user-name">Hi, {user.name.split(" ")[0]}</span>
              <button className="pill" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="pill">Sign in</Link>
          ))}
      </div>
    </header>
  );
}