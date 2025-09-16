// src/controllers/admin/adminBookingController.js
import mongoose from "mongoose";
import Booking from "../../models/Booking.js";
import Payment from "../../models/Payment.js";

// =========================
// Get all bookings (admin) with payments and delivery status
// =========================
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email phone")
      .populate("assignedTo", "name email phone avatar")
      .populate("products.productId", "name price image images")
      .lean();

    const payments = await Payment.find({ booking: { $in: bookings.map(b => b._id) } }).lean();

    const result = bookings.map((b, i) => {
      const payment = payments.find(p => String(p.booking) === String(b._id));
      return {
        ...b,
        bookingId: b.bookingId || `BK-${String(i + 1).padStart(4, "0")}`,
        payment: payment || null,
        deliveryStatus: b.deliveryStatus || "pending",
      };
    });

    res.json({ bookings: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
// =========================
// Get single booking by ID with delivery status and partner info
// =========================
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email phone avatar")
      .populate("products.productId", "name price image images");

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    res.json({
      booking: {
        ...booking.toObject(),
        deliveryStatus: booking.deliveryStatus || "pending",
        assignedTo: booking.assignedTo || null,
      },
    });
  } catch (err) {
    console.error("Error fetching booking:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Update booking (status / assign partner / delivery status)
// =========================
export const updateBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { deliveryStatus, status, assignedTo } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (deliveryStatus !== undefined) booking.deliveryStatus = deliveryStatus;
    if (status !== undefined) booking.status = status;
    if (assignedTo !== undefined) booking.assignedTo = assignedTo;

    await booking.save();

    // Fetch updated booking with populated fields
    const updatedBooking = await Booking.findById(id)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email phone avatar")
      .populate("products.productId", "name price image images")
      .lean();

    res.json({
      message: "Booking updated successfully",
      booking: updatedBooking, // ✅ include updated deliveryStatus
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// =========================
// Delete booking (admin)
// =========================
export const deleteBookingAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ error: "Invalid booking ID" });

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    await booking.deleteOne();

    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error("Failed to delete booking:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
