// controllers/serviceController.js
import Service from "../models/Service.js";
import supabase from "../config/supabase.js";
import multer from "multer";

// -------------------- Multer Config --------------------
const storage = multer.memoryStorage();
export const upload = multer({ storage });

// -------------------- Utility Functions --------------------
const calculateDiscount = (originalPrice, price) => {
  if (!originalPrice || !price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
};

const uploadToSupabase = async (file) => {
  const fileName = `${Date.now()}-${file.originalname}`;
  const { error } = await supabase.storage
    .from("retrowoods")
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });
  if (error) throw error;
  return `${process.env.SUPABASE_URL}/storage/v1/object/public/retrowoods/${fileName}`;
};

// Helper: handle nested image arrays like overview/procedureSteps
const processNestedImages = async (data, files, field, fileFieldName) => {
  if (!data[field]) return [];
  let arr;
  try {
    arr = JSON.parse(data[field]);
  } catch {
    arr = data[field];
  }
  if (!Array.isArray(arr)) return [];

  return Promise.all(
    arr.map(async (item, idx) => {
      // Keep existing URLs
      if (item.img && typeof item.img === "string" && item.img.startsWith("http")) {
        return item;
      }
      const uploaded = files.find((f) => f.fieldname === `${fileFieldName}_${idx}`);
      if (uploaded) {
        const url = await uploadToSupabase(uploaded);
        return { ...item, img: url };
      }
      return item;
    })
  );
};

// -------------------- Controllers --------------------

// CREATE
export const createService = async (req, res) => {
  try {
    let data = req.body;

    data.overview = await processNestedImages(data, req.files, "overview", "overviewImages");
    data.procedureSteps = await processNestedImages(data, req.files, "procedureSteps", "procedureStepsImages");
    data.thingsToKnow = JSON.parse(data.thingsToKnow || "[]");
    data.precautionsAftercare = JSON.parse(data.precautionsAftercare || "[]");
    data.faqs = JSON.parse(data.faqs || "[]");

    const mainImage = req.files.find((f) => f.fieldname === "image");
    if (mainImage) {
      data.imageUrl = await uploadToSupabase(mainImage);
    }

    if (data.originalPrice && data.price) {
      data.discount = calculateDiscount(data.originalPrice, data.price);
    }

    const service = new Service(data);
    await service.save();
    res.status(201).json(service);
  } catch (err) {
    console.error("Create Service Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateService = async (req, res) => {
  try {
    let data = req.body;

    data.overview = await processNestedImages(data, req.files, "overview", "overviewImages");
    data.procedureSteps = await processNestedImages(data, req.files, "procedureSteps", "procedureStepsImages");
    data.thingsToKnow = JSON.parse(data.thingsToKnow || "[]");
    data.precautionsAftercare = JSON.parse(data.precautionsAftercare || "[]");
    data.faqs = JSON.parse(data.faqs || "[]");

    const mainImage = req.files.find((f) => f.fieldname === "image");
    if (mainImage) {
      data.imageUrl = await uploadToSupabase(mainImage);
    }

    if (data.originalPrice && data.price) {
      data.discount = calculateDiscount(data.originalPrice, data.price);
    }

    const updated = await Service.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updated) return res.status(404).json({ error: "Service not found" });

    res.json(updated);
  } catch (err) {
    console.error("Update Service Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET ALL
export const getServices = async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    // Filter by category if provided
    if (category) {
      query.category = category;
    }

    // Filter by search query if provided
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },        // Match service name
        { description: { $regex: search, $options: "i" } }, // Match service description
      ];
    }

    const services = await Service.find(query)
      .populate("category", "name description imageUrl")
      .populate("subCategory", "name description imageUrl")
      .populate("variety", "name description imageUrl");

    res.json(services);
  } catch (err) {
    console.error("Get Services Error:", err);
    res.status(500).json({ error: err.message });
  }
};


// GET ONE BY ID
export const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate("category", "name description imageUrl")
      .populate("subCategory", "name description imageUrl")
      .populate("variety", "name description imageUrl");

    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json(service);
  } catch (err) {
    console.error("Get Service By ID Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE
export const deleteService = async (req, res) => {
  try {
    const deleted = await Service.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Service not found" });
    res.json({ message: "Service deleted" });
  } catch (err) {
    console.error("Delete Service Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// NEW: GET MULTIPLE SERVICES BY IDS (For Cart/Checkout)
// controllers/serviceController.js
export const getServicesByIds = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "Invalid service IDs" });
    }

    const services = await Service.find({ _id: { $in: ids } })
      .select("name price imageUrl"); // include imageUrl

    res.json(services);
  } catch (err) {
    console.error("Get services by IDs error:", err);
    res.status(500).json({ error: err.message });
  }
};
