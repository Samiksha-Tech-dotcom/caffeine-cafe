
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import dns from 'node:dns';
import authRoutes from "./routes/authRoutes.js";
import menuRoutes from "./routes/menuRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import { ensureTables } from "./utils/ensureTables.js";
import orderRoutes from "./routes/orderRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

dns.setServers([
  '8.8.8.8',
  '[2001:4860:4860::8888]',
  '8.8.8.8:1053',
  '[2001:4860:4860::8888]:1053',
]);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/admin/stats", statsRoutes);
app.use("/api/admin/team", teamRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Caffeine API is running ☕",
  });
});

const startServer = async () => {
  await connectDB();
  await ensureTables();

  app.listen(PORT,"0.0.0.0", () => {
    console.log(`Caffeine server running on port ${PORT}`);
  });
};

startServer();
