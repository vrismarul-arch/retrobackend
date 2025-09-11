import Variety from "../models/Variety.js";
import supabase from "../config/supabase.js";
import multer from "multer";

// ✅ Multer setup
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// ✅ Helper function
const uploadImageToSupabase = async (file) => {
  if (!file) return null;

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

// CREATE Variety
export const createVariety = async (req, res) => {
  try {
    const { name, description, subCategory } = req.body;
    if (!name || !subCategory) {
      return res.status(400).json({ message: "Name and SubCategory are required" });
    }

    const imageUrl = await uploadImageToSupabase(req.file);

    const variety = new Variety({ name, description, imageUrl, subCategory });
    await variety.save();

    res.status(201).json(variety);
  } catch (error) {
    console.error("Variety create error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// READ Varieties
export const getVarieties = async (req, res) => {
  try {
    const varieties = await Variety.find().populate("subCategory");
    res.json(varieties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE Variety
export const updateVariety = async (req, res) => {
  try {
    const { id } = req.params;
    let data = req.body;

    if (req.file) {
      data.imageUrl = await uploadImageToSupabase(req.file);
    }

    const updated = await Variety.findByIdAndUpdate(id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE Variety
export const deleteVariety = async (req, res) => {
  try {
    await Variety.findByIdAndDelete(req.params.id);
    res.json({ message: "Variety deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
