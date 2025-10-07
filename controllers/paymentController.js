// src/controllers/bookingController.js

import mongoose from "mongoose";
import crypto from "crypto";
import Razorpay from "razorpay";

import Booking from "../models/Booking.js";
import Product from "../models/Product.js";
import Partner from "../models/partners/Partner.js";
import Notification from "../models/partners/Notification.js";
import Payment from "../models/Payment.js";
import { sendPushNotification } from "../utils/pushNotification.js";

// =========================
// Razorpay Setup
// =========================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// =========================
// Helper: Notify all duty-on partners
// =========================
const notifyPartners = async (booking, messagePrefix = "New booking") => {
  const availablePartners = await Partner.find({ dutyStatus: true });
  for (let partner of availablePartners) {
    const text = `${messagePrefix} ${booking._id} is available`;
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

// =========================
// Create booking (manual / COD)
// =========================
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
      status: paymentMethod === "cod" ? "confirmed" : "pending",
    });

    await booking.save();

    await notifyPartners(booking);

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Create Razorpay order (temporary booking)
// =========================
export const createOrder = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      products,
      totalAmount,
      userId,
      paymentMethod,
    } = req.body;

    // Save temporary booking
    const tempBooking = new Booking({
      name,
      email,
      phone,
      address,
      products,
      totalAmount,
      paymentMethod,
      status: "pending",
      user: userId,
    });

    await tempBooking.save();

    // Create Razorpay order
    const options = {
      amount: Math.round(totalAmount * 100), // in paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };
    const order = await razorpay.orders.create(options);

    // Save payment
    await Payment.create({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      booking: tempBooking._id,
      status: "created",
      user: userId,
      bookingData: tempBooking,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      bookingId: tempBooking._id,
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Verify Razorpay payment and finalize booking
// =========================
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    // Signature check
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      await Payment.findOneAndUpdate({ orderId: razorpay_order_id }, { status: "failed" });
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    // Update payment
    const payment = await Payment.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        paymentId: razorpay_payment_id,
        signature: razorpay_signature,
        status: "paid",
      },
      { new: true }
    );

    // Finalize booking
    const booking = await Booking.findById(bookingId).populate("products.productId");
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    booking.status = "confirmed";
    booking.paymentMethod = "razorpay";
    booking.deliveryStatus = "processing";
    await booking.save();

    // Link payment to booking
    payment.booking = booking._id;
    await payment.save();

    // Notify partners
    await notifyPartners(booking, "New paid booking");

    res.json({
      success: true,
      message: "Payment verified and booking confirmed successfully",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus },
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Create booking for Cash on Delivery (direct confirmation)
// =========================
export const createCODBooking = async (req, res) => {
  try {
    const { name, email, phone, address, products, totalAmount, userId } = req.body;

    const booking = new Booking({
      name,
      email,
      phone,
      address,
      products,
      totalAmount,
      paymentMethod: "cod",
      status: "confirmed",
      user: userId,
      deliveryStatus: "pending",
    });

    await booking.save();

    await notifyPartners(booking);

    res.json({ success: true, booking });
  } catch (err) {
    console.error("COD booking error:", err);
    res.status(500).json({ error: err.message });
  }
};

// =========================
// Other controllers (get, update, cancel, etc.)
// =========================

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

// Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (booking.user && req.user && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (booking.status === "completed") {
      return res.status(400).json({ error: "Completed bookings cannot be cancelled" });
    }

    booking.status = "cancelled";
    booking.deliveryStatus = "cancelled";
    booking.cancelReason = req.body.reason || "No reason provided";

    await booking.save();

    res.json({
      message: "Booking cancelled successfully",
      booking,
    });
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ error: err.message });
  }
};
