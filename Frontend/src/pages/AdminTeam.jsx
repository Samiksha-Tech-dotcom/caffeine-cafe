import { useEffect, useState } from "react";
import { API_URL } from "../config.js";

export default function AdminTeam() {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAdmins = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/team`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) setAdmins(data.admins);
      else setError(data.message || "Could not load the team");
    } catch {
      setError("Could not connect to the server");
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  // Make someone an admin
  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAdding(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/team`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.message || "Something went wrong");
      } else {
        setSuccess(`${result.admin.name} is now an admin`);
        setEmail("");
        loadAdmins();
      }
    } catch {
      setError("Could not connect to the server");
    } finally {
      setAdding(false);
    }
  };

  // Make an admin a normal customer again
  const handleRemove = async (admin) => {
    if (
      !window.confirm(
        `Remove admin access for ${admin.name}? They will become a normal customer.`
      )
    ) {
      return;
    }

    setError("");
    setSuccess("");
    setRemovingId(admin.id);

    try {
      const res = await fetch(`${API_URL}/api/admin/team/${admin.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.message || "Could not remove this admin");
      } else {
        setSuccess(`${admin.name} is no longer an admin`);
        loadAdmins();
      }
    } catch {
      setError("Could not connect to the server");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="admin-page">
      <h2>Team</h2>
      <p className="admin-sub">
        Give someone admin access. They must first sign up on the website with their own
        email, then you can add them here.
      </p>

      {error && <div className="admin-msg admin-error">{error}</div>}
      {success && <div className="admin-msg admin-success">{success}</div>}

      {/* ---------- Add admin ---------- */}
      <form className="admin-form" onSubmit={handleAdd}>
        <h3>Add an admin</h3>

        <label>Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. newadmin@gmail.com"
          required
        />

        <div className="admin-actions">
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={adding}
          >
            {adding ? "Adding..." : "Make admin"}
          </button>
        </div>
      </form>

      {/* ---------- Admin list ---------- */}
      <h3 className="admin-list-title">Admins ({admins.length})</h3>

      <div className="admin-list">
        {admins.map((a) => (
          <div className="admin-card" key={a.id}>
            <div className="admin-info">
              <strong>
                {a.name}
                {a.isYou && <span className="admin-tag">You</span>}
              </strong>
              <span>{a.email}</span>
            </div>

            <div className="admin-card-actions">
              {a.isYou ? (
                <span className="admin-order-done">Cannot remove yourself</span>
              ) : (
                <button
                  type="button"
                  className="admin-btn admin-btn-danger"
                  disabled={removingId === a.id}
                  onClick={() => handleRemove(a)}
                >
                  {removingId === a.id ? "Removing..." : "Remove admin"}
                </button>
              )}
            </div>
          </div>
        ))}

        {admins.length === 0 && <p>No admins found.</p>}
      </div>
    </div>
  );
}