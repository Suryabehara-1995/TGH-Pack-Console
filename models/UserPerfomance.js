const mongoose = require("mongoose");

const UserPerformanceSchema = new mongoose.Schema({
  user: { type: String, required: true },
  orderId: { type: String, required: true, unique: true }, // Unique to prevent duplicates
  startTime: { type: Date },
  endTime: { type: Date },
  packedDate: { type: Date },
  products: [
    {
      name: { type: String },
      sku: { type: String },
      quantity: { type: Number },
      scannedQuantity: { type: Number },
      override: { type: Boolean },
    },
  ],
  holdReason: { type: String, default: "" }, // Updated for hold actions
  packedPersonName: { type: String, default: "Unknown" }, // Optional, from frontend
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update `updatedAt` on each save
UserPerformanceSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const UserPerformance = mongoose.model("UserPerformance", UserPerformanceSchema);
module.exports = UserPerformance;