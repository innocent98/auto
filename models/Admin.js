const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    currentPassword: {
      type: String,
    },
    auth: {
      type: String,
      required: true,
    },
    picture: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Admin", AdminSchema);
