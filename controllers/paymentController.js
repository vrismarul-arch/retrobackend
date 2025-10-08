// src/controllers/paymentController.js

import mongoose from "mongoose";
import crypto from "crypto";
import Razorpay from "razorpay";

// Import necessary Models and Helpers
import Booking from "../models/Booking.js"; 
import Payment from "../models/Payment.js";   
import Product from "../models/Product.js";   
import Partner from "../models/partners/Partner.js"; 
import Notification from "../models/partners/Notification.js"; 
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


// ----------------------------------------------------------------
// 1. Create Razorpay order (Stores data in Payment model)
// ----------------------------------------------------------------
export const createOrder = async (req, res) => {
  try {
    const {
      name, email, phone, address, location, 
      products, totalAmount, paymentMethod, 
    } = req.body;

    if (!name || !email || !phone || !address || !products || !totalAmount || paymentMethod !== "online")
        return res.status(400).json({ error: "All fields are required and payment method must be online" });

    // Validate products (Ensure product IDs exist)
    const productIds = products.map(p => p.productId);
    const fetchedProducts = await Product.find({ _id: { $in: productIds } });
    if (fetchedProducts.length !== products.length)
      return res.status(400).json({ error: "Some products are invalid" });

    // Create Razorpay order
    const amountInPaise = Math.round(totalAmount * 100);
    const options = {
      amount: amountInPaise, 
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    };
    const order = await razorpay.orders.create(options);

    // Save payment and the temporary booking data in the Payment model ONLY
    const payment = await Payment.create({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: "created",
      user: req.user?._id || null, 
      bookingData: { // Data used later to create the final Booking document
        user: req.user?._id || null,
        name,
        email,
        phone,
        address,
        location,
        products,
        totalAmount,
        paymentMethod,
        status: "pending",
        deliveryStatus: "pending"
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      paymentId: payment._id, // Crucial ID returned to frontend for verification
    });
  } catch (err) {
    console.error("Create order error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ----------------------------------------------------------------
// 2. Verify Razorpay payment and FINALIZE BOOKING 
// ----------------------------------------------------------------
export const verifyPayment = async (req, res) => {
  try {
    // Backend expects 'paymentId'
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentId } = req.body; 

    // 1. Fetch Payment record using its MongoDB ID
    const paymentRecord = await Payment.findById(paymentId);
    
    if (!paymentRecord || paymentRecord.orderId !== razorpay_order_id) {
        return res.status(404).json({ success: false, message: "Payment record not found or order ID mismatch" });
    }

    // 2. Signature check
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      // Payment FAILED
      paymentRecord.paymentId = razorpay_payment_id;
      paymentRecord.signature = razorpay_signature;
      paymentRecord.status = "failed";
      await paymentRecord.save();
      return res.status(400).json({ success: false, message: "Payment verification failed: Invalid signature" });
    }

    // 3. Payment SUCCESS - Create the final Booking document
    const bookingData = paymentRecord.bookingData;
    const booking = new Booking({
        ...bookingData, 
        status: "confirmed", // Confirmed upon successful payment
        deliveryStatus: "processing", 
        paymentMethod: "razorpay" 
    });

    await booking.save();

    // 4. Update Payment status and link to the new Booking
    paymentRecord.paymentId = razorpay_payment_id;
    paymentRecord.signature = razorpay_signature;
    paymentRecord.status = "paid";
    paymentRecord.booking = booking._id;
    await paymentRecord.save();

    // 5. Notify partners
    await notifyPartners(booking, "New paid booking");

    res.json({
      success: true,
      message: "Payment verified and booking confirmed successfully",
      booking: { ...booking.toObject(), deliveryStatus: booking.deliveryStatus },
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    try {
        // Attempt to update payment status to error on internal failure
        await Payment.findByIdAndUpdate(req.body.paymentId, { status: "error" });
    } catch (e) {
        console.error("Failed to update payment status to error:", e);
    }
    res.status(500).json({ success: false, error: err.message });
  }
};