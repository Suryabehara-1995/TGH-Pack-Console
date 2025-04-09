const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const Order = require("./models/Order");
const ProductMapping = require("./models/ProductMapping");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://10.160.51.208:3000",
  "https://tghfrontend.onrender.com"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log(`Blocked CORS origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

// User schema and model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, default: "" },
  role: { type: String, default: "user", enum: ["user", "admin"] },
  permissions: {
    dashboardAccess: { type: Boolean, default: false },
    syncAccess: { type: Boolean, default: false },
    ordersAccess: { type: Boolean, default: false },
    packingAccess: { type: Boolean, default: false },
    deliveryAccess: { type: Boolean, default: false },
    productsAccess: { type: Boolean, default: false },
    settingsAccess: { type: Boolean, default: false },
  },
});

const User = mongoose.model("User", userSchema);

// Connect to MongoDB and create default admin if no users with permissions exist
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("MongoDB Connected");

    // Check if there are any users with the permissions field
    const userWithPermissions = await User.findOne({ permissions: { $exists: true } });
    if (!userWithPermissions) {
      console.log("No users with permissions found. Creating default admin...");

      const hashedPassword = await bcrypt.hash("admin123", 10); // Default password
      const defaultAdmin = new User({
        email: "admin@example.com",
        password: hashedPassword,
        name: "Default Admin",
        role: "admin",
        permissions: {
          dashboardAccess: true,
          syncAccess: true,
          ordersAccess: true,
          packingAccess: true,
          deliveryAccess: true,
          productsAccess: true,
          settingsAccess: true,
        },
      });
      await defaultAdmin.save();
      console.log("Default admin created with email: admin@example.com and password: admin123");
    }
  })
  .catch((err) => console.error("MongoDB Connection Error:", err));
  app.get("/", (req, res) => {
    res.send("Server is running ✅ Hello world");
  });
  
// Register route
app.post("/register", async (req, res) => {
  const { email, password, name, role, permissions } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: role || "user",
      permissions: permissions || {
        dashboardAccess: false,
        syncAccess: false,
        ordersAccess: false,
        packingAccess: false,
        deliveryAccess: false,
        productsAccess: false,
        settingsAccess: false,
      },
    });
    await user.save();
    res.status(201).json({ message: "User registered" });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error" });
  }
});



// Login route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { userId: user._id, role: user.role, permissions: user.permissions },
      "secretkey",
      { expiresIn: "10h" }
    );
    res.json({
      token,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Middleware to authenticate and authorize users
const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Access denied" });
    try {
      const decoded = jwt.verify(token, "secretkey");
      req.user = decoded;
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    } catch (error) {
      res.status(400).json({ message: "Invalid token" });
    }
  };
};

// Admin route to manage users
app.get("/admin/users", authMiddleware(["admin"]), async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Create a new user (admin only)
app.post("/admin/users", authMiddleware(["admin"]), async (req, res) => {
  const { name, email, password, role, permissions } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || "user",
      permissions: permissions || {
        dashboardAccess: false,
        syncAccess: false,
        ordersAccess: false,
        packingAccess: false,
        deliveryAccess: false,
        productsAccess: false,
        settingsAccess: false,
      },
    });

    await newUser.save();
    res.status(201).json({ message: "User created successfully", user: newUser });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch user profile
app.get("/profile", authMiddleware(), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
app.put("/profile", authMiddleware(), async (req, res) => {
  const { name } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name },
      { new: true }
    ).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Fetch Shiprocket token
const getShiprocketToken = async () => {
  try {
    const response = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    });
    return response.data.token;
  } catch (error) {
    console.error("Error fetching Shiprocket token:", error.response?.data || error.message);
    return null;
  }
};

// Fetch all orders from Shiprocket API with pagination
const fetchOrdersFromShiprocket = async (shiprocketToken, from, to) => {
  const perPage = 200; // Shiprocket max limit
  let page = 1;
  let allOrders = [];
  let hasMoreOrders = true;

  while (hasMoreOrders) {
    try {
      const response = await axios.get("https://apiv2.shiprocket.in/v1/external/orders", {
        headers: { Authorization: `Bearer ${shiprocketToken}` },
        params: { from, to, page, per_page: perPage },
      });

      const orders = response.data.data || [];
      allOrders = allOrders.concat(orders);

      const totalOrders = response.data.paging?.total || 0;
      hasMoreOrders = page * perPage < totalOrders;
      page += 1;
    } catch (error) {
      console.error("Error fetching Shiprocket orders:", error.response?.data || error.message);
      throw error;
    }
  }

  return allOrders;
};

// GET orders from Shiprocket (for frontend)
app.get("/shiprocket-orders", async (req, res) => {
  const shiprocketToken = await getShiprocketToken();
  if (!shiprocketToken) return res.status(401).json({ message: "Shiprocket Authentication Failed" });

  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ message: "From and To dates are required" });

  try {
    const orders = await fetchOrdersFromShiprocket(shiprocketToken, from, to);
    res.status(200).json({ orders, total_count: orders.length });
  } catch (error) {
    res.status(400).json({ message: "Failed to fetch orders", error: error.response?.data });
  }
});

app.post("/sync-orders", async (req, res) => {
  try {
    const { from, to, orders } = req.body;

    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ message: "No orders to sync" });
    }

    // Fetch product mappings using the new schema
    const productMappings = await ProductMapping.find({});
    const mappingDict = productMappings.reduce((acc, mapping) => {
      acc[mapping.productName] = mapping.updatedID;
      return acc;
    }, {});

    let insertedCount = 0;

    for (const order of orders) {
      // Update product IDs in the order
      order.products.forEach((product) => {
        // Check if there's a mapping for this product name
        if (mappingDict[product.name]) {
          product.updated_id = mappingDict[product.name];
          product.original_id = product.product_id || product.id;
        }

        // Ensure weight is a valid number
        const weightMatch = product.channel_sku?.match(/(\d+)(g|kg)/i); // Extract weight from SKU
        product.weight = weightMatch
          ? parseFloat(weightMatch[1]) / (weightMatch[2].toLowerCase() === "kg" ? 1 : 1000) // Convert grams to kilograms
          : 0; // Default to 0 if weight cannot be determined
      });

      const result = await Order.updateOne(
        { orderID: order.orderID },
        {
          $set: {
            order_date: order.order_date !== "Unknown Date" ? new Date(order.order_date) : null,
            customer: order.customer,
            shipments: order.shipments,
            products: order.products, // This now includes the updated IDs and valid weights
            packed_status: order.packed_status,
            packed_date: order.packed_date !== "Unknown Date" ? new Date(order.packed_date) : null,
            packed_time: order.packed_time,
            packed_person_name: order.packed_person_name,
            warehouse_out: order.warehouse_out,
            warehouse_out_date: order.warehouse_out_date !== "Unknown Date" ? new Date(order.warehouse_out_date) : null,
            warehouse_out_time: order.warehouse_out_time,
            shiprocketDate: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      );

      if (result.upsertedCount > 0) insertedCount++;
    }

    res.json({ message: "Orders synced successfully!", insertedCount });
  } catch (error) {
    console.error("Error syncing orders:", error);
    res.status(500).json({ message: "Failed to sync orders", error: error.message });
  }
});

app.post("/update-product-ids", async (req, res) => {
  const { productUpdates } = req.body;

  try {
    for (const update of productUpdates) {
      await ProductMapping.updateOne(
        { productID: update.productID }, // Use productID as the unique identifier
        { 
          $set: { 
            updatedID: update.updatedID,
            productName: update.productName,
            sku: update.sku, // Add SKU to the update
          }
        },
        { upsert: true }
      );
    }
    res.json({ message: "Product IDs updated successfully!" });
  } catch (error) {
    console.error("Error updating product IDs:", error);
    res.status(500).json({ message: "Failed to update product IDs", error: error.message });
  }
});


app.get("/get-previous-products", async (req, res) => {
  try {
    const products = await ProductMapping.find();
    res.json(products);
  } catch (error) {
    console.error("Error fetching previous products:", error);
    res.status(500).json({ message: "Failed to fetch previous products", error: error.message });
  }
});

// GET all orders from MongoDB
app.get("/all-orders", async (req, res) => {
  try {
    const orders = await Order.find({});
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error fetching orders from MongoDB:", error);
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
});

// Fetch order details by order ID
app.get("/order/:orderID", async (req, res) => {
  try {
    const orderID = decodeURIComponent(req.params.orderID);
    const order = await Order.findOne({ orderID });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.status(200).json({ order });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ message: "Failed to fetch order details", error: error.message });
  }
});




const authenticateAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const decoded = jwt.verify(token, "secretkey");
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: Admins only" });
    }
    req.user = decoded; // Attach user info to the request
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};


// DELETE /admin/users/:id
app.delete('/admin/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    await User.findByIdAndDelete(userId);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user', error });
  }
});

// Update order status to "Packing Completed"
app.post("/order/:orderID/complete-packing", async (req, res) => {
  try {
    const orderID = decodeURIComponent(req.params.orderID);
    const { packed_status, packed_date, packed_time, packed_person_name } = req.body;

    const order = await Order.findOneAndUpdate(
      { orderID },
      { packed_status, packed_date, packed_time, packed_person_name },
      { new: true }
    );

    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    console.error("Error completing packing:", error);
    res.status(500).json({ message: "Failed to complete packing" });
  }
});

// Hold packing route
app.post("/order/:orderID/hold-packing", async (req, res) => {
  const { orderID } = req.params;
  const { hold_reason, reason_text } = req.body;

  try {
    const order = await Order.findOne({ orderID });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.hold_reason = hold_reason;
    order.reason_text = reason_text;
    order.status = "Hold";
    order.packed_status = "Hold";
    order.packed_date = order.packed_date || new Date();
    order.warehouse_out_date = order.warehouse_out_date || new Date();
    await order.save();

    res.status(200).json({ message: "Packing status updated to hold" });
  } catch (error) {
    console.error("Error updating packing status:", error);
    res.status(500).json({ message: "Failed to update packing status" });
  }
});

// Backend route to fetch order by AWB code
app.get('/order/awb/:awbCode', async (req, res) => {
  try {
    const awbCode = req.params.awbCode;
    const order = await Order.findOne({
      "shipments.awb_code": { $regex: `.*${awbCode}$` }
    });
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ order });
  } catch (error) {
    console.error("Error fetching order by AWB:", error);
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

app.post('/order/awb/:awbCode/delivery', async (req, res) => {
  try {
    const awbCode = req.params.awbCode;
    const order = await Order.findOneAndUpdate(
      { "shipments.awb_code": { $regex: `.*${awbCode}$` } },
      {
        warehouse_out: req.body.warehouse_out,
        warehouse_out_date: req.body.warehouse_out_date,
        warehouse_out_time: req.body.warehouse_out_time,
      },
      { new: true }
    );
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json({ order });
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({ error: "Failed to update delivery status" });
  }
});

// Update user details (admin only)
app.put("/admin/users/:userId", authMiddleware(["admin"]), async (req, res) => {
  const { userId } = req.params;
  const { name, role, permissions } = req.body;

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { name, role, permissions },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User updated successfully", user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// Start the server
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
