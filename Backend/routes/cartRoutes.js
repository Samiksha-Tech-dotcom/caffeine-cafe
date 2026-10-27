import express from "express";
import {
  getCart,
  addToCart,
  updateCartLine,
  removeCartLine,
  clearCart,
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect); // cart sirf logged-in user ka

router.get("/", getCart);
router.delete("/", clearCart);
router.post("/items", addToCart);
router.patch("/items/:lineId", updateCartLine);
router.delete("/items/:lineId", removeCartLine);

export default router;