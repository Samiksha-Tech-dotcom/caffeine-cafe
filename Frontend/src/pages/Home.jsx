import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import OffersSection from "../components/OffersSection.jsx";
import PopularSection from "../components/PopularSection.jsx";
import CategorySection from "../components/CategorySection.jsx";
import AboutSection from "../components/AboutSection.jsx";
import ContactSection from "../components/ContactSection.jsx";

export default function Home() {
  const { user } = useAuth();
  const { hash } = useLocation();
  const firstName = user ? user.name.split(" ")[0] : "";

  // Navbar ke link (jaise /home#about) pe us section tak scroll karo
  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  return (
    <main>
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-greeting">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </span>
          <h1>
            Fresh coffee,
            <em>ready when you are.</em>
          </h1>
          <p>
            Browse the menu, order for pickup or delivery, or reserve a table
            for later.
          </p>
          <div className="hero-actions">
            <Link to="/menu" className="btn btn-solid">View our menu</Link>
            <Link to="/book" className="btn">Book a table</Link>
          </div>
        </div>
      </section>

      <OffersSection />
      <PopularSection />
      <CategorySection />
      <AboutSection />
      <ContactSection />
    </main>
  );
}