import Banner from "../models/banner.js";
import supabase from "../config/supabase.js";
import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Helper: upload to Supabase
const uploadToSupabase = async (file) => {
  const fileName = `${Date.now()}-${file.originalname}`;
  const { error } = await supabase.storage
    .from("retrowoods")
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (error) throw error;
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/retrowoods/${fileName}`;
};

// CREATE
export const createBanner = async (req, res) => {
  try {
    let data = req.body;
    if (req.file) {
      data.imageUrl = await uploadToSupabase(req.file);
    }
    const banner = new Banner(data);
    await banner.save();
    res.status(201).json(banner);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// READ
export const getBanners = async (req, res) => {
  try {
    const banners = await Banner.find().sort({ createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateBanner = async (req, res) => {
  try {
    let data = req.body;
    if (req.file) {
      data.imageUrl = await uploadToSupabase(req.file);
    }
    const updated = await Banner.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updated) return res.status(404).json({ error: "Banner not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE
export const deleteBanner = async (req, res) => {
  try {
    const deleted = await Banner.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Banner not found" });
    res.json({ message: "Banner deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
