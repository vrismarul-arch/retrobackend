// controllers/subCategoryController.js
import SubCategory from "../models/SubCategory.js";
import supabase from "../config/supabase.js";
import multer from "multer";

// ✅ Multer setup for memory storage
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// ✅ Helper function to upload image to Supabase
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

// ✅ CREATE SubCategory
export const createSubCategory = async (req, res) => {
  try {
    const { name, description, category } = req.body;
    if (!name || !category) {
      return res.status(400).json({ message: "Name and Category are required" });
    }

    const imageUrl = await uploadImageToSupabase(req.file);

    const subCategory = new SubCategory({
      name,
      description,
      imageUrl,
      category,
    });

    await subCategory.save();

    res.status(201).json(subCategory);
  } catch (error) {
    console.error("SubCategory create error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// ✅ READ all SubCategories with populated category data
export const getSubCategories = async (req, res) => {
  try {
    const subCategories = await SubCategory.find().populate("category");
    res.json(subCategories);
  } catch (err) {
    console.error("SubCategory get error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
export const getSubCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const subCategory = await SubCategory.findById(id).populate("category");
    if (!subCategory) {
      return res.status(404).json({ message: "SubCategory not found" });
    }
    res.json(subCategory);
  } catch (err) {
    console.error("SubCategory fetch by ID error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ✅ UPDATE SubCategory
export const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let data = req.body;

    if (req.file) {
      data.imageUrl = await uploadImageToSupabase(req.file);
    }

    const updated = await SubCategory.findByIdAndUpdate(id, data, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("SubCategory update error:", err.message);
    res.status(400).json({ error: err.message });
  }
};

// ✅ DELETE SubCategory
export const deleteSubCategory = async (req, res) => {
  try {
    await SubCategory.findByIdAndDelete(req.params.id);
    res.json({ message: "SubCategory deleted" });
  } catch (err) {
    console.error("SubCategory delete error:", err.message);
    res.status(500).json({ error: err.message });
  }
};
