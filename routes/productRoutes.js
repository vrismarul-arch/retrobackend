import express from "express";
import {
  getProducts,
  createProduct,
  updateProduct,
  getProductById,
  deleteProduct,
  getProductsByIds,
  addProductReview,
  getProductReviews,
  upload as productUpload,
} from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Product CRUD
router.get("/", getProducts);
router.get("/:id", getProductById);
router.post("/", productUpload.any(), createProduct);
router.put("/:id", productUpload.any(), updateProduct);
router.delete("/:id", deleteProduct);
router.post("/byIds", getProductsByIds);

// ✅ Reviews
router.post("/:id/reviews", protect, addProductReview);
router.get("/:id/reviews", getProductReviews);

export default router;
