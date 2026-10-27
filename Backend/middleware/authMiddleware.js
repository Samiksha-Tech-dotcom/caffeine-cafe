import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Check karta hai ki request ke saath valid login cookie hai ya nahi
export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ success: false, message: "Not logged in" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// Sirf admin ko aage jaane do
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") return next();
  res.status(403).json({ success: false, message: "Admin access only" });
};

// Staff aur admin dono ko aage jaane do
export const staffOnly = (req, res, next) => {
  if (req.user && ["staff", "admin"].includes(req.user.role)) return next();
  res.status(403).json({ success: false, message: "Staff access only" });
};