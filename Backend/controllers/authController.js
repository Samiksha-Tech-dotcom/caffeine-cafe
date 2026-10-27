import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Token banao aur cookie mein bhej do
const sendToken = (res, user, status = 200) => {
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:"/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(status).json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

export const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Name, email and password are required" });
    }
    if (password.length < 8) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 8 characters" });
    }

    // role request se nahi lete, taaki koi khud ko admin na bana sake
    const user = await User.create({ name, email, phone, password });
    sendToken(res, user, 201);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ success: false, message: "Email already registered" });
    }
    if (err.name === "ValidationError") {
      return res
        .status(400)
        .json({ success: false, message: Object.values(err.errors)[0].message });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }

    sendToken(res, user);
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


export const logout = (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
  });

  res.status(200).json({
    success: true,
    message: "Logged out",
  });
};


export const getMe = (req, res) => {
  const user = req.user;
  res.status(200).json({
    success: true,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};