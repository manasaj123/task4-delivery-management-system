const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

router.get('/', async (req, res) => {
  try {
    const [complaints] = await pool.execute('SELECT * FROM complaints ORDER BY created_at DESC');
    res.json(complaints);
  } catch (error) {
    console.error('Complaints GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    // ✅ SAFE: Filter undefined/null values
    const { complaint_id, customer_name, customer_phone, order_id, subject, description } = req.body;
    
    const params = [
      complaint_id || null,
      customer_name || null,
      customer_phone || null,
      order_id || null,
      subject || null,
      description || null
    ].filter(Boolean); // Remove null/undefined

    if (params.length < 2) {
      return res.status(400).json({ error: 'Minimum required fields missing' });
    }

    const [result] = await pool.execute(
      `INSERT INTO complaints (complaint_id, customer_name, customer_phone, order_id, subject, description) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [complaint_id || null, customer_name || null, customer_phone || null, order_id || null, subject || null, description || null]
    );
    
    const [complaint] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [result.insertId]);
    req.app.get('io')?.emit('complaintCreated', complaint[0]);
    res.status(201).json(complaint[0]);
  } catch (error) {
    console.error('Complaints POST error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
