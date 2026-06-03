const express = require("express");
const router = express.Router();

router.get("/summary", async (req, res) => {
  try {
    const db = req.app.get("db");
    
    // Total revenue from delivered orders
    const [totalRevenue] = await db.execute(
      "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'delivered'"
    );
    
    // Total returned amount
    const [totalReturned] = await db.execute(
  "SELECT COALESCE(SUM(credit_note_amount), 0) as total FROM orders WHERE credit_note_amount > 0"
    );
    
    // Monthly revenue (delivered)
    const [monthlyRevenue] = await db.execute(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as _id,
        COALESCE(SUM(total_amount), 0) as total
      FROM orders 
      WHERE status = 'delivered'
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY _id DESC
    `);

    // Monthly returns
    const [monthlyReturns] = await db.execute(`
      SELECT 
        DATE_FORMAT(updated_at, '%Y-%m') as _id,
        COALESCE(SUM(credit_note_amount), 0) as total
      FROM orders 
      WHERE status = 'returned' AND credit_note_issued = TRUE
      GROUP BY DATE_FORMAT(updated_at, '%Y-%m')
      ORDER BY _id DESC
    `);

    const [totalOrders] = await db.execute(
      "SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'"
    );
    
    const [totalDeliveries] = await db.execute(
      "SELECT COUNT(*) as count FROM deliveries WHERE status = 'delivered'"
    );

    res.json({
      totalRevenue: parseFloat(totalRevenue[0].total),
      totalReturned: parseFloat(totalReturned[0].total),
      netRevenue: parseFloat(totalRevenue[0].total) - parseFloat(totalReturned[0].total),
      monthlyRevenue: monthlyRevenue,
      monthlyReturns: monthlyReturns,
      totalOrders: totalOrders[0].count,
      totalDeliveries: totalDeliveries[0].count
    });
  } catch (error) {
    console.error('Revenue fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;