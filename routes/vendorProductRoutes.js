import express from "express";
import {
  createVendorProduct,
  getVendorProducts,
  upload,
  approveProduct,
  rejectProduct,
  updateProduct,
} from "../controllers/vendorProductController.js";

const router = express.Router();

// POST new product (up to 3 images)
router.post("/", upload.fields([{ name: "images", maxCount: 3 }]), createVendorProduct);

// GET all products
router.get("/", getVendorProducts);

// PUT Approve / Reject
router.put("/:id/approve", approveProduct);
router.put("/:id/reject", rejectProduct);

// PUT Update product details + images
router.put("/:id", upload.fields([{ name: "images", maxCount: 3 }]), updateProduct);

export default router;
