export default function AboutSection() {
  return (
    <section id="about" className="info-section">
      <h2>About Caffeine</h2>
      <p>
        Caffeine is a neighbourhood cafe serving single-origin coffee and fresh
        food, made to order. Stay for a slow cup, book a table for friends, or
        have it delivered to your door.
      </p>
      <div className="info-grid">
        <div className="info-card">
          <h3>Quality coffee</h3>
          <p>Beans sourced from Coorg, Chikmagalur and Araku, roasted in small batches.</p>
        </div>
        <div className="info-card">
          <h3>Fresh food</h3>
          <p>Sandwiches, pasta, pizza and desserts prepared fresh every day.</p>
        </div>
        <div className="info-card">
          <h3>Dine in or delivery</h3>
          <p>Reserve a table ahead of time, or order online for pickup and delivery.</p>
        </div>
      </div>
    </section>
  );
}