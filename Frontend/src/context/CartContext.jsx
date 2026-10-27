import { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "../config.js";
import { useAuth } from "./AuthContext.jsx";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user ? user.id : null;

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");

  // Cart se jude saare requests yahin se jaate hain
  const call = async (path, options = {}) => {
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/cart${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Something went wrong");
        return false;
      }

      setItems(data.items);
      setTotal(data.total);
      return true;
    } catch {
      setError("Could not reach the server. Please try again.");
      return false;
    }
  };

  // Login hote hi database se cart laao
  useEffect(() => {
    if (!userId) {
      setItems([]);
      setTotal(0);
      return;
    }
    call("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const addItem = ({ item, qty, choices }) =>
    call("/items", {
      method: "POST",
      body: JSON.stringify({ itemId: item._id, qty, choices }),
    });

  const setQty = (key, qty) =>
    call(`/items/${key}`, { method: "PATCH", body: JSON.stringify({ qty }) });

  const removeItem = (key) => call(`/items/${key}`, { method: "DELETE" });
  const clearCart = () => call("", { method: "DELETE" });

  const count = items.reduce((sum, l) => sum + l.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        count,
        total,
        error,
        isOpen,
        openCart: () => setIsOpen(true),
        closeCart: () => {
          setIsOpen(false);
          setError("");
        },
        addItem,
        setQty,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);