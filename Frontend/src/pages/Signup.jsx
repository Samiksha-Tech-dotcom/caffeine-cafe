import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_URL } from "../config.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Signup() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        return;
      }
      setUser(data.user);
      navigate("/home");
    } catch {
      setError("Cannot reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Create your account</h2>
        <input name="name" placeholder="Full name" value={form.name} onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input name="phone" placeholder="Phone number" value={form.phone} onChange={handleChange} />
        <input name="password" type="password" placeholder="Password (min 8 characters)" value={form.password} onChange={handleChange} minLength={8} required />

        {error && <p style={{ color: "#e58b7b" }}>{error}</p>}

        <button className="btn btn-solid" type="submit" disabled={loading}>
          {loading ? "Creating..." : "Sign Up"}
        </button>
        <p>Already registered? <Link to="/login">Login</Link></p>
      </form>
    </div>
  );
}