import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    // ✅ Basic Info
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
    image: { type: String, trim: true }, // Main image
    images: [{ type: String, trim: true }], // Additional images
    price: { type: Number, required: true },
    discount: { type: Number, default: 0 },

    // ✅ Relations
    category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory", required: true },
    brand: { type: mongoose.Schema.Types.ObjectId, ref: "Brand" },

    // ✅ Details
    details: { type: String, trim: true },
    spec: { type: String, trim: true },
    condition: { type: String, enum: ["New", "Used", "Refurbished"], default: "New" },

    // ✅ Stock
    stock: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 },
    lowStockAlert: { type: Number, default: 5 },
    sku: { type: String, unique: true, trim: true },

    // ✅ Ratings & Reviews
    rating: { type: Number, default: 0 },
    reviews: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment: { type: String, trim: true },
        rating: { type: Number, min: 1, max: 5 },
        createdAt: { type: Date, default: Date.now },
        images: [{ type: String }],
      },
    ],

    // ✅ More Information
    moreInformation: {
      dimensions: { type: String, trim: true },
      warranty: { type: String, trim: true },
      assemblyDetails: { type: String, trim: true },
      material: { type: String, trim: true },
    },

    // ✅ Status
    status: {
      type: String,
      enum: ["New Arrival", "Best Selling", "Out of Stock"],
      default: "New Arrival",
    },

    // ✅ SEO
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },

    // ✅ Discount validity
    discountStart: { type: Date },
    discountEnd: { type: Date },

    // ✅ Shipping
    shippingWeight: { type: String, trim: true },
    shippingPolicy: { type: String, trim: true },
    returnPolicy: { type: String, trim: true },
  },
  { timestamps: true }
);

// ✅ Virtual field for final price
productSchema.virtual("finalPrice").get(function () {
  if (!this.price || this.discount <= 0) return this.price;
  return this.price - (this.price * this.discount) / 100;
});

// ✅ Include virtuals in JSON & Object responses
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

export default mongoose.model("Product", productSchema);
