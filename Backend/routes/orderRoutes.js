import express from "express";
import {
  placeOrder,
  getMyOrders,
  cancelMyOrder,
  listOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect, staffOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/", placeOrder);
router.get("/mine", getMyOrders);
router.patch("/:id/cancel", cancelMyOrder);

// Sirf staff aur admin
router.get("/", staffOnly, listOrders);
router.patch("/:id/status", staffOnly, updateOrderStatus);

export default router;