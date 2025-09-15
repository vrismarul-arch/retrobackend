import Brand from "../models/Brand.js";
import supabase from "../config/supabase.js";
import multer from "multer";

// Multer setup
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// Helper: upload to Supabase
const uploadImageToSupabase = async (file) => {
  if (!file) return null;
  const fileName = `${Date.now()}-${file.originalname}`;
  const { error } = await supabase.storage
    .from("retrowoods")
    .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
  if (error) throw error;
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/retrowoods/${fileName}`;
};

// CREATE Brand
export const createBrand = async (req, res) => {
  try {
    const { name, description, categories, subCategories } = req.body;
    if (!name) return res.status(400).json({ message: "Brand name is required" });

    const logoUrl = await uploadImageToSupabase(req.file); // 'logo' field

    const brand = new Brand({
      name,
      description,
      logoUrl,
      categories: categories ? JSON.parse(categories) : [],
      subCategories: subCategories ? JSON.parse(subCategories) : [],
    });

    await brand.save();
    res.status(201).json(brand);
  } catch (error) {
    console.error("Brand create error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// GET Brands
export const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find()
      .populate("categories", "name description logoUrl")
      .populate("subCategories", "name description logoUrl");
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE Brand
export const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    let data = req.body;

    if (req.file) {
      data.logoUrl = await uploadImageToSupabase(req.file);
    }

    if (data.categories) { try { data.categories = JSON.parse(data.categories); } catch {} }
    if (data.subCategories) { try { data.subCategories = JSON.parse(data.subCategories); } catch {} }

    const updated = await Brand.findByIdAndUpdate(id, data, { new: true });
    if (!updated) return res.status(404).json({ error: "Brand not found" });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE Brand
export const deleteBrand = async (req, res) => {
  try {
    const deleted = await Brand.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Brand not found" });
    res.json({ message: "Brand deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// GET Brand by ID
export const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id)
      .populate("categories", "name description logoUrl")
      .populate("subCategories", "name description logoUrl");

    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    res.json(brand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
