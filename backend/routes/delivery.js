const express = require("express");
const router = express.Router();
const pool = require("../utils/db");

router.get("/", async (req, res) => {
  try {
    const [deliveries] = await pool.execute(
      "SELECT * FROM deliveries ORDER BY created_at DESC"
    );
    res.json(deliveries);
  } catch (error) {
    console.error("GET /delivery ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/schedule", async (req, res) => {
  try {
    console.log("📦 RAW REQUEST:", req.body);

    const {
      order_id,
      customer_name,
      customer_phone,
      address,
      scheduled_time,
    } = req.body;

    // minimal validation
    if (
      !order_id?.trim() ||
      !customer_name?.trim() ||
      !address?.trim() ||
      !scheduled_time
    ) {
      console.log("❌ VALIDATION FAILED:", {
        order_id,
        customer_name,
        address,
        scheduled_time,
      });
      return res
        .status(400)
        .json({ error: "Order ID, Name, Address, Time required" });
    }

    console.log("✅ INSERTING:", {
      order_id,
      customer_name,
      address,
      scheduled_time,
    });

    await pool.execute(
      `INSERT INTO deliveries (
        order_id, customer_name, customer_phone, address, scheduled_time
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        order_id.trim(),
        customer_name.trim(),
        customer_phone || null,
        address.trim(),
        scheduled_time,
      ]
    );

    // ✅ select by order_id, not id
    const [delivery] = await pool.execute(
      "SELECT * FROM deliveries WHERE order_id = ?",
      [order_id.trim()]
    );
    console.log("✅ FULL DELIVERY:", delivery[0]);

    res.status(201).json(delivery[0]);
  } catch (error) {
    console.error("🚨 FULL ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
