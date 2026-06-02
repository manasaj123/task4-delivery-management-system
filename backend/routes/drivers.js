const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// GET all drivers
router.get('/', async (req, res) => {
  try {
    const [drivers] = await pool.execute('SELECT * FROM drivers ORDER BY name ASC');
    res.json(drivers);
  } catch (error) {
    console.error('GET /drivers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST new driver
router.post('/', async (req, res) => {
  try {
    const { driver_id, name, phone, vehicle_number, vehicle_type } = req.body;

    if (!driver_id || !name) {
      return res.status(400).json({ error: 'Driver ID and Name required' });
    }

    // Check for duplicate ID
    const [existingId] = await pool.execute('SELECT id FROM drivers WHERE driver_id = ?', [driver_id]);
    if (existingId.length > 0) {
      return res.status(400).json({ error: 'Driver ID already exists' });
    }

    // Check for duplicate phone
    if (phone) {
      const [existingPhone] = await pool.execute('SELECT id FROM drivers WHERE phone = ?', [phone]);
      if (existingPhone.length > 0) {
        return res.status(400).json({ error: 'Phone number already registered' });
      }
    }

    // Check for duplicate vehicle
    if (vehicle_number) {
      const [existingVehicle] = await pool.execute('SELECT id FROM drivers WHERE vehicle_number = ?', [vehicle_number]);
      if (existingVehicle.length > 0) {
        return res.status(400).json({ error: 'Vehicle number already assigned' });
      }
    }

    const [result] = await pool.execute(
      'INSERT INTO drivers (driver_id, name, phone, vehicle_number, vehicle_type) VALUES (?, ?, ?, ?, ?)',
      [driver_id, name, phone || null, vehicle_number || null, vehicle_type || 'Bike']
    );

    const [newDriver] = await pool.execute('SELECT * FROM drivers WHERE id = ?', [result.insertId]);
    res.status(201).json(newDriver[0]);
  } catch (error) {
    console.error('POST /drivers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update driver
router.put('/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { name, phone, vehicle_number, vehicle_type } = req.body;

    await pool.execute(
      'UPDATE drivers SET name = ?, phone = ?, vehicle_number = ?, vehicle_type = ? WHERE driver_id = ?',
      [name, phone, vehicle_number, vehicle_type, driverId]
    );

    const [updated] = await pool.execute('SELECT * FROM drivers WHERE driver_id = ?', [driverId]);
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('PUT /drivers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update driver status
router.put('/:driverId/status', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status } = req.body;

    await pool.execute('UPDATE drivers SET status = ? WHERE driver_id = ?', [status, driverId]);
    
    const [updated] = await pool.execute('SELECT * FROM drivers WHERE driver_id = ?', [driverId]);
    
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;