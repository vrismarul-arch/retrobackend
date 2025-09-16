import Booking from "../models/Booking.js";

// Get all bookings (admin)
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate("products.productId", "name price");
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("products.productId", "name price")
      // .populate("assignedTo", "name email");

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.json({ booking });
  } catch (err) {
    console.error("Error fetching booking:", err);
    res.status(500).json({ error: "Server error fetching booking details" });
  }
};

// Update booking status
export const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (status) booking.status = status;

    await booking.save();

    const updatedBooking = await Booking.findById(id)
      .populate("products.productId", "name price");

    res.json({ message: "Booking updated", booking: updatedBooking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
export const getAdminProfile = async (req, res) => {
  try {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || null,
      role: req.user.role || "admin",
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};