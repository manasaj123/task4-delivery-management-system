const pool = require('../utils/db'); // Centralized DB pool

class Delivery {
  // Get all deliveries sorted by scheduled time
  static async findAll() {
    try {
      const [rows] = await pool.execute(`
        SELECT id, order_id, customer_name, customer_phone, address, status, 
               scheduled_time, driver_id, driver_name, lat, lng, created_at, updated_at
        FROM deliveries 
        ORDER BY scheduled_time ASC, status ASC
      `);
      return rows;
    } catch (error) {
      throw new Error(`Delivery fetch failed: ${error.message}`);
    }
  }

  // Create new delivery schedule
  static async create(data) {
    try {
      const { 
        order_id, customer_name, customer_phone, address, scheduled_time, 
        driver_id, driver_name, lat, lng 
      } = data;

      const [result] = await pool.execute(`
        INSERT INTO deliveries (
          order_id, customer_name, customer_phone, address, 
          scheduled_time, driver_id, driver_name, lat, lng
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [order_id, customer_name, customer_phone, address, scheduled_time, driver_id, driver_name, lat, lng]);

      const [newDelivery] = await pool.execute(
        'SELECT * FROM deliveries WHERE id = ?', [result.insertId]
      );
      return newDelivery[0];
    } catch (error) {
      throw new Error(`Delivery creation failed: ${error.message}`);
    }
  }

  // Update delivery status and driver info
  static async updateStatus(id, data) {
    try {
      const { status, driver_id, driver_name } = data;
      
      await pool.execute(`
        UPDATE deliveries 
        SET status = ?, driver_id = ?, driver_name = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [status, driver_id, driver_name, id]);

      const [updatedDelivery] = await pool.execute(
        'SELECT * FROM deliveries WHERE id = ?', [id]
      );
      return updatedDelivery[0];
    } catch (error) {
      throw new Error(`Status update failed: ${error.message}`);
    }
  }

  // Get delivery by ID
  static async findById(id) {
    try {
      const [delivery] = await pool.execute(
        'SELECT * FROM deliveries WHERE id = ?', [id]
      );
      return delivery[0];
    } catch (error) {
      throw new Error(`Delivery not found: ${error.message}`);
    }
  }
}

module.exports = Delivery;
