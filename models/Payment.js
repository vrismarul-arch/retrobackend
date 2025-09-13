import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true },
    paymentId: { type: String },
    signature: { type: String },
    amount: { type: Number, required: true }, // in paise
    currency: { type: String, default: "INR" },
    status: { type: String, enum: ["created", "paid", "failed"], default: "created" },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    bookingData: { type: Object },            // snapshot of booking (optional)
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
