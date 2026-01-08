const pool = require('../utils/db');

class Complaint {
  // Get all complaints with priority sorting
  static async findAll() {
    try {
      const [rows] = await pool.execute(`
        SELECT id, complaint_id, customer_name, customer_phone, order_id, 
               subject, description, status, priority, assigned_to, 
               escalation_level, created_at
        FROM complaints 
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
          END, created_at DESC
      `);
      return rows;
    } catch (error) {
      throw new Error(`Complaint fetch failed: ${error.message}`);
    }
  }

  // Create new complaint
  static async create(data) {
    try {
      const { 
        complaint_id, customer_name, customer_phone, order_id, 
        subject, description, priority 
      } = data;

      const [result] = await pool.execute(`
        INSERT INTO complaints (
          complaint_id, customer_name, customer_phone, order_id, 
          subject, description, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [complaint_id, customer_name, customer_phone, order_id, subject, description, priority]);

      const [newComplaint] = await pool.execute(
        'SELECT * FROM complaints WHERE id = ?', [result.insertId]
      );
      return newComplaint[0];
    } catch (error) {
      throw new Error(`Complaint creation failed: ${error.message}`);
    }
  }

  // Escalate complaint
  static async escalate(id, data) {
    try {
      const { assigned_to, escalation_level } = data;
      
      await pool.execute(`
        UPDATE complaints 
        SET status = 'escalated', 
            assigned_to = ?, 
            escalation_level = ?,
            updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [assigned_to, escalation_level, id]);

      const [complaint] = await pool.execute(
        'SELECT * FROM complaints WHERE id = ?', [id]
      );
      return complaint[0];
    } catch (error) {
      throw new Error(`Complaint escalation failed: ${error.message}`);
    }
  }

  // Get by ID
  static async findById(id) {
    try {
      const [complaint] = await pool.execute(
        'SELECT * FROM complaints WHERE id = ?', [id]
      );
      return complaint[0];
    } catch (error) {
      throw new Error(`Complaint not found: ${error.message}`);
    }
  }
}

module.exports = Complaint;
