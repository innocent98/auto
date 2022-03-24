const mongoose = require("mongoose");

const EngineersSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    town: {
      type: String,
    },
    city: {
      type: String,
    },
    displayName: {
      type: String,
    },
    address: {
      type: String,
    },
    picture: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Engineer", EngineersSchema);
