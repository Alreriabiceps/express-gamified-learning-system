const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Check if model already exists to prevent OverwriteModelError
if (mongoose.models.Admin) {
  module.exports = mongoose.models.Admin;
} else {
  const adminSchema = new mongoose.Schema(
    {
      username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
      },
      password: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      lastLogin: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

  // Hash password before saving
  adminSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });

  // Method to compare password
  adminSchema.methods.comparePassword = async function (candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      throw error;
    }
  };

  // Method to get public profile (without sensitive data)
  adminSchema.methods.getPublicProfile = function () {
    const adminObject = this.toObject();
    delete adminObject.password;
    return adminObject;
  };

  module.exports = mongoose.model("Admin", adminSchema);
}
