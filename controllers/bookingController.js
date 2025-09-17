// src/controllers/bookingController.js
import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Product from "../models/Product.js";
import Partner from "../models/partners/Partner.js";
import Notification from "../models/partners/Notification.js";
import Payment from "../models/Payment.js";
import { sendPushNotification } from "../utils/pushNotification.js";

export const createBooking = async (req, res) => {
  try {
    const { name, email, phone, address, location, products, totalAmount, paymentMethod } = req.body;

    if (!name || !email || !phone || !address || !products || !totalAmount || !paymentMethod)
      return res.status(400).json({ error: "All fields are required" });

    const productIds = products.map(p => p.productId);
    const fetchedProducts = await Product.find({ _id: { $in: productIds } });
    if (fetchedProducts.length !== products.length)
      return res.status(400).json({ error: "Some products are invalid" });

    const booking = new Booking({
      user: req.user?._id || null,
      name,
      email,
      phone,
      address,
      location,
      products,
      totalAmount,
      paymentMethod,
      deliveryStatus: "pending",
      status: "pending"
    });
    await booking.save();

    // Notify duty-on partners
    const availablePartners = await Partner.find({ dutyStatus: true });
    for (let partner of availablePartners) {
      const text = `New booking ${booking.bookingId || booking._id} is available`;
      const notification = new Notification({ partner: partner._id, booking: booking._id, text });
      await notification.save();

      if (partner.pushToken) {
        await sendPushNotification(partner.pushToken, {
          title: "New Order Available",
          body: text,
          data: { bookingId: booking._id.toString() },
        });
      }
    }

    res.status(201).json({
      message: "Booking successful",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus || "pending" }, // ✅
    });
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Get logged-in user's bookings
// =========================
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [{ user: req.user._id }, { user: null, email: req.user.email }],
    })
      .populate("products.productId", "name price image images")
      .populate("assignedTo", "name email phone avatar")
      .lean();

    const result = bookings.map(b => ({
      ...b,
      deliveryStatus: b.deliveryStatus || "pending", // ✅
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Get all bookings (admin)
// =========================
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email phone")
      .populate("assignedTo", "name email phone avatar")
      .populate("products.productId", "name price image images")
      .lean();

    const bookingIds = bookings.map(b => b._id);
    const payments = await Payment.find({ booking: { $in: bookingIds } }).lean();

    const bookingsWithPayment = bookings.map((b, index) => {
      const payment = payments.find(p => String(p.booking) === String(b._id));
      return {
        ...b,
        bookingId: b.bookingId || `BK-${String(index + 1).padStart(4, "0")}`,
        payment: payment || null,
        deliveryStatus: b.deliveryStatus || "pending", // ✅
      };
    });

    res.status(200).json({ bookings: bookingsWithPayment });
  } catch (err) {
    console.error("Failed to fetch all bookings:", err);
    res.status(500).json({ error: "Failed to fetch all bookings" });
  }
};

// =========================
// Get single booking by ID
// =========================
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email phone avatar")
      .populate("products.productId", "name price image images")
      .lean();

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    res.json({ booking: { ...booking, deliveryStatus: booking.deliveryStatus || "pending" } }); // ✅
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Update booking (status / assign partner / deliveryStatus)
// =========================
export const updateBooking = async (req, res) => {
  try {
    const { status, assignedTo, deliveryStatus } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (status) booking.status = status;
    if (assignedTo) {
      const partner = await Partner.findById(assignedTo);
      if (!partner) return res.status(400).json({ error: "Invalid partner ID" });
      booking.assignedTo = assignedTo;
    }
    if (deliveryStatus) booking.deliveryStatus = deliveryStatus;

    await booking.save();

    const updatedBooking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email phone avatar")
      .populate("products.productId", "name price image images")
      .lean();

    res.json({
      message: "Booking updated successfully",
      booking: { ...updatedBooking, deliveryStatus: updatedBooking.deliveryStatus || "pending" }, // ✅
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Delete booking (user/admin)
// =========================
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.user && req.user && booking.user.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized" });

    await booking.deleteOne();
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Partner actions
// =========================
export const pickOrder = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.assignedTo) return res.status(400).json({ error: "Already picked" });

    booking.assignedTo = req.partner._id;
    booking.status = "picked";
    booking.deliveryStatus = "out_for_delivery"; // ✅
    await booking.save();

    res.json({
      message: "Order picked successfully",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.status = "confirmed";
    booking.deliveryStatus = "processing"; // ✅
    booking.assignedTo = req.partner._id;
    await booking.save();

    res.json({
      message: "Booking confirmed",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "confirmed") {
      return res.status(400).json({ error: "Booking must be confirmed before completing" });
    }

    booking.status = "completed";
    booking.deliveryStatus = "delivered"; // ✅
    await booking.save();

    res.json({
      message: "Booking completed successfully",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.status = "rejected";
    booking.deliveryStatus = "cancelled"; // ✅
    await booking.save();

    res.json({
      message: "Booking rejected",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Partner notifications
// =========================
export const getPartnerNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ partner: req.partner._id })
      .populate("booking")
      .sort({ createdAt: -1 })
      .lean();

    const result = notifications.map(n => ({
      ...n,
      booking: n.booking ? { ...n.booking, deliveryStatus: n.booking.deliveryStatus || "pending" } : null, // ✅
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Fix old bookings
// =========================
export const fixOldBookings = async (req, res) => {
  try {
    const updated = await Booking.updateMany(
      { user: null, email: req.user.email },
      { $set: { user: req.user._id } }
    );
    res.json({ message: "Old bookings updated", modifiedCount: updated.modifiedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
