const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mysql = require('mysql2/promise');
require("dotenv").config();

console.log("🚀 Starting Delivery Backend...");

// MySQL Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'deliverydatabase',
  waitForConnections: true,
  connectionLimit: 10
});

const app = express();
app.use(cors());
app.use(express.json()); // ✅ CRITICAL for POST data

// ✅ MAKE POOL GLOBAL
app.set("db", pool);

// Socket.io
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

// ✅ HEALTH CHECK
app.get("/health", (req, res) => res.json({ status: "OK", db: "connected" }));

// ✅ ROUTES - MUST LOAD AFTER middleware
console.log("📁 Loading routes...");
app.use("/api/delivery", require("./routes/delivery"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/revenue", require("./routes/revenue"));
app.use("/api/complaints", require("./routes/complaints"));
app.use("/api/drivers", require("./routes/drivers"));
console.log("✅ Routes loaded!");

const PORT = process.env.PORT || 5006;
server.listen(PORT, '0.0.0.0', async () => {
  try {
    await pool.getConnection();
    console.log("✅ MySQL Connected");
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📋 Test: http://localhost:${PORT}/health`);
    console.log(`📋 POST: http://localhost:${PORT}/api/delivery/schedule`);
  } catch (error) {
    console.error("❌ MySQL Error:", error.message);
  }
});
