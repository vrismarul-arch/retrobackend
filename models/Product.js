import mongoose from "mongoose";

// -------------------- Review Schema --------------------
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    images: [{ type: String }],
  },
  { timestamps: true }
);

// -------------------- Product Schema --------------------
const productSchema = new mongoose.Schema(
  {
    // ✅ Basic Info
    name: { type: String, required: true },
    slug: { type: String },
    description: { type: String, trim: true },
    image: { type: String, trim: true },
    images: [{ type: String, trim: true }],
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },

    // ✅ Relations
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubCategory",
      required: true,
    },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },

    // ✅ Stock
    stock: { type: Number, default: 0 },
    sku: { type: String},

    // ✅ Reviews & Ratings
    rating: { type: Number, default: 0 },
    reviews: [reviewSchema],

    // ✅ More Info
    moreInformation: {
      dimensions: { type: String, trim: false },
      warranty: { type: String, trim: false },
      material: { type: String, trim: false },
    },

    // ✅ Status
    status: {
      type: String,
      enum: ["New Arrival", "Best Selling", "Out of Stock"],
      default: "New Arrival",
    },
  },
  { timestamps: true }
);

// ✅ Virtual for final price
productSchema.virtual("finalPrice").get(function () {
  if (!this.price || this.discount <= 0) return this.price;
  return this.price - (this.price * this.discount) / 100;
});

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

export default mongoose.model("Product", productSchema);
