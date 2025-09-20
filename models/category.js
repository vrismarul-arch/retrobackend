import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    imageUrl: { type: String, required: true },
    subCategories: [
      { type: mongoose.Schema.Types.ObjectId, ref: "SubCategory" }
    ],
    brands: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Brand" }
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Category", categorySchema);
