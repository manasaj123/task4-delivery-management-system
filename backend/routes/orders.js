const express = require('express');
const router = express.Router();

// GET all orders
router.get('/', async (req, res) => {
  try {
    const db = req.app.get('db');
    const [orders] = await db.execute('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders);
  } catch (error) {
    console.error('GET /orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create new order
router.post('/create', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { order_id, customer_name, customer_phone, total_amount, status } = req.body;

    if (!order_id || !customer_name || !total_amount) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    if (parseFloat(total_amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    // Check if order exists
    const [existing] = await db.execute(
      'SELECT id FROM orders WHERE order_id = ?',
      [order_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Order ID already exists' });
    }

    // Try inserting with common fields
    const [result] = await db.execute(
      'INSERT INTO orders (order_id, customer_name, total_amount, status) VALUES (?, ?, ?, ?)',
      [order_id, customer_name, parseFloat(total_amount), status || 'pending']
    );

    const [newOrder] = await db.execute(
      'SELECT * FROM orders WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newOrder[0]);
  } catch (error) {
    console.error('POST /orders/create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST cancel order
router.post('/cancel/:orderId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { orderId } = req.params;
    const { reason } = req.body;

    await db.execute(
      "UPDATE orders SET status = 'cancelled', return_reason = ? WHERE order_id = ?",
      [reason, orderId]
    );

    const [order] = await db.execute(
      'SELECT * FROM orders WHERE order_id = ?',
      [orderId]
    );

    if (order.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order[0]);
  } catch (error) {
    console.error('Cancel error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST return order
router.post('/return/:orderId', async (req, res) => {
  try {
    const db = req.app.get('db');
    const { orderId } = req.params;
    const { reason, creditAmount } = req.body;

    await db.execute(
      "UPDATE orders SET status = 'returned', return_reason = ?, credit_note_amount = ? WHERE order_id = ?",
      [reason, parseFloat(creditAmount), orderId]
    );

    const [order] = await db.execute(
      'SELECT * FROM orders WHERE order_id = ?',
      [orderId]
    );

    if (order.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order[0]);
  } catch (error) {
    console.error('Return error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;