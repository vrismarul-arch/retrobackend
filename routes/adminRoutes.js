import express from "express";

// Controllers for categories, subcategories, brands, products
import {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  upload as categoryUpload,
} from "../controllers/categoryController.js";

import {
  createProduct,
  getProducts,
  updateProduct,
  getProductById,
  deleteProduct,
  getProductsByIds,
  upload as productUpload,
} from "../controllers/productController.js";

import {
  createSubCategory,
  getSubCategories,
  updateSubCategory,
  deleteSubCategory,
  getSubCategoryById, // Import the new controller function
  upload as subCategoryUpload,
} from "../controllers/subCategoryController.js";

import {
  createBrand,
  getBrands,
  updateBrand,
  deleteBrand,
  getBrandById,
  upload as brandUpload,
} from "../controllers/brandController.js";

// Controllers for bookings + profile
import {
  getAllBookings,
  updateBooking,
  getBookingById,
  getAdminProfile,
} from "../controllers/adminController.js";

// Partner routes
import partnerRoutes from "./partners/partnerRoutes.js";

// Middleware
import { protect, admin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ----------------- Categories ----------------- */
router.post("/categories", categoryUpload.single("image"), createCategory);
router.get("/categories", getCategories);
router.put("/categories/:id", categoryUpload.single("image"), updateCategory);
router.delete("/categories/:id", deleteCategory);

/* ----------------- SubCategories ----------------- */
router.post("/subcategories", subCategoryUpload.single("image"), createSubCategory);
router.get("/subcategories", getSubCategories);
router.get("/subcategories/:id", getSubCategoryById); // This is the new route
router.put("/subcategories/:id", subCategoryUpload.single("image"), updateSubCategory);
router.delete("/subcategories/:id", deleteSubCategory);

/* ----------------- Brands ----------------- */
router.post("/brands", brandUpload.single("logo"), createBrand);
router.get("/brands", getBrands);
router.get("/brands/:id", getBrandById);   // 👈 NEW

router.put("/brands/:id", brandUpload.single("logo"), updateBrand);
router.delete("/brands/:id", deleteBrand);

/* ----------------- Products ----------------- */
router.post("/products/byIds", getProductsByIds);
router.post("/products", productUpload.any(), createProduct); // multiple files
router.get("/products", getProducts);
router.get("/products/:id", getProductById);
router.put("/products/:id", productUpload.any(), updateProduct);
router.delete("/products/:id", deleteProduct);

/* ----------------- Bookings ----------------- */
router.get("/bookings", getAllBookings);
router.put("/bookings/:id", updateBooking);
router.get("/bookings/:id", getBookingById);

/* ----------------- Admin Profile ----------------- */
router.get("/profile", protect, admin, getAdminProfile);

/* ----------------- Partner Management ----------------- */
router.use("/partners", partnerRoutes);

export default router;