const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// GET all complaints
router.get('/', async (req, res) => {
  try {
    const [complaints] = await pool.execute(
      'SELECT * FROM complaints ORDER BY created_at DESC'
    );
    res.json(complaints);
  } catch (error) {
    console.error('GET /complaints error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new complaint
router.post('/', async (req, res) => {
  try {
    const { customer_name, customer_phone, order_id, subject, description, priority } = req.body;

    if (!customer_name || !description) {
      return res.status(400).json({ error: 'Customer name and description are required' });
    }

    const [result] = await pool.execute(
      `INSERT INTO complaints (customer_name, customer_phone, order_id, subject, description, priority, status)
       VALUES (?, ?, ?, ?, ?, ?, 'new')`,
      [customer_name, customer_phone || null, order_id || null, subject || 'No Subject', description, priority || 'medium']
    );

    const [newComplaint] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [result.insertId]);
    res.status(201).json(newComplaint[0]);
  } catch (error) {
    console.error('POST /complaints error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT escalate/assign complaint
router.put('/:id/escalate', async (req, res) => {
  try {
    const { id } = req.params;
    const { escalation_level, assigned_to, status } = req.body;

    const newStatus = status || (escalation_level === 1 ? 'assigned' : 'in_progress');

    await pool.execute(
      `UPDATE complaints SET status = ?, escalation_level = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [newStatus, escalation_level || 1, assigned_to || 'team_lead', id]
    );

    const [updated] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [id]);
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Escalate error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT resolve complaint
// PUT resolve complaint with manager review
router.put('/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;

    const {
      resolution_type,
      manager_notes,
      customer_message,
      resolved_by
    } = req.body;

    await pool.execute(
      `UPDATE complaints
       SET status = 'resolved',
           resolution_type = ?,
           manager_notes = ?,
           customer_message = ?,
           resolved_by = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        resolution_type || null,
        manager_notes || null,
        customer_message || null,
        resolved_by || 'Manager',
        id
      ]
    );

    const [updated] = await pool.execute(
      'SELECT * FROM complaints WHERE id = ?',
      [id]
    );

    if (updated.length === 0) {
      return res.status(404).json({
        error: 'Complaint not found'
      });
    }

    res.json(updated[0]);

  } catch (error) {
    console.error('Resolve error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// PUT close complaint
router.put('/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute(
      "UPDATE complaints SET status = 'closed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );
    
    const [updated] = await pool.execute('SELECT * FROM complaints WHERE id = ?', [id]);
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Complaint not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Close error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;