const pool = require('../utils/db');

class Order {
  // Get all orders with status filtering
  static async findAll(status = null) {
    try {
      let query = 'SELECT * FROM orders';
      let params = [];
      
      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Order fetch failed: ${error.message}`);
    }
  }

  // Cancel order with reason
  static async cancel(orderId, reason) {
    try {
      await pool.execute(`
        UPDATE orders 
        SET status = 'cancelled', return_reason = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE order_id = ?
      `, [reason, orderId]);

      const [order] = await pool.execute(
        'SELECT * FROM orders WHERE order_id = ?', [orderId]
      );
      return order[0];
    } catch (error) {
      throw new Error(`Order cancellation failed: ${error.message}`);
    }
  }

  // Process return with credit note
  static async processReturn(orderId, data) {
    try {
      const { reason, creditAmount } = data;
      
      await pool.execute(`
        UPDATE orders 
        SET status = 'returned', 
            return_reason = ?, 
            credit_note_issued = TRUE, 
            credit_note_amount = ?,
            updated_at = CURRENT_TIMESTAMP 
        WHERE order_id = ?
      `, [reason, creditAmount, orderId]);

      const [order] = await pool.execute(
        'SELECT * FROM orders WHERE order_id = ?', [orderId]
      );
      return order[0];
    } catch (error) {
      throw new Error(`Return processing failed: ${error.message}`);
    }
  }

  // Get order by ID
  static async findById(orderId) {
    try {
      const [order] = await pool.execute(
        'SELECT * FROM orders WHERE order_id = ?', [orderId]
      );
      return order[0];
    } catch (error) {
      throw new Error(`Order not found: ${error.message}`);
    }
  }

  // Get revenue orders only
  static async getDeliveredOrders() {
    return await this.findAll('delivered');
  }
}

module.exports = Order;
