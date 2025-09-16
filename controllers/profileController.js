import User from "../models/User.js";
import Booking from "../models/Booking.js";
import supabase from "../config/supabase.js";

// helper: upload avatar to supabase
const uploadToSupabase = async (file) => {
  const fileName = `avatars/${Date.now()}-${file.originalname}`;
  const { error } = await supabase.storage
    .from("retrowoods")
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });
  if (error) throw error;
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/retrowoods/${fileName}`;
};

// ✅ get logged-in user's profile
export const getProfile = async (req, res) => {
  try {
    res.json(req.user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ update profile
export const updateProfile = async (req, res) => {
  try {
    let updateData = { ...req.body };

    if (req.file) {
      const avatarUrl = await uploadToSupabase(req.file);
      updateData.avatar = avatarUrl;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(updatedUser);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ get booking history
export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("products.productId", "name price imageUrl")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
