import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
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
});

const vendorProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    city: { type: String, required: true },
    products: [productSchema], // Multiple products
  },
  { timestamps: true }
);

export default mongoose.model("VendorProduct", vendorProductSchema);
