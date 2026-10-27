export default function ContactSection() {
  return (
    <section id="contact" className="info-section">
      <h2>Visit or contact us</h2>
      <div className="info-grid">
        <div className="info-card">
          <h3>Address</h3>
          <p>123 Coffee Street, Bengaluru</p>
        </div>
        <div className="info-card">
          <h3>Hours</h3>
          <p>Every day, 8:00 AM to 10:00 PM</p>
        </div>
        <div className="info-card">
          <h3>Get in touch</h3>
          <p>+91 98765 43210<br />hello@caffeine.cafe</p>
        </div>
      </div>
    </section>
  );
}