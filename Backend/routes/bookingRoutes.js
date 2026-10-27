import express from "express";
import {
  getAvailability,
  getTableMap,
  createBooking,
  getMyBookings,
  cancelBooking,
  listAllBookings,
  adminCancelBooking,
} from "../controllers/bookingController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.get("/availability", getAvailability);
router.get("/tables", getTableMap);
router.get("/mine", getMyBookings);
router.post("/", createBooking);
router.patch("/:id/cancel", cancelBooking);

// Admin only
router.get("/all", adminOnly, listAllBookings);
router.patch("/:id/admin-cancel", adminOnly, adminCancelBooking);

export default router;