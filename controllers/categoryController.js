import Category from "../models/category.js";
import supabase from "../config/supabase.js";
import multer from "multer";

const storage = multer.memoryStorage();
export const upload = multer({ storage });

// CREATE
export const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res
        .status(400)
        .json({ message: "Name and description are required" });
    }

    let imageUrl = null;
    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;

      const { error } = await supabase.storage
        .from("retrowoods") // ✅ fixed bucket name
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (error) throw error;

      imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/retrowoods/${fileName}`;
    }

    const category = new Category({
      name,
      description,
      imageUrl,
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    console.error("Category create error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// READ
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    let data = req.body;

    if (req.file) {
      const fileName = `${Date.now()}-${req.file.originalname}`;

      const { error } = await supabase.storage
        .from("retrowoods") // ✅ fixed bucket name
        .upload(fileName, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      if (error) throw error;

      data.imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/retrowoods/${fileName}`;
    }

    const updated = await Category.findByIdAndUpdate(id, data, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE
export const deleteCategory = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
