const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  orderID: { type: String, unique: true, required: true },
  order_date: { type: Date },
  customer: {
    name: { type: String, default: "Unknown" },
    mobile: { type: String, default: "Unknown" },
    email: { type: String, default: "Unknown" },
  },
  shipments: [
    {
      courier_name: { type: String, default: "N/A" },
      awb_code: { type: String, default: "N/A" },
      status: { type: String, default: "N/A" }, // Added for Shiprocket status
    },
  ],
  products: [
    {
      id: { type: String, default: `TEMP-PROD-${Date.now()}` },
      updated_id: { type: String, default: `TEMP-UPD-${Date.now()}` },
      sku: { type: String, default: "Unknown SKU" },
      name: { type: String, default: "Unknown Item" },
      quantity: { type: Number, default: 0 },
      weight: { type: Number, default: 0 },
      imageUrl: { type: String, default: "" }, // Added imageUrl field
      productLocation: { type: String, default: "Unknown" }, // Added productLocation field
      productCategory: { type: String, default: "Unknown" }, // Added productCategory field
    },
  ],
  packed_status: { type: String, default: "Not Completed" },
  packed_date: { type: Date },
  packed_time: { type: String, default: "Unknown Time" },
  packed_person_name: { type: String, default: "Unknown" },
  warehouse_out: { type: String, default: "Unknown" },
  warehouse_out_date: { type: Date },
  warehouse_out_time: { type: String, default: "Unknown Time" },
  createdAt: { type: Date, default: Date.now },
  shiprocketDate: { type: Date, default: Date.now },
});

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;
