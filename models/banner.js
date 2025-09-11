import mongoose from "mongoose";

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String,  },              // Main banner heading
    subtitle: { type: String },                           // Optional sub text
    btnText: { type: String },                            // Call-to-action button text
    btnLink: { type: String },                            // URL for button
    imageUrl: { type: String, required: true },           // Banner image (stored in Supabase/Cloudinary/Firebase)
    isActive: { type: Boolean, default: true },           // Whether banner is visible
    schedule: {                                           // Optional schedule
      startDate: { type: Date },
      endDate: { type: Date },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Banner", bannerSchema);
