import express from "express";
import {
  getActiveOffers,
  getAllOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  validateCoupon,
} from "../controllers/offerController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public: customers ko active offers dikhane ke liye
router.get("/", getActiveOffers);

// Logged-in customer: checkout pe code check karna
router.post("/validate", protect, validateCoupon);

// Admin only
router.get("/all", protect, adminOnly, getAllOffers);
router.post("/", protect, adminOnly, createOffer);
router.put("/:id", protect, adminOnly, updateOffer);
router.delete("/:id", protect, adminOnly, deleteOffer);

export default router;