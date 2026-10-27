import mongoose from "mongoose";
import User from "../models/User.js";

const bad = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/admin/team : saare admins ki list
export const listAdmins = async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("name email createdAt")
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      admins: admins.map((a) => ({
        id: String(a._id),
        name: a.name,
        email: a.email,
        isYou: String(a._id) === String(req.user._id),
      })),
    });
  } catch (err) {
    console.error("List admins error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/admin/team : email dekar kisi ko admin banao
export const addAdmin = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    if (!email) return bad(res, "Enter an email address");

    // Capital ya chhote letters ka fark nahi padega
    const user = await User.findOne({
      email: new RegExp(`^${escapeRegex(email)}$`, "i"),
    });

    if (!user) {
      return bad(
        res,
        "No account found with this email. Ask them to sign up first, then try again.",
        404
      );
    }
    if (user.role === "admin") return bad(res, "This person is already an admin", 409);

    // updateOne se sirf role badalta hai, baaki user data ko nahi chhedta
    await User.updateOne({ _id: user._id }, { $set: { role: "admin" } });

    res.status(200).json({
      success: true,
      admin: { id: String(user._id), name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("Add admin error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE /api/admin/team/:id : admin ko wapas customer banao
export const removeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return bad(res, "Invalid user");

    if (String(id) === String(req.user._id)) {
      return bad(res, "You cannot remove your own admin access", 409);
    }

    const user = await User.findById(id);
    if (!user || user.role !== "admin") return bad(res, "Admin not found", 404);

    // Kam se kam ek admin hamesha bacha rehna chahiye
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) return bad(res, "At least one admin must remain", 409);

    await User.updateOne({ _id: user._id }, { $set: { role: "user" } });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Remove admin error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};