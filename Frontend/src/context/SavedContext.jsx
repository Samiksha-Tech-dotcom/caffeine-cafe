import { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "../config.js";
import { useAuth } from "./AuthContext.jsx";

const SavedContext = createContext(null);

export function SavedProvider({ children }) {
  const { user } = useAuth();
  const userId = user ? user.id : null;
  const [savedIds, setSavedIds] = useState([]);

  // Login hote hi database se saved dishes laao
  useEffect(() => {
    if (!userId) {
      setSavedIds([]);
      return;
    }
    let ignore = false;

    fetch(`${API_URL}/api/wishlist`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data) setSavedIds(data.ids);
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [userId]);

  const toggleSaved = async (id) => {
    const wasSaved = savedIds.includes(id);

    // Pehle screen update karo, server fail ho toh wapas karo
    setSavedIds((prev) => (wasSaved ? prev.filter((x) => x !== id) : [...prev, id]));

    try {
      const res = await fetch(`${API_URL}/api/wishlist/${id}`, {
        method: wasSaved ? "DELETE" : "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setSavedIds((prev) => (wasSaved ? [...prev, id] : prev.filter((x) => x !== id)));
    }
  };

  return (
    <SavedContext.Provider value={{ savedIds, toggleSaved }}>
      {children}
    </SavedContext.Provider>
  );
}

export const useSaved = () => useContext(SavedContext);