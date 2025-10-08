import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createBooking,
  getUserBookings,
  getAllBookings,
  updateBooking,
  deleteBooking,
  fixOldBookings,
  pickOrder,
  cancelBooking,
  confirmBooking,
  completeBooking,
  getBookingById, // Added getBookingById
  rejectBooking // Added rejectBooking
} from "../controllers/bookingController.js";

const router = express.Router();

// Public/User Routes
router.post("/", protect, createBooking); // Used for COD/Manual
router.get("/my", protect, getUserBookings);
router.get("/:id", getBookingById); // Get single booking

// Admin/Internal Routes
router.get("/admin", protect, getAllBookings);
router.put("/:id", protect, updateBooking);
router.delete("/:id", protect, deleteBooking);
router.post("/fix-old", protect, fixOldBookings);

// Partner/Action Routes (Need separate partner protect middleware for real-world)
// Assuming protect handles both user and partner roles or partner routes have different middleware
router.put("/:id/pick", protect, pickOrder);
router.put("/:id/confirm", protect, confirmBooking);
router.put("/:id/complete", protect, completeBooking);
router.put("/:id/cancel", protect, cancelBooking);
router.put("/:id/reject", protect, rejectBooking);

// Approve route alias
router.put("/:id/approve", protect, confirmBooking);

export default router;