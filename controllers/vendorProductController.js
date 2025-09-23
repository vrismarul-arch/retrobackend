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
    .from("retrowoods")
    .upload(fileName, file.buffer, { contentType: file.mimetype, upsert: true });
  if (error) throw error;
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/retrowoods/${fileName}`;
};

// ---------- Create Vendor Product ----------
export const createVendorProduct = async (req, res) => {
  try {
    const { name, phone, email, city } = req.body;

    // Parse products from JSON string
    const products = JSON.parse(req.body.products); // Frontend must send JSON string

    const files = req.files || [];
    let fileIndex = 0;

    // Attach images to each product
    for (let product of products) {
      product.images = [];
      const imageCount = product.imageCount || 0; // frontend should include how many images per product
      for (let i = 0; i < imageCount; i++) {
        if (files[fileIndex]) {
          const url = await uploadToSupabase(files[fileIndex]);
          product.images.push(url);
          fileIndex++;
        }
      }
    }

    const vendorSubmission = await VendorProduct.create({
      name,
      phone,
      email,
      city,
      products,
    });

    res.status(201).json(vendorSubmission);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create vendor products" });
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
      { "products.$[].status": "approved" }, // approve all products in submission
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
      { "products.$[].status": "rejected" }, // reject all products in submission
      { new: true }
    );
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Failed to reject product" });
  }
};
