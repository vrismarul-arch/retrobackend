import Razorpay from "razorpay";
import crypto from "crypto";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ✅ Create Razorpay order + temp booking
export const createOrder = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      products,      // products array
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
      products,       // store products
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
      bookingData: tempBooking,   // optional snapshot
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

// ✅ Verify Razorpay payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = req.body;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const payment = await Payment.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { paymentId: razorpay_payment_id, signature: razorpay_signature, status: "paid" },
        { new: true }
      );

      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        { status: "confirmed", paymentMethod: "razorpay" },
        { new: true }
      );

      payment.booking = booking._id;
      await payment.save();

      return res.json({ success: true, booking });
    } else {
      await Payment.findOneAndUpdate({ orderId: razorpay_order_id }, { status: "failed" });
      return res.status(400).json({ success: false, message: "Invalid signature" });
    }
  } catch (err) {
    console.error("Verify payment error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Cash on Delivery
export const createCODBooking = async (req, res) => {
  try {
    const { name, email, phone, address, products, totalAmount, userId } = req.body;

    const booking = new Booking({
      name,
      email,
      phone,
      address,
      products,          // store products
      totalAmount,
      paymentMethod: "cod",
      status: "confirmed",
      user: userId,
    });

    await booking.save();

    res.json({ success: true, booking });
  } catch (err) {
    console.error("COD booking error:", err);
    res.status(500).json({ error: err.message });
  }
};
