import express from "express";
import { createBrand, getBrands, updateBrand, deleteBrand,getBrandById, upload } from "../controllers/brandController.js";

const router = express.Router();

// Use 'logo' as the field name
router.post("/", upload.single("logo"), createBrand);
router.put("/:id", upload.single("logo"), updateBrand);
router.get("/", getBrands);
router.delete("/:id", deleteBrand);
router.get("/:id", getBrandById); 
export default router;
