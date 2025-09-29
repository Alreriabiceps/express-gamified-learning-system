const Admin = require("../models/Admin");

// Get current admin profile (for refreshing user data)
const getCurrentAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      data: admin.getPublicProfile(),
    });
  } catch (error) {
    console.error("Error getting admin profile:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching admin profile",
      error: error.message,
    });
  }
};

module.exports = {
  getCurrentAdminProfile,
};
