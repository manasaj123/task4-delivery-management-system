const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// GET all deliveries
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM deliveries ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('GET /delivery error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST schedule new delivery
router.post('/schedule', async (req, res) => {
  try {
    const {
      order_id,
      customer_name,
      customer_phone,
      address,
      scheduled_time,
      driver_id,
      driver_name,
      lat,
      lng
    } = req.body;

    console.log('📦 Received delivery data:', req.body);

    // Validation - check only the fields we need
    if (!order_id || !customer_name || !address || !scheduled_time) {
      const missingFields = [];
      if (!order_id) missingFields.push('Order ID');
      if (!customer_name) missingFields.push('Customer Name');
      if (!address) missingFields.push('Address');
      if (!scheduled_time) missingFields.push('Scheduled Time');
      
      return res.status(400).json({ 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      });
    }

    // Check for duplicate delivery
    const [existing] = await pool.execute(
      'SELECT id FROM deliveries WHERE order_id = ?',
      [order_id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Delivery already exists for this order' });
    }

    // Insert delivery - database will auto-generate the id
    const [result] = await pool.execute(
      `INSERT INTO deliveries (
        order_id, 
        customer_name, 
        customer_phone, 
        address,
        scheduled_time, 
        driver_id, 
        driver_name, 
        lat, 
        lng, 
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        order_id,
        customer_name,
        customer_phone || null,
        address,
        scheduled_time,
        driver_id || null,
        driver_name || null,
        lat || 17.3850,
        lng || 78.4867
      ]
    );

    // Fetch the created delivery with all fields
    const [newDelivery] = await pool.execute(
      'SELECT * FROM deliveries WHERE id = ?',
      [result.insertId]
    );

    if (newDelivery.length === 0) {
      return res.status(500).json({ error: 'Failed to create delivery' });
    }

    console.log('✅ Delivery created:', newDelivery[0]);

    res.status(201).json(newDelivery[0]);
  } catch (error) {
    console.error('❌ Schedule delivery error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    
    res.status(500).json({ 
      error: error.sqlMessage || error.message || 'Failed to schedule delivery' 
    });
  }
});

// PUT update delivery status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`Updating delivery ${id} to status: ${status}`);

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Check if delivery exists
    const [existing] = await pool.execute(
      'SELECT * FROM deliveries WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Update delivery status
    await pool.execute(
      'UPDATE deliveries SET status = ? WHERE id = ?',
      [status, id]
    );

    // If delivery is marked as delivered, update the order status
    if (status === 'delivered') {
      try {
        await pool.execute(
          "UPDATE orders SET status = 'delivered' WHERE order_id = ?",
          [existing[0].order_id]
        );
      } catch (orderError) {
        console.log('Order update skipped:', orderError.message);
      }
    }

    // If delivery is cancelled, update the order status
    if (status === 'cancelled') {
      try {
        await pool.execute(
          "UPDATE orders SET status = 'cancelled' WHERE order_id = ?",
          [existing[0].order_id]
        );
      } catch (orderError) {
        console.log('Order update skipped:', orderError.message);
      }
    }

    // Fetch updated delivery
    const [updated] = await pool.execute(
      'SELECT * FROM deliveries WHERE id = ?',
      [id]
    );

    res.json(updated[0]);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;