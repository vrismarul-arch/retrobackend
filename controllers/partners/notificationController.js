// controllers/partners/notificationController.js
import Booking from "../../models/Booking.js"; // ✅ import Booking model
import Partner from "../../models/partners/Partner.js"; // optional if you want partner info

// Fetch notifications for logged-in partner
export const getPartnerNotifications = async (req, res) => {
  try {
    const partnerId = req.partner._id;

    // Fetch all pending bookings (not assigned to any partner)
    const bookings = await Booking.find({ status: "pending", assignedTo: null })
      .populate("products.productId", "name price imageUrl"); // populate service info

    // Convert bookings to notifications with full details
    const notifications = bookings.map((b) => ({
      id: b._id,
      bookingId: b._id,
      booking: b, // send the full booking object
      text: `New booking ${b.bookingId || b._id} is available`,
      createdAt: b.createdAt,
    }));

    res.json(notifications);
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: err.message });
  }
};