// models/PickingActivity.js
const mongoose = require('mongoose');

const pickingActivitySchema = new mongoose.Schema({
  username: { type: String, required: true },
  orderID: { type: String, required: true },
  products: [
    {
      name: { type: String, required: true },
      sku: { type: String },
      quantity: { type: Number, required: true },
    },
  ],
  status: { type: String, enum: ['Completed'], default: 'Completed' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PickingActivity', pickingActivitySchema);