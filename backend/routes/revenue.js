const express = require("express");
const router = express.Router();

router.get("/summary", async (req, res) => {
  const db = req.app.get("db");
  
  const [totalRevenue] = await db.execute(
    "SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status = 'delivered'"
  );
  
  const [monthlyRevenue] = await db.execute(`
    SELECT 
      DATE_FORMAT(created_at, '%Y-%m') as month,
      COALESCE(SUM(total_amount), 0) as total
    FROM orders 
    WHERE status = 'delivered'
    GROUP BY DATE_FORMAT(created_at, '%Y-%m')
    ORDER BY month DESC
  `);

  res.json({
    totalRevenue: parseFloat(totalRevenue[0].total),
    monthlyRevenue
  });
});

module.exports = router;
