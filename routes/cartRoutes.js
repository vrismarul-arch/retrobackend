// routes/cartRoutes.js
import express from "express";
import { 
  addToCart, 
  getCart, 
  updateQuantity, 
  removeFromCart, 
  clearCart  // ✅ Import clearCart controller
} from "../controllers/cartController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Add item to cart
router.post("/cart/add", protect, addToCart);

// Get user cart
router.get("/cart", protect, getCart);

// Update quantity
router.put("/cart/:productId", protect, updateQuantity);

// Remove item
router.delete("/cart/:productId", protect, removeFromCart);

// ✅ Clear entire cart
router.delete("/cart", protect, clearCart);


export default router;
