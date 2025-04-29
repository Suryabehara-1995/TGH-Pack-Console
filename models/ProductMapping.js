// productMappingSchema.js
const mongoose = require("mongoose");

const productMappingSchema = new mongoose.Schema({
  productID: { type: String, required: true, unique: true },
  updatedID: { type: String, required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true },
  productLocation: { type: String, default: "" },
  productCategory: { type: String, default: "" },
  imageUrl: { type: String, default: "" }, // New field for image URL
});

module.exports = mongoose.model("ProductMapping", productMappingSchema);
