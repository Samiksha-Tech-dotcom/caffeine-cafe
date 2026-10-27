import express from "express";
import { listAdmins, addAdmin, removeAdmin } from "../controllers/teamController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect, adminOnly);

router.get("/", listAdmins);
router.post("/", addAdmin);
router.delete("/:id", removeAdmin);

export default router;