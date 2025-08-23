import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

router.post("/auth/register", registerUser);
router.post("/auth/login", loginUser);

export default router;
