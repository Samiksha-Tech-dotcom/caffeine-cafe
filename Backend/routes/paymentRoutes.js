import express from "express";
import { createPayment, verifyPayment } from "../controllers/paymentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

router.post("/create", createPayment);
router.post("/verify", verifyPayment);

export default router;