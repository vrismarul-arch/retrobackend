import Product from "../models/Product.js";
import supabase from "../config/supabase.js";
import multer from "multer";

// -------------------- Multer Configuration --------------------
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// -------------------- Upload File to Supabase --------------------
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

// ====================================================================
// 🟩 CREATE PRODUCT
// ====================================================================
export const createProduct = async (req, res) => {
  try {
    let data = req.body;

    // Parse moreInformation if it's sent as string
    if (data.moreInformation && typeof data.moreInformation === "string") {
      data.moreInformation = JSON.parse(data.moreInformation);
    }

    // Handle main image
    const mainFile = req.files?.find((f) => f.fieldname === "mainImage");
    if (mainFile) {
      data.image = await uploadToSupabase(mainFile);
    }

    // Handle additional images
    const images = req.files?.filter((f) => f.fieldname === "images") || [];
    if (images.length > 12) {
      return res.status(400).json({ error: "Maximum 12 images allowed." });
    }
    data.images = await Promise.all(images.map(uploadToSupabase));

    // Create product
    const product = new Product(data);
    await product.save();

    res.status(201).json(product);
  } catch (err) {
    console.error("Create Product Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ====================================================================
// 🟧 UPDATE PRODUCT
// ====================================================================
export const updateProduct = async (req, res) => {
  try {
    let data = req.body;

    // Parse moreInformation if it's stringified
    if (data.moreInformation && typeof data.moreInformation === "string") {
      data.moreInformation = JSON.parse(data.moreInformation);
    }

    // Parse existing images
    let existingImages = [];
    if (data.existingImages) {
      try {
        existingImages = JSON.parse(data.existingImages);
      } catch {
        existingImages = data.existingImages;
      }
    }

    // Upload new images
    const newImages = req.files?.filter((f) => f.fieldname === "images") || [];
    if (existingImages.length + newImages.length > 12) {
      return res.status(400).json({ error: "Maximum 12 images allowed." });
    }

    const uploadedUrls = await Promise.all(newImages.map(uploadToSupabase));
    data.images = [...existingImages, ...uploadedUrls];

    // Upload new main image
    const mainFile = req.files?.find((f) => f.fieldname === "mainImage");
    if (mainFile) {
      data.image = await uploadToSupabase(mainFile);
    }

    // Update the product
    const updated = await Product.findByIdAndUpdate(req.params.id, data, {
      new: true,
    });

    if (!updated) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json(updated);
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ====================================================================
// 🟦 GET ALL PRODUCTS
// ====================================================================
export const getProducts = async (req, res) => {
  try {
    const filter = {};

    if (req.query.brand) filter.brand = req.query.brand;
    if (req.query.subCategory) filter.subCategory = req.query.subCategory;
    if (req.query.category) filter.category = req.query.category;

    const products = await Product.find(filter)
      .populate("category", "name imageUrl")
      .populate("subCategory", "name imageUrl")
      .populate("brand", "name logoUrl");

    res.json(products);
  } catch (err) {
    console.error("Get Products Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ====================================================================
// 🟨 GET PRODUCT BY ID
// ====================================================================
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name imageUrl")
      .populate("subCategory", "name imageUrl")
      .populate("brand", "name logo");

    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json(product);
  } catch (err) {
    console.error("Get Product By ID Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ====================================================================
// 🟥 DELETE PRODUCT
// ====================================================================
export const deleteProduct = async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Product not found." });
    }

    res.json({ message: "Product deleted successfully." });
  } catch (err) {
    console.error("Delete Product Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ====================================================================
// 🟪 GET PRODUCTS BY IDS
// ====================================================================
export const getProductsByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid product IDs." });
    }

    const products = await Product.find({ _id: { $in: ids } })
      .select("name price image images moreInformation");

    res.json(products);
  } catch (err) {
    console.error("Get Products By IDs Error:", err);
    res.status(500).json({ error: err.message });
  }
};
export const addProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ error: "Product not found" });

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      (r) => r.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ error: "Product already reviewed" });
    }

    const review = {
      user: req.user._id,
      name: req.user.name,
      rating: Number(rating),
      comment,
    };

    product.reviews.push(review);

    // Update average rating
    product.numReviews = product.reviews.length;
    product.rating =
      product.reviews.reduce((acc, item) => item.rating + acc, 0) /
      product.reviews.length;

    await product.save();
    res.status(201).json({ message: "Review added successfully", reviews: product.reviews });
  } catch (err) {
    console.error("Add Review Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// -------------------- GET PRODUCT REVIEWS --------------------
export const getProductReviews = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("reviews.user", "name email profilePic");
    if (!product) return res.status(404).json({ error: "Product not found" });

    res.json(product.reviews);
  } catch (err) {
    console.error("Get Reviews Error:", err);
    res.status(500).json({ error: err.message });
  }
};