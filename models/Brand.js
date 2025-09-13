import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    subCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" }],
  },
  { timestamps: true }
);

export default mongoose.model("Brand", brandSchema);
