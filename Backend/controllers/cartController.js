import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import MenuItem from "../models/MenuItem.js";
import { buildLine } from "../utils/pricing.js";

const MAX_QTY = 20;

const plainChoices = (choices) =>
  choices.map((c) => ({ group: c.group, options: [...c.options] }));

const parseQty = (value, fallback) => {
  const n = value === undefined ? fallback : Number(value);
  return Number.isInteger(n) ? n : null;
};

const getOrCreateCart = (userId) =>
  Cart.findOneAndUpdate(
    { user: userId },
    { $setOnInsert: { items: [] } },
    { upsert: true, new: true }
  );

// Cart ko frontend ke liye taiyaar karo: price hamesha server nikalta hai
const present = async (cart) => {
  const ids = cart.items.map((l) => l.menuItem);
  const menu = await MenuItem.find({ _id: { $in: ids } });
  const byId = new Map(menu.map((m) => [String(m._id), m]));

  const lines = [];
  let total = 0;

  for (const line of cart.items) {
    const m = byId.get(String(line.menuItem));
    if (!m) continue; // item menu se hat chuka hai

    const choices = plainChoices(line.choices);
    let priced = null;
    try {
      priced = buildLine(m, choices);
    } catch {
      priced = null; // ab available nahi hai, ya options badal gaye
    }

    const unitPrice = priced ? priced.unitPrice : m.price;
    lines.push({
      key: String(line._id),
      itemId: String(m._id),
      name: m.name,
      image: (m.images && m.images[0]) || "",
      qty: line.qty,
      unitPrice,
      choices,
      available: Boolean(priced),
    });
    if (priced) total += unitPrice * line.qty;
  }

  return { items: lines, total };
};

export const getCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    res.status(200).json({ success: true, ...(await present(cart)) });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { itemId, choices = [] } = req.body;
    const qty = parseQty(req.body.qty, 1);

    if (!mongoose.isValidObjectId(itemId)) {
      return res.status(400).json({ success: false, message: "Invalid item" });
    }
    if (qty === null || qty < 1 || qty > MAX_QTY) {
      return res
        .status(400)
        .json({ success: false, message: `Quantity must be between 1 and ${MAX_QTY}` });
    }

    const menuItem = await MenuItem.findById(itemId);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    let line;
    try {
      line = buildLine(menuItem, choices);
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    const cart = await getOrCreateCart(req.user._id);
    const signature = JSON.stringify(line.choices);

    // Wahi dish wahi customization ke saath ho toh quantity badhao
    const existing = cart.items.find(
      (l) =>
        String(l.menuItem) === String(menuItem._id) &&
        JSON.stringify(plainChoices(l.choices)) === signature
    );

    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + qty);
    else cart.items.push({ menuItem: menuItem._id, qty, choices: line.choices });

    await cart.save();
    res.status(201).json({ success: true, ...(await present(cart)) });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateCartLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    const qty = parseQty(req.body.qty, null);

    if (!mongoose.isValidObjectId(lineId)) {
      return res.status(400).json({ success: false, message: "Invalid cart line" });
    }
    if (qty === null) {
      return res
        .status(400)
        .json({ success: false, message: "Quantity must be a whole number" });
    }

    const cart = await getOrCreateCart(req.user._id);
    const line = cart.items.id(lineId);
    if (!line) {
      return res.status(404).json({ success: false, message: "Cart line not found" });
    }

    if (qty < 1) cart.items.pull(lineId);
    else line.qty = Math.min(MAX_QTY, qty);

    await cart.save();
    res.status(200).json({ success: true, ...(await present(cart)) });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const removeCartLine = async (req, res) => {
  try {
    const { lineId } = req.params;
    if (!mongoose.isValidObjectId(lineId)) {
      return res.status(400).json({ success: false, message: "Invalid cart line" });
    }

    const cart = await getOrCreateCart(req.user._id);
    if (!cart.items.id(lineId)) {
      return res.status(404).json({ success: false, message: "Cart line not found" });
    }

    cart.items.pull(lineId);
    await cart.save();
    res.status(200).json({ success: true, ...(await present(cart)) });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const clearCart = async (req, res) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    await cart.save();
    res.status(200).json({ success: true, items: [], total: 0 });
  } catch {
    res.status(500).json({ success: false, message: "Server error" });
  }
};