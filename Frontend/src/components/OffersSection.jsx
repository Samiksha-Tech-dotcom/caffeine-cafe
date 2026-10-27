import { useEffect, useState } from "react";
import { API_URL } from "../config.js";

// "20% off" ya "₹50 off", saath mein minimum order
const discountText = (offer) => {
  const value =
    offer.discountType === "percent"
      ? `${offer.discountValue}% off`
      : `₹${offer.discountValue} off`;
  return offer.minOrder > 0 ? `${value} on orders above ₹${offer.minOrder}` : value;
};

export default function OffersSection() {
  const [offers, setOffers] = useState([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    let ignore = false;

    fetch(`${API_URL}/api/offers`)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) setOffers(data.offers);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, []);

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      // Copy na ho paye to bhi code card pe likha dikhta hai
    }
  };

  // Koi active offer nahi hai to section dikhana hi nahi
  if (offers.length === 0) return null;

  return (
    <section id="offers" className="home-section">
      <h2>Today's offers</h2>

      <div className="offers-grid">
        {offers.map((offer) => (
          <article className="offer-card" key={offer._id}>
            {offer.tag && <span className="offer-tag">{offer.tag}</span>}
            <h3>{offer.title}</h3>
            {offer.description && <p>{offer.description}</p>}

            {offer.code && (
              <div className="offer-coupon">
                <div className="offer-coupon-info">
                  <span className="offer-code">{offer.code}</span>
                  <span className="offer-discount">{discountText(offer)}</span>
                </div>
                <button
                  type="button"
                  className="offer-copy"
                  onClick={() => copyCode(offer.code)}
                >
                  {copied === offer.code ? "Copied" : "Copy"}
                </button>
              </div>
            )}

            {offer.expiresAt && (
              <span className="offer-expiry">
                Valid till {new Date(offer.expiresAt).toLocaleDateString()}
              </span>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}