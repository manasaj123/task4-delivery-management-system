import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "./Styles.css";  

const RevenueDashboard = () => {
  const [stats, setStats] = useState({ 
    totalRevenue: 0, 
    monthlyRevenue: [],
    totalOrders: 0,
    avgOrderValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/revenue/summary');  // ✅ Proxy URL
      setStats({
        totalRevenue: res.data.totalRevenue || 0,
        monthlyRevenue: res.data.monthlyRevenue || [],
        totalOrders: res.data.totalOrders || 0,
        avgOrderValue:
          res.data.totalRevenue > 0
            ? (res.data.totalRevenue / (res.data.totalOrders || 1)).toFixed(0)
            : 0,
      });
    } catch (error) {
      console.error('Revenue fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="revenue-dashboard">
      <h2>💰 Revenue Dashboard</h2>

      {loading ? (
        <div className="loading">Loading revenue data...</div>
      ) : stats.totalRevenue === 0 && stats.monthlyRevenue.length === 0 ? (
        <div className="empty-state">
          <h3>📊 No Revenue Data</h3>
          <p>Complete some deliveries to see revenue analytics</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Revenue</h3>
              <div className="stat-number total-revenue">
                ₹{stats.totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <h3>Orders Delivered</h3>
              <div className="stat-number orders-count">
                {stats.totalOrders || stats.monthlyRevenue.length}
              </div>
            </div>
            <div className="stat-card">
              <h3>Avg Order Value</h3>
              <div className="stat-number avg-value">
                ₹{stats.avgOrderValue.toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <h3>Active Months</h3>
              <div className="stat-number growth-rate">
                {stats.monthlyRevenue.length}
              </div>
            </div>
          </div>

          <div className="chart-section">
            <div className="chart-header">
              <h4 className="chart-title">📈 Monthly Revenue Trend</h4>
              <button className="refresh-btn" onClick={fetchRevenue}>
                🔄 Refresh
              </button>
            </div>
            <div className="monthly-chart">
              {stats.monthlyRevenue.slice(0, 12).map((item, index) => (
                <div key={item._id || index} className="chart-bar">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${Math.min(
                        (item.total /
                          Math.max(
                            ...stats.monthlyRevenue.map(m => m.total),
                            1000
                          )) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                  <div className="month-label">{item._id || 'Current'}</div>
                  <div className="revenue-amount">
                    ₹{parseFloat(item.total).toLocaleString()}
                  </div>
                </div>
              ))}
              {stats.monthlyRevenue.length === 0 && (
                <div className="empty-state">
                  <h3>No monthly data</h3>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default RevenueDashboard;
