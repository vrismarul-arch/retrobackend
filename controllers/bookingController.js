// src/controllers/bookingController.js

import mongoose from "mongoose";
// Note: We no longer need 'crypto' or 'Razorpay' imports here, 
// as they belong in paymentController.js

import Booking from "../models/Booking.js";
import Product from "../models/Product.js";
import Partner from "../models/partners/Partner.js";
import Notification from "../models/partners/Notification.js";
import Payment from "../models/Payment.js"; // Needed for 'getAllBookings' to link payment info
import { sendPushNotification } from "../utils/pushNotification.js";

// =========================
// Helper: Notify all duty-on partners (Kept here as it's booking-related)
// =========================
const notifyPartners = async (booking, messagePrefix = "New booking") => {
  const availablePartners = await Partner.find({ dutyStatus: true });
  for (let partner of availablePartners) {
    const bookingIdentifier = booking.bookingId || booking._id;
    const text = `${messagePrefix} ${bookingIdentifier} is available`;
    
    const notification = new Notification({
      partner: partner._id,
      booking: booking._id,
      text,
    });
    await notification.save();

    if (partner.pushToken) {
      await sendPushNotification(partner.pushToken, {
        title: "New Order",
        body: text,
        data: { bookingId: booking._id.toString() },
      });
    }
  }
};

// ==========================================================
// 1. Create booking (Manual / COD - Confirms immediately)
// Endpoint: POST /api/bookings
// ==========================================================
export const createBooking = async (req, res) => {
  try {
    const { name, email, phone, address, location, products, totalAmount, paymentMethod } = req.body;

    if (!name || !email || !phone || !address || !products || !totalAmount || !paymentMethod)
      return res.status(400).json({ error: "All fields are required" });

    // Enforce COD for this endpoint (Online payments use /api/payment/create-order)
    if (paymentMethod !== "cod") {
        return res.status(400).json({ error: "Only COD bookings can be created via this endpoint. Use /api/payment/create-order for online payment." });
    }
    
    // Validate products
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
      status: "confirmed", // COD bookings are confirmed immediately
    });

    await booking.save();

    await notifyPartners(booking);

    res.status(201).json({
      message: "Booking created successfully",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus || "pending" },
    });
  } catch (err) {
    console.error("Create booking (COD) error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==========================================================
// 2. Retrieval Endpoints
// ==========================================================

// Fetch user's bookings
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      $or: [{ user: req.user._id }, { user: null, email: req.user.email }],
    })
      .populate("products.productId", "name price image images")
      .populate("assignedTo", "name email phone avatar")
      .lean();

    res.json(
      bookings.map(b => ({
        ...b,
        deliveryStatus: b.deliveryStatus || "pending",
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Get all bookings (admin)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("user", "name email phone")
      .populate("assignedTo", "name email phone avatar")
      .populate("products.productId", "name price image images")
      .lean();

    // Fetch associated payments to show full transaction history
    const bookingIds = bookings.map(b => b._id);
    const payments = await Payment.find({ booking: { $in: bookingIds } }).lean();

    const bookingsWithPayment = bookings.map((b, index) => {
      const payment = payments.find(p => String(p.booking) === String(b._id));
      return {
        ...b,
        bookingId: b.bookingId || `BK-${String(index + 1).padStart(4, "0")}`,
        payment: payment || null,
        deliveryStatus: b.deliveryStatus || "pending",
      };
    });

    res.status(200).json({ bookings: bookingsWithPayment });
  } catch (err) {
    console.error("Failed to fetch all bookings:", err);
    res.status(500).json({ error: "Failed to fetch all bookings" });
  }
};

// Get single booking by ID
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email phone avatar")
      .populate("products.productId", "name price image images")
      .lean();

    if (!booking) return res.status(404).json({ error: "Booking not found" });

    res.json({ booking: { ...booking, deliveryStatus: booking.deliveryStatus || "pending" } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ==========================================================
// 3. Management Endpoints (Admin/User)
// ==========================================================

// Update booking (status / assign partner / deliveryStatus)
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
      booking: { ...updatedBooking, deliveryStatus: updatedBooking.deliveryStatus || "pending" },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Delete booking (user/admin)
export const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.user && req.user && booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ error: "Not authorized" });

    await booking.deleteOne();
    res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Cancel booking (user action)
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // only booking owner or admin
    if (booking.user && req.user && booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (booking.status === "completed") {
      return res.status(400).json({ error: "Completed bookings cannot be cancelled" });
    }
    
    // Note: Actual refund logic (if payment was online) should be handled here

    booking.status = "cancelled";
    booking.deliveryStatus = "cancelled";
    booking.cancelReason = req.body.reason || "No reason provided"; 

    await booking.save();

    res.json({
      message: "Booking cancelled successfully",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus },
    });
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ==========================================================
// 4. Partner/Delivery Endpoints
// ==========================================================

export const pickOrder = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.assignedTo && booking.assignedTo.toString() !== req.partner._id.toString()) 
        return res.status(400).json({ error: "Already picked by another partner" });

    booking.assignedTo = req.partner._id;
    booking.status = "picked";
    booking.deliveryStatus = "out_for_delivery"; 
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
    booking.deliveryStatus = "processing"; 
    booking.assignedTo = req.partner?._id || booking.assignedTo; 
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
    const booking = await Booking.findById(req.params.id).populate("products.productId");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.status !== "confirmed" && booking.status !== "picked") {
      return res.status(400).json({ error: "Booking must be confirmed or picked before completing" });
    }

    // Update each product's stock
    for (const item of booking.products) {
      const product = item.productId;
      if (!product) continue; 

      const qty = item.quantity || 1;
      const newStock = Math.max((product.stock || 0) - qty, 0); 

      await Product.findByIdAndUpdate(product._id, { $set: { stock: newStock } });
    }

    booking.status = "completed";
    booking.deliveryStatus = "delivered";
    await booking.save();

    res.json({
      message: "Booking completed successfully and stock updated",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus },
    });
  } catch (err) {
    console.error("Error completing booking:", err);
    res.status(500).json({ error: err.message });
  }
};

export const rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.status = "rejected";
    booking.deliveryStatus = "cancelled"; 
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

// ==========================================================
// 5. Utility Endpoints
// ==========================================================

// Partner notifications
export const getPartnerNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ partner: req.partner._id })
      .populate("booking")
      .sort({ createdAt: -1 })
      .lean();

    const result = notifications.map(n => ({
      ...n,
      booking: n.booking ? { ...n.booking, deliveryStatus: n.booking.deliveryStatus || "pending" } : null,
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// Fix old bookings (for associating guest bookings with a new user account)
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