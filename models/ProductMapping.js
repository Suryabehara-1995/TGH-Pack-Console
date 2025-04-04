const mongoose = require("mongoose");

const productMappingSchema = new mongoose.Schema({
  productID: { type: String, required: true, unique: true },
  updatedID: { type: String, required: true },
  productName: { type: String, required: true },
  sku: { type: String, required: true }, // Add SKU field
});

module.exports = mongoose.model("ProductMapping", productMappingSchema);
