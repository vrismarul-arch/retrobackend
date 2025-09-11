import SubCategory from "../models/SubCategory.js";
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

// CREATE SubCategory
export const createSubCategory = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name || !category) {
      return res.status(400).json({ message: "Name and Category are required" });
    }

    const imageUrl = await uploadImageToSupabase(req.file);

    const subCategory = new SubCategory({ name, description, imageUrl, category });
    await subCategory.save();

    res.status(201).json(subCategory);
  } catch (error) {
    console.error("SubCategory create error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// READ SubCategories
export const getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate("category");
    res.json(subCategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE SubCategory
export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let data = req.body;

    if (req.file) {
      data.imageUrl = await uploadImageToSupabase(req.file);
    }

    const updated = await SubCategory.findByIdAndUpdate(id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE SubCategory
export const deleteSubCategory = async (req, res) => {
  try {
    await SubCategory.findByIdAndDelete(req.params.id);
    res.json({ message: "SubCategory deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
