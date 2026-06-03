import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RevenueDashboard = ({ orders = [], deliveries = [], complaints = [] }) => {
  const [stats, setStats] = useState({ 
    totalRevenue: 0, 
    returnedAmount: 0,
    netRevenue: 0,
    monthlyRevenue: [],
    totalOrdersCount: 0,
    deliveredOrdersCount: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    totalDeliveries: 0,
    activeDeliveries: 0,
    completedDeliveries: 0,
    successRate: 0,
    complaintRatio: 0,
    totalComplaintsCount: 0,
    activeComplaintsCount: 0,
    resolvedComplaintsCount: 0,
    availableDrivers: 0,
    busyDrivers: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  useEffect(() => {
    calculateStats();
  }, [orders, deliveries, complaints]);

  const calculateStats = () => {
    // Order statistics
    const totalOrdersCount = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const deliveredOrdersCount = deliveredOrders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;
    // const returnedOrders = orders.filter(o => o.status === 'returned').length;
    const returnedOrders = orders.filter(
  o => parseFloat(o.credit_note_amount || 0) > 0
).length;
    
    // Revenue calculations
    const deliveredRevenue = deliveredOrders.reduce((sum, o) => 
      sum + (parseFloat(o.total_amount) || 0), 0
    );
    // const returnedAmount = orders
    //   .filter(o => o.status === 'returned')
    //   .reduce((sum, o) => sum + (parseFloat(o.credit_note_amount) || 0), 0);
    const returnedAmount = orders
  .filter(o => parseFloat(o.credit_note_amount || 0) > 0)
  .reduce((sum, o) => sum + (parseFloat(o.credit_note_amount) || 0), 0);
    const netRevenue = deliveredRevenue - returnedAmount;
    
    // Average order value
    const avgOrderValue = deliveredOrdersCount > 0 
      ? (deliveredRevenue / deliveredOrdersCount).toFixed(0) 
      : 0;
    
    // Delivery statistics
    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter(d => d.status === 'delivered').length;
    const activeDeliveries = deliveries.filter(d => 
      d.status === 'pending' || d.status === 'in_transit'
    ).length;
    
    // Success Rate
    const successRate = totalDeliveries > 0 
      ? ((completedDeliveries / totalDeliveries) * 100).toFixed(1) 
      : 0;
    
    // Complaint statistics
    const totalComplaintsCount = complaints.length;
    const activeComplaintsCount = complaints.filter(c => 
      c.status === 'new' || c.status === 'assigned' || c.status === 'in_progress'
    ).length;
    const resolvedComplaintsCount = complaints.filter(c => 
      c.status === 'resolved' || c.status === 'closed'
    ).length;
    
    // Complaint Ratio = Total Complaints / Total Orders × 100
    const complaintRatio = totalOrdersCount > 0 
      ? ((totalComplaintsCount / totalOrdersCount) * 100).toFixed(1) 
      : 0;

    setStats({
      totalRevenue: deliveredRevenue,
      returnedAmount,
      netRevenue,
      totalOrdersCount,
      deliveredOrdersCount,
      avgOrderValue,
      pendingOrders,
      cancelledOrders,
      returnedOrders,
      totalDeliveries,
      activeDeliveries,
      completedDeliveries,
      successRate,
      complaintRatio,
      totalComplaintsCount,
      activeComplaintsCount,
      resolvedComplaintsCount
    });
    
    setLoading(false);
  };

  const getMonthlyData = () => {
    const monthlyData = {};
    
    orders
      .filter(o => o.status === 'delivered' && o.created_at)
      .forEach(order => {
        const month = new Date(order.created_at).toISOString().slice(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, returned: 0, orders: 0 };
        }
        monthlyData[month].revenue += parseFloat(order.total_amount) || 0;
        monthlyData[month].orders += 1;
      });

    orders
      .filter(o => o.status === 'returned' && o.updated_at)
      .forEach(order => {
        const month = new Date(order.updated_at).toISOString().slice(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { revenue: 0, returned: 0, orders: 0 };
        }
        monthlyData[month].returned += parseFloat(order.credit_note_amount) || 0;
      });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({ 
        month, 
        revenue: data.revenue,
        returned: data.returned,
        netRevenue: data.revenue - data.returned,
        orders: data.orders
      }))
      .sort((a, b) => b.month.localeCompare(a.month));
  };

  const monthlyData = getMonthlyData();
  const maxRevenue = Math.max(...monthlyData.map(m => m.netRevenue), 1000);

  // Format month for display
  const formatMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  // Calculate trend indicators
  const getTrend = (current, previous) => {
    if (!previous || previous === 0) return { direction: 'neutral', percentage: 0 };
    const change = ((current - previous) / previous) * 100;
    return {
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral',
      percentage: Math.abs(change).toFixed(1)
    };
  };

  return (
    <section className="revenue-dashboard">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '25px', 
        flexWrap: 'wrap', 
        gap: '15px' 
      }}>
        <div>
          <h2 style={{ margin: 0 }}>💰 Revenue Dashboard</h2>
          <p style={{ margin: '5px 0 0 0', color: '#666', fontSize: '14px' }}>
            Real-time financial analytics and performance metrics
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            style={{
              padding: '10px 15px',
              borderRadius: '8px',
              border: '2px solid #e0e0e0',
              fontSize: '14px',
              cursor: 'pointer',
              background: 'white'
            }}
          >
            <option value="all">All Time</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <button 
            onClick={calculateStats}
            style={{
              padding: '10px 20px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px', 
          color: '#666' 
        }}>
          <div className="loading-spinner" style={{ margin: '0 auto 20px' }} />
          <p>Calculating statistics...</p>
        </div>
      ) : (
        <>
          {/* Main KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {/* Net Revenue Card */}
            <div style={{
              padding: '25px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '16px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '5px' }}>NET REVENUE</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                    ₹{stats.netRevenue.toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: '30px' }}>💰</div>
              </div>
              <div style={{ marginTop: '15px', fontSize: '13px', opacity: 0.8 }}>
                {stats.deliveredOrdersCount} orders delivered
              </div>
            </div>
            
            {/* Success Rate Card */}
            <div style={{
              padding: '25px',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              borderRadius: '16px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(79, 172, 254, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '5px' }}>SUCCESS RATE</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                    {stats.successRate}%
                  </div>
                </div>
                <div style={{ fontSize: '30px' }}>✅</div>
              </div>
              <div style={{ marginTop: '15px', fontSize: '13px', opacity: 0.8 }}>
                {stats.completedDeliveries}/{stats.totalDeliveries} deliveries completed
              </div>
            </div>
            
            {/* Avg Order Value Card */}
            <div style={{
              padding: '25px',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              borderRadius: '16px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(67, 233, 123, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '5px' }}>AVG ORDER VALUE</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                    ₹{parseInt(stats.avgOrderValue).toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: '30px' }}>📊</div>
              </div>
              <div style={{ marginTop: '15px', fontSize: '13px', opacity: 0.8 }}>
                Per delivered order
              </div>
            </div>
            
            {/* Complaint Ratio Card */}
            <div style={{
              padding: '25px',
              background: stats.complaintRatio > 30 
                ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' 
                : 'linear-gradient(135deg, #a8e063 0%, #56ab2f 100%)',
              borderRadius: '16px',
              color: 'white',
              boxShadow: '0 4px 15px rgba(240, 147, 251, 0.3)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '5px' }}>COMPLAINT RATIO</div>
                  <div style={{ fontSize: '36px', fontWeight: 'bold' }}>
                    {stats.complaintRatio}%
                  </div>
                </div>
                <div style={{ fontSize: '30px' }}>
                  {stats.complaintRatio > 30 ? '⚠️' : '✅'}
                </div>
              </div>
              <div style={{ marginTop: '15px', fontSize: '13px', opacity: 0.8 }}>
                {stats.totalComplaintsCount} complaints / {stats.totalOrdersCount} orders
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '15px',
            marginBottom: '30px'
          }}>
            <div style={{
              padding: '20px',
              background: 'white',
              borderRadius: '12px',
              textAlign: 'center',
              border: '2px solid #d4edda',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontWeight: '600' }}>
                Gross Revenue
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#155724' }}>
                ₹{stats.totalRevenue.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                From {stats.deliveredOrdersCount} delivered orders
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              background: 'white',
              borderRadius: '12px',
              textAlign: 'center',
              border: '2px solid #f8d7da',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '13px', color: '#666', marginBottom: '5px', textTransform: 'uppercase', fontWeight: '600' }}>
                Returns & Credits
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#721c24' }}>
                -₹{stats.returnedAmount.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '5px' }}>
                {stats.returnedOrders} returned orders
              </div>
            </div>
            
            <div style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '12px',
              textAlign: 'center',
              color: 'white',
              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ fontSize: '13px', marginBottom: '5px', textTransform: 'uppercase', fontWeight: '600', opacity: 0.9 }}>
                Net Revenue
              </div>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                ₹{stats.netRevenue.toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>
                After deductions
              </div>
            </div>
          </div>

          {/* Detailed Statistics Tables */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
          }}>
            {/* Orders Summary */}
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1a1a2e', fontSize: '18px' }}>
                📦 Orders Breakdown
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Total Orders', value: stats.totalOrdersCount, color: '#667eea', bg: '#f0f0ff', icon: '📋' },
                  { label: 'Delivered', value: stats.deliveredOrdersCount, color: '#28a745', bg: '#d4edda', icon: '✅' },
                  { label: 'Pending', value: stats.pendingOrders, color: '#ffc107', bg: '#fff3cd', icon: '⏳' },
                  { label: 'Cancelled', value: stats.cancelledOrders, color: '#dc3545', bg: '#f8d7da', icon: '❌' },
                  { label: 'Returned', value: stats.returnedOrders, color: '#6f42c1', bg: '#e8daef', icon: '↩️' }
                ].map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: item.bg,
                    borderRadius: '10px',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{item.icon}</span>
                      <span style={{ fontWeight: '500', color: '#333' }}>{item.label}</span>
                    </div>
                    <span style={{ 
                      fontWeight: 'bold', 
                      fontSize: '18px', 
                      color: item.color 
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* Order Distribution Bar */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>Order Distribution</div>
                <div style={{ 
                  display: 'flex', 
                  height: '8px', 
                  borderRadius: '4px', 
                  overflow: 'hidden',
                  background: '#f0f0f0'
                }}>
                  {stats.totalOrdersCount > 0 && (
                    <>
                      <div style={{ 
                        width: `${(stats.deliveredOrdersCount / stats.totalOrdersCount) * 100}%`, 
                        background: '#28a745' 
                      }} />
                      <div style={{ 
                        width: `${(stats.pendingOrders / stats.totalOrdersCount) * 100}%`, 
                        background: '#ffc107' 
                      }} />
                      <div style={{ 
                        width: `${(stats.cancelledOrders / stats.totalOrdersCount) * 100}%`, 
                        background: '#dc3545' 
                      }} />
                      <div style={{ 
                        width: `${(stats.returnedOrders / stats.totalOrdersCount) * 100}%`, 
                        background: '#6f42c1' 
                      }} />
                    </>
                  )}
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  gap: '15px', 
                  marginTop: '10px',
                  fontSize: '11px',
                  color: '#666'
                }}>
                  <span>🟢 Delivered</span>
                  <span>🟡 Pending</span>
                  <span>🔴 Cancelled</span>
                  <span>🟣 Returned</span>
                </div>
              </div>
            </div>

            {/* Delivery & Complaints Summary */}
            <div style={{
              background: 'white',
              padding: '25px',
              borderRadius: '16px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#1a1a2e', fontSize: '18px' }}>
                🚚 Performance Metrics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { label: 'Total Deliveries', value: stats.totalDeliveries, color: '#667eea', bg: '#f0f0ff', icon: '📦' },
                  { label: 'Active Deliveries', value: stats.activeDeliveries, color: '#17a2b8', bg: '#d1ecf1', icon: '🚀' },
                  { label: 'Completed', value: stats.completedDeliveries, color: '#28a745', bg: '#d4edda', icon: '✅' },
                  { label: 'Success Rate', value: `${stats.successRate}%`, color: '#28a745', bg: '#d4edda', icon: '📈' },
                  { label: 'Active Complaints', value: stats.activeComplaintsCount, color: '#dc3545', bg: '#f8d7da', icon: '🔴' },
                  { label: 'Resolved Complaints', value: stats.resolvedComplaintsCount, color: '#28a745', bg: '#d4edda', icon: '✅' }
                ].map((item, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 15px',
                    background: item.bg,
                    borderRadius: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '20px' }}>{item.icon}</span>
                      <span style={{ fontWeight: '500', color: '#333' }}>{item.label}</span>
                    </div>
                    <span style={{ 
                      fontWeight: 'bold', 
                      fontSize: '18px', 
                      color: item.color 
                    }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Monthly Revenue Chart */}
          <div style={{
            background: 'white',
            padding: '25px',
            borderRadius: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '25px'
            }}>
              <h3 style={{ margin: 0, color: '#1a1a2e' }}>📈 Monthly Revenue Trend</h3>
              <span style={{ fontSize: '13px', color: '#666' }}>
                Total: ₹{monthlyData.reduce((sum, m) => sum + m.netRevenue, 0).toLocaleString()}
              </span>
            </div>
            
            {monthlyData.length > 0 ? (
              <div>
                {monthlyData.slice(0, 12).map((item, index) => {
                  const percentage = (item.netRevenue / maxRevenue) * 100;
                  
                  return (
                    <div key={item.month} style={{ marginBottom: '20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        marginBottom: '8px',
                        alignItems: 'center'
                      }}>
                        <div>
                          <span style={{ fontWeight: 'bold', color: '#333' }}>
                            {formatMonth(item.month)}
                          </span>
                          <span style={{ 
                            marginLeft: '10px', 
                            fontSize: '12px', 
                            color: '#666',
                            background: '#f0f0f0',
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}>
                            {item.orders} orders
                          </span>
                        </div>
                        <span style={{ fontWeight: 'bold', color: '#667eea', fontSize: '16px' }}>
                          ₹{item.netRevenue.toLocaleString()}
                        </span>
                      </div>
                      <div style={{ 
                        background: '#f0f0f0', 
                        borderRadius: '10px', 
                        height: '40px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${Math.min(percentage, 100)}%`,
                          height: '100%',
                          background: percentage > 80 
                            ? 'linear-gradient(90deg, #43e97b, #38f9d7)'
                            : percentage > 40
                            ? 'linear-gradient(90deg, #667eea, #764ba2)'
                            : 'linear-gradient(90deg, #f093fb, #f5576c)',
                          borderRadius: '10px',
                          transition: 'width 1.5s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: '12px',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          minWidth: percentage > 8 ? 'auto' : '50px'
                        }}>
                          {percentage > 8 && `${Math.round(percentage)}%`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ 
                textAlign: 'center', 
                padding: '60px 20px', 
                color: '#666',
                background: '#f8f9fa',
                borderRadius: '12px'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '15px' }}>📊</div>
                <h3>No Revenue Data Yet</h3>
                <p style={{ color: '#888' }}>
                  Start delivering orders to see monthly revenue trends
                </p>
              </div>
            )}
          </div>

          {/* Quick Insights */}
          {stats.totalOrdersCount > 0 && (
            <div style={{
              marginTop: '25px',
              padding: '20px',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              borderRadius: '12px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Revenue per Order</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#667eea' }}>
                  ₹{parseInt(stats.avgOrderValue).toLocaleString()}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Completion Rate</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#28a745' }}>
                  {stats.successRate}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Return Rate</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6f42c1' }}>
                  {stats.totalOrdersCount > 0 
                    ? ((stats.returnedOrders / stats.totalOrdersCount) * 100).toFixed(1) 
                    : 0}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666', textTransform: 'uppercase' }}>Cancellation Rate</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
                  {stats.totalOrdersCount > 0 
                    ? ((stats.cancelledOrders / stats.totalOrdersCount) * 100).toFixed(1) 
                    : 0}%
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Loading Spinner Style */}
      <style>{`
        .loading-spinner {
          width: 50px;
          height: 50px;
          border: 4px solid #e0e0e0;
          border-top: 4px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
};

export default RevenueDashboard;