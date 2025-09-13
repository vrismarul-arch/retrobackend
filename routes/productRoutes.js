import express from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
  getProductById,
  deleteProduct,
  getProductsByIds,
  upload as productUpload,
} from "../controllers/productController.js";

const router = express.Router();

// ✅ Get all products
router.get("/", getProducts);

// ✅ Get product by ID
router.get("/:id", getProductById);

// ✅ Create new product
router.post("/", productUpload.any(), createProduct);

// ✅ Update existing product
router.put("/:id", productUpload.any(), updateProduct);

// ✅ Delete product by ID
router.delete("/:id", deleteProduct);

// ✅ Get multiple products by IDs
router.post("/byIds", getProductsByIds);

export default router;
