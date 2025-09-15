// routes/subCategory.js
import express from "express";
import { upload } from "../controllers/subCategoryController.js"; // Use memoryStorage multer from controller
import {
  createSubCategory,
  getSubCategories,
  updateSubCategory,  getSubCategoryById, // ✅ Added

  deleteSubCategory,
} from "../controllers/subCategoryController.js";

const router = express.Router();

// Routes

// Create SubCategory with image upload
router.post("/", upload.single("image"), createSubCategory);

// Get all SubCategories
router.get("/", getSubCategories);
router.get("/:id", getSubCategoryById); // ✅ This fixes 404 if ID exists

// Update SubCategory with optional image upload
router.put("/:id", upload.single("image"), updateSubCategory);

// Delete SubCategory
router.delete("/:id", deleteSubCategory);

export default router;
