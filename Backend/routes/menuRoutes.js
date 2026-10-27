import express from "express";
import {
  getMenuItems,
  getMenuItemById,
  getPopularItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from "../controllers/menuController.js";

import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { upload } from "../config/cloudinary.js";

const router = express.Router();

// Public menu routes
router.get("/", getMenuItems);
router.get("/popular", getPopularItems); // "/:id" se pehle hi rehna chahiye
router.get("/:id", getMenuItemById);

// Admin-only routes
router.post("/", protect, adminOnly, upload.single("image"), createMenuItem);
router.put("/:id", protect, adminOnly, upload.single("image"), updateMenuItem);
router.delete("/:id", protect, adminOnly, deleteMenuItem);

export default router;