import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, unique: true, trim: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    location: { lat: Number, lng: Number },

    products: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 },
      },
    ],
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Partner", default: null }, // ✅ add this

    totalAmount: { type: Number, required: true },
    paymentMethod: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "picked", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    deliveryStatus: {
      type: String,
      enum: ["pending", "processing", "shipping", "delivered", "cancelled"], // ✅ fixed
      default: "pending",
    },

    cancelReason: { type: String, default: "" }, // ✅ stores reason
  },
  { timestamps: true }
);

// Auto-generate bookingId
bookingSchema.pre("save", async function (next) {
  if (this.isNew) {
    const lastBooking = await this.constructor.findOne({}, {}, { sort: { createdAt: -1 } });
    let nextId = 1;
    if (lastBooking?.bookingId) {
      const lastNum = parseInt(lastBooking.bookingId.split("-")[1], 10);
      if (!isNaN(lastNum)) nextId = lastNum + 1;
    }
    this.bookingId = `Retrowoods-${String(nextId).padStart(3, "0")}`;
  }
  next();
});

export default mongoose.model("Booking", bookingSchema);
