import React, { useState, useEffect } from 'react';
import axios from 'axios';
import "./Styles.css"; 

const ReturnsHandler = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [loading, setLoading] = useState(true);

  // ✅ NEW
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/orders');
      setOrders(res.data || []);
    } catch (error) {
      console.error('Orders fetch failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (orderId) => {
    if (!reason.trim()) {
      alert('Please enter cancel reason');
      return;
    }
    try {
      await axios.post(`/api/orders/cancel/${orderId}`, { reason });
      setReason('');
      fetchOrders();
    } catch (error) {
      console.error('Cancel failed:', error);
    }
  };

  const handleReturn = async (orderId) => {
    if (!reason.trim() || !creditAmount) {
      alert('Please enter reason and credit amount');
      return;
    }
    try {
      await axios.post(`/api/orders/return/${orderId}`, {
        reason,
        creditAmount: parseFloat(creditAmount),
      });
      setSelectedOrder(null);
      setReason('');
      setCreditAmount('');
      fetchOrders();
    } catch (error) {
      console.error('Return failed:', error);
    }
  };

  // ✅ FILTERED ORDERS
  const filteredOrders = orders.filter(order => {
    if (activeFilter === "all") return true;
    return order.status === activeFilter;
  });

  return (
    <section className="returns-handler">
      <h2>↩️ Returns & Cancellations</h2>

      {/* ✅ FILTER BUTTONS */}
      <div className="stats-bar">
        <div className="stat-item" onClick={() => setActiveFilter("pending")}>
          <span className="stat-number">
            {orders.filter(o => o.status === 'pending').length}
          </span>
          <span className="stat-label">Pending</span>
        </div>

        <div className="stat-item" onClick={() => setActiveFilter("delivered")}>
          <span className="stat-number">
            {orders.filter(o => o.status === 'delivered').length}
          </span>
          <span className="stat-label">Delivered</span>
        </div>

        <div className="stat-item" onClick={() => setActiveFilter("all")}>
          <span className="stat-number">{orders.length}</span>
          <span className="stat-label">All</span>
        </div>
      </div>

      {/* ✅ ORDER LIST */}
      <div className="order-list">
        {loading ? (
          <div className="loading">🔄 Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state">
            <h3>No Orders</h3>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div key={order.id || order.order_id} className="order-item">
              <div className="order-info">
                <strong>#{order.order_id || order.id}</strong>
                <span>₹{order.total_amount || 0}</span>
                <span className={`order-status status-${order.status}`}>
                  {order.status}
                </span>
              </div>

              {['pending', 'delivered'].includes(order.status) && (
                <div className="actions">
                  <button
                    className="btn-cancel"
                    onClick={() => handleCancel(order.order_id || order.id)}
                  >
                    ❌ Cancel
                  </button>

                  {order.status === 'delivered' && (
                    <button
                      className="btn-return"
                      onClick={() => setSelectedOrder(order.order_id || order.id)}
                    >
                      ↩️ Return
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* ✅ RETURN MODAL */}
      {selectedOrder && (
        <>
          <div className="modal-overlay" onClick={() => setSelectedOrder(null)} />
          <div className="modal">
            <h3>Process Return for #{selectedOrder}</h3>
            <input
              placeholder="Return Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <input
              type="number"
              placeholder="Credit Amount"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
            />
            <div className="modal-buttons">
              <button
                className="btn-confirm"
                onClick={() => handleReturn(selectedOrder)}
              >
                💳 Issue Credit Note
              </button>
              <button
                className="btn-cancel-modal"
                onClick={() => setSelectedOrder(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default ReturnsHandler;
