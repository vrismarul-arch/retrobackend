import mongoose from "mongoose";

const vendorProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    city: { type: String, required: true },
    productName: { type: String, required: true },
    dimension: { type: String, required: true },
    productDetails: { type: String, required: true },
    description: { type: String, required: true },
    images: [{ type: String }],
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("VendorProduct", vendorProductSchema);
