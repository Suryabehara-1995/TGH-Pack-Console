const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  orderID: { type: String, unique: true, required: true },  // Prevent null orderIDs
  order_date: { type: Date, required: true },
  customer: {
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true }
  },
  shipments: [{
    courier_name: { type: String },
    awb_code: { type: String }
  }],
  products: [{
    id: { type: String, required: true },
    updated_id: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true }
  }],
  packed_status: { type: String, required: true },
  packed_date: { type: Date, required: true },
  packed_time: { type: String, required: true },
  packed_person_name: { type: String, required: true },
  warehouse_out: { type: String, required: true },
  warehouse_out_date: { type: Date, required: true },
  warehouse_out_time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },  // Add createdAt field
  shiprocketDate: { type: Date, required: true }  // Add shiprocketDate field
});

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;