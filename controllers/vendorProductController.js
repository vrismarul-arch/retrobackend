import multer from "multer";
import VendorProduct from "../models/VendorProduct.js";
import supabase from "../config/supabase.js";

// ---------- Multer Setup ----------
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// ---------- Supabase Upload Helper ----------
const uploadToSupabase = async (file) => {
  const fileName = `${Date.now()}-${file.originalname}`;
  const { error } = await supabase.storage
    .from("retrowoods") // your Supabase bucket
    .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });

  if (error) throw error;
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/retrowoods/${fileName}`;
};

// ---------- Create Vendor Product ----------
export const createVendorProduct = async (req, res) => {
  try {
    const data = { ...req.body };

    if (req.files?.images) {
      const imageUrls = [];
      for (const file of req.files.images) {
        const url = await uploadToSupabase(file);
        imageUrls.push(url);
      }
      data.images = imageUrls;
    }

    const product = await VendorProduct.create(data);
    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
};

// ---------- Get All Vendor Products ----------
export const getVendorProducts = async (req, res) => {
  try {
    const products = await VendorProduct.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// ---------- Approve Product ----------
export const approveProduct = async (req, res) => {
  try {
    const product = await VendorProduct.findByIdAndUpdate(
      req.params.id,
      { status: "approved" },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to approve product" });
  }
};

// ---------- Reject Product ----------
export const rejectProduct = async (req, res) => {
  try {
    const product = await VendorProduct.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to reject product" });
  }
};

// ---------- Update Product ----------
export const updateProduct = async (req, res) => {
  try {
    const data = { ...req.body };

    if (req.files?.images) {
      const imageUrls = [];
      for (const file of req.files.images) {
        const url = await uploadToSupabase(file);
        imageUrls.push(url);
      }
      data.images = imageUrls;
    }

    const product = await VendorProduct.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
};
