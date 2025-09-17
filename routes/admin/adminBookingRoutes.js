// src/routes/admin/adminBookingRoutes.js
import express from "express";
import {
  getAllBookings,
  getBookingById,
  updateBookingAdmin,
  deleteBookingAdmin,
} from "../../controllers/admin/adminBookingController.js";
import { protect, admin } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", protect, admin, getAllBookings);
router.get("/:id", protect, admin, getBookingById);
router.put("/:id", protect, admin, updateBookingAdmin);
router.delete("/:id", protect, admin, deleteBookingAdmin);

export default router;
