import jwt from "jsonwebtoken";
import User from "../models/User.js";
/* dsd */
// Protect routes (user/admin)
export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) return res.status(401).json({ error: "User not found" });
      next();
    } catch (err) {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  } else {
    res.status(401).json({ error: "Not authorized, no token" });
  }
};

// Admin-only middleware
export const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") next();
  else res.status(403).json({ error: "Admin access required" });
};
