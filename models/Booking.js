import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true, trim: true }, // Auto-generated ID
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    location: { lat: Number, lng: Number }, // Optional geolocation

    // ✅ Changed serviceId → productId and ref → "Product"
     products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 },
      },
    ],

    totalAmount: { type: Number, required: true },

    paymentMethod: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "picked", "confirmed", "completed", "cancelled"],
      default: "pending",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Partner",
      default: null,
    }, // Partner assigned
  },
  { timestamps: true }
);

// =========================
// Auto-generate bookingId
// =========================
bookingSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastBooking = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });
    let nextId = 1;

    if (lastBooking && lastBooking.bookingId) {
      const lastNum = parseInt(lastBooking.bookingId.split("-")[1], 10);
      if (!isNaN(lastNum)) nextId = lastNum + 1;
    }

    this.bookingId = `Retrowoods-${String(nextId).padStart(3, "0")}`;
  }
  next();
});

export default mongoose.model("Booking", bookingSchema);
