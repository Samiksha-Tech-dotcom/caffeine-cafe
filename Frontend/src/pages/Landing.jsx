import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import AboutSection from "../components/AboutSection.jsx";
import ContactSection from "../components/ContactSection.jsx";

export default function Landing() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
  }, [hash]);

  return (
    <>
      <main className="hero">
        <div className="hero-copy">
          <h1>
            Pull up a chair,
            <em>or let us bring it over.</em>
          </h1>
          <p>
            Caffeine is a neighbourhood cafe with single-origin coffee, fresh
            food, and tables you can book ahead. Order for pickup or get it
            delivered hot.
          </p>
          <div className="hero-actions">
            <Link to="/signup" className="btn btn-solid">Order now</Link>
            <Link to="/signup" className="btn">Book a table</Link>
          </div>
        </div>

        <div className="hero-visual">
          <img
            src="/hero.png"
            alt="Coffee splashing out of a cup"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>

        <div className="origin">
          <strong>Where our beans grow</strong>
          Coorg · Chikmagalur · Araku
        </div>
      </main>

      <AboutSection />
      <ContactSection />
    </>
  );
}