import express from "express";
import {
  createVendorProduct,
  getVendorProducts,
  upload,
  approveProduct,
  rejectProduct
} from "../controllers/vendorProductController.js";

const router = express.Router();

// POST multiple products (total images up to 10)
router.post("/", upload.array("images", 10), createVendorProduct);

// GET all submissions
router.get("/", getVendorProducts);

// Approve / Reject submission
router.put("/:id/approve", approveProduct);
router.put("/:id/reject", rejectProduct);

export default router;
