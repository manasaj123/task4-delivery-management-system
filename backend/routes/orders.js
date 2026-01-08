const express = require("express");
const router = express.Router();

router.get("/", async (req, res) => {
  const db = req.app.get("db");
  const [orders] = await db.execute("SELECT * FROM orders ORDER BY created_at DESC");
  res.json(orders);
});

router.post("/cancel/:orderId", async (req, res) => {
  const db = req.app.get("db");
  const { reason } = req.body;
  const orderId = req.params.orderId;
  
  await db.execute(
    "UPDATE orders SET status = 'cancelled', return_reason = ? WHERE order_id = ?",
    [reason, orderId]
  );
  
  const [order] = await db.execute("SELECT * FROM orders WHERE order_id = ?", [orderId]);
  res.json(order[0]);
});

router.post("/return/:orderId", async (req, res) => {
  const db = req.app.get("db");
  const { reason, creditAmount } = req.body;
  const orderId = req.params.orderId;
  
  await db.execute(
    "UPDATE orders SET status = 'returned', return_reason = ?, credit_note_issued = TRUE, credit_note_amount = ? WHERE order_id = ?",
    [reason, creditAmount, orderId]
  );
  
  const [order] = await db.execute("SELECT * FROM orders WHERE order_id = ?", [orderId]);
  res.json(order[0]);
});

module.exports = router;
