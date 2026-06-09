import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ReturnsHandler = ({ orders, setOrders, deliveries, setDeliveries, refreshAllData }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [successMsg, setSuccessMsg] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [orderForm, setOrderForm] = useState({
    order_id: '',
    customer_name: '',
    customer_phone: '',
    total_amount: '',
    status: 'pending'
  });
  const [creating, setCreating] = useState(false);

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

  const generateOrderId = () => {
    const count = orders.length + 1;
    return `ORD-${String(count).padStart(3, '0')}`;
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    
    if (!orderForm.order_id || !orderForm.customer_name || !orderForm.total_amount) {
      setSuccessMsg('❌ Please fill all required fields');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    if (parseFloat(orderForm.total_amount) <= 0) {
      setSuccessMsg('❌ Amount must be greater than 0');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    setCreating(true);
    try {
      const res = await axios.post('/api/orders/create', {
        ...orderForm,
        total_amount: parseFloat(orderForm.total_amount)
      });
      setSuccessMsg(`✅ Order #${res.data.order_id} created!`);
      
      setOrderForm({
        order_id: generateOrderId(),
        customer_name: '',
        customer_phone: '',
        total_amount: '',
        status: 'pending'
      });
      
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchOrders();
      if (refreshAllData) refreshAllData();
    } catch (error) {
      setSuccessMsg(`❌ ${error.response?.data?.error || 'Failed to create order'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = async (orderId) => {
    const cancelReason = prompt('Enter cancel reason:');
    if (!cancelReason) return;
    
    try {
      await axios.post(`/api/orders/cancel/${orderId}`, { reason: cancelReason });
      
      const linkedDelivery = deliveries.find(d => d.order_id === orderId);
      if (linkedDelivery) {
        await axios.put(`/api/delivery/${linkedDelivery.id}/status`, {
          status: 'cancelled'
        });
      }
      
      setSuccessMsg('✅ Order cancelled successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      if (refreshAllData) refreshAllData();
    } catch (error) {
      alert('Failed to cancel order');
    }
  };

  const handleReturn = async (orderId) => {
    if (!reason.trim() || !creditAmount || parseFloat(creditAmount) <= 0) {
      alert('Please enter valid reason and credit amount (greater than 0)');
      return;
    }
    
    try {
      await axios.post(`/api/orders/return/${orderId}`, {
        reason,
        creditAmount: parseFloat(creditAmount),
      });
      
      const linkedDelivery = deliveries.find(d => d.order_id === orderId);
      if (linkedDelivery) {
        await axios.put(`/api/delivery/${linkedDelivery.id}/status`, {
          status: 'return_pickup_pending'
        });
      }
      
      setSelectedOrder(null);
      setReason('');
      setCreditAmount('');
      setSuccessMsg('✅ Return processed! Credit note issued.');
      setTimeout(() => setSuccessMsg(''), 3000);
      
      if (refreshAllData) refreshAllData();
    } catch (error) {
      alert('Failed to process return');
    }
  };

  const getOrderDeliveryStatus = (orderId) => {
    const delivery = deliveries.find(d => d.order_id === orderId);
    if (!delivery) {
      return { status: 'not_scheduled', label: 'Not Scheduled', color: '#6c757d' };
    }
    
    const statusMap = {
      'pending': { label: 'Pending', color: '#ffc107', icon: '⏳' },
      'in_transit': { label: 'In Transit', color: '#007bff', icon: '🚀' },
      'delivered': { label: 'Delivered', color: '#28a745', icon: '✅' },
      'cancelled': { label: 'Cancelled', color: '#dc3545', icon: '❌' },
      'return_pickup_pending': { label: 'Return Pickup Pending', color: '#6f42c1', icon: '↩️' }
    };
    
    return { 
      status: delivery.status, 
      ...statusMap[delivery.status],
      delivery: delivery 
    };
  };

  // ✅ FIXED: Correct return progress tracking
  const getReturnProgress = (order) => {
    if (order.status !== 'returned') return null;
    
    const delivery = deliveries.find(d => d.order_id === order.order_id);
    
    // Step 0: Return Requested (always complete if status is 'returned')
    // Step 1: Pickup Scheduled (if delivery status is return_pickup_pending or beyond)
    // Step 2: In Transit/Picked Up (if delivery status is in_transit or beyond)
    // Step 3: Refunded/Completed (if delivery status is delivered)
    
    if (!delivery) {
      return {
        currentStep: 0,
        steps: [
          { label: 'Return Requested', complete: true },
          { label: 'Pickup Scheduled', complete: false },
          { label: 'Picked Up', complete: false },
          { label: 'Refunded', complete: false }
        ]
      };
    }
    
    let currentStep = 0;
    
    switch(delivery.status) {
      case 'return_pickup_pending':
        currentStep = 1;
        break;
      case 'in_transit':
        currentStep = 2;
        break;
      case 'delivered':
        currentStep = 3;
        break;
      default:
        currentStep = 0;
    }
    
    return {
      currentStep,
      steps: [
        { label: 'Return Requested', complete: currentStep >= 0 },
        { label: 'Pickup Scheduled', complete: currentStep >= 1 },
        { label: 'Picked Up', complete: currentStep >= 2 },
        { label: 'Refunded', complete: currentStep >= 3 }
      ]
    };
  };

  const filteredOrders = orders.filter(order => {
    if (activeFilter === "all") return true;
    if (activeFilter === "returned") {
  return order.status === "returned";
}

return order.status === activeFilter;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    returned: orders.filter(
  o => o.status === 'returned'
).length
  };

  return (
    <section className="returns-handler">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0 }}>↩️ Returns & Cancellations</h2>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '12px 24px',
            background: showCreateForm ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {showCreateForm ? '✕ Close' : '➕ New Order'}
        </button>
      </div>

      {successMsg && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '15px',
          fontWeight: 'bold',
          textAlign: 'center',
          background: successMsg.includes('✅') ? '#d4edda' : '#f8d7da',
          color: successMsg.includes('✅') ? '#155724' : '#721c24'
        }}>
          {successMsg}
        </div>
      )}

      {showCreateForm && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '25px',
          borderRadius: '12px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: 'white', marginTop: 0 }}>📝 Create New Order</h3>
          <form onSubmit={handleCreateOrder}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <input
                placeholder="Order ID *"
                value={orderForm.order_id}
                onChange={(e) => setOrderForm({...orderForm, order_id: e.target.value})}
                required
                style={{ padding: '12px', borderRadius: '6px', border: 'none' }}
              />
              <input
                placeholder="Customer Name *"
                value={orderForm.customer_name}
                onChange={(e) => setOrderForm({...orderForm, customer_name: e.target.value})}
                required
                style={{ padding: '12px', borderRadius: '6px', border: 'none' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <input
                placeholder="Phone"
                value={orderForm.customer_phone}
                onChange={(e) => setOrderForm({...orderForm, customer_phone: e.target.value})}
                style={{ padding: '12px', borderRadius: '6px', border: 'none' }}
              />
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Amount (₹) *"
                value={orderForm.total_amount}
                onChange={(e) => setOrderForm({...orderForm, total_amount: e.target.value})}
                required
                style={{ padding: '12px', borderRadius: '6px', border: 'none' }}
              />
              <select
                value={orderForm.status}
                onChange={(e) => setOrderForm({...orderForm, status: e.target.value})}
                style={{ padding: '12px', borderRadius: '6px', border: 'none' }}
              >
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={creating}
              style={{
                width: '100%',
                padding: '14px',
                background: creating ? '#6c757d' : '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                cursor: creating ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {creating ? '⏳ Creating...' : '✅ Create Order'}
            </button>
          </form>
        </div>
      )}

      {/* Status Filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { key: 'all', label: 'All', color: '#6c757d', bgColor: '#e9ecef' },
          { key: 'pending', label: 'Pending', color: '#856404', bgColor: '#fff3cd' },
          { key: 'delivered', label: 'Delivered', color: '#155724', bgColor: '#d4edda' },
          { key: 'cancelled', label: 'Cancelled', color: '#721c24', bgColor: '#f8d7da' },
          { key: 'returned', label: 'Returned', color: '#6f42c1', bgColor: '#e8daef' }
        ].map(item => (
          <div
            key={item.key}
            onClick={() => setActiveFilter(item.key)}
            style={{
              padding: '15px 10px',
              background: activeFilter === item.key ? item.bgColor : '#f8f9fa',
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.3s',
              border: activeFilter === item.key ? `2px solid ${item.color}` : '2px solid transparent',
              boxShadow: activeFilter === item.key ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: item.color }}>
              {statusCounts[item.key]}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Order List */}
      <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '30px' }}>🔄 Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <h3>📭 No Orders Found</h3>
            <p>Use the "➕ New Order" button to create orders</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const deliveryInfo = getOrderDeliveryStatus(order.order_id);
            const returnProgress = getReturnProgress(order);
            
            return (
              <div 
                key={order.id || order.order_id} 
                style={{
                  background: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  marginBottom: '15px',
                  border: '1px solid #e0e0e0',
                  borderLeft: `4px solid ${
                    order.status === 'delivered' ? '#28a745' : 
                    order.status === 'pending' ? '#ffc107' : 
                    order.status === 'cancelled' ? '#dc3545' : '#6f42c1'
                  }`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}
              >
                {/* Order Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap', 
                  gap: '10px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <strong style={{ fontSize: '18px', color: '#333' }}>#{order.order_id}</strong>
                    <span style={{ marginLeft: '15px', color: '#666' }}>👤 {order.customer_name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontWeight: 'bold', color: '#007bff', fontSize: '18px' }}>
                      ₹{parseFloat(order.total_amount || 0).toLocaleString()}
                    </span>
                    <span style={{
                      padding: '5px 15px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      background:
  (order.return_reason || Number(order.credit_note_amount) > 0)
    ? '#e8daef'
    : order.status === 'delivered'
    ? '#d4edda'
    : order.status === 'pending'
    ? '#fff3cd'
    : order.status === 'cancelled'
    ? '#f8d7da'
    : '#e8daef',
                      color:
  (order.return_reason || Number(order.credit_note_amount) > 0)
    ? '#6f42c1'
    : order.status === 'delivered'
    ? '#155724'
    : order.status === 'pending'
    ? '#856404'
    : order.status === 'cancelled'
    ? '#721c24'
    : '#6f42c1'
                    }}>
                      {order.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Delivery Status */}
                <div style={{ 
                  marginBottom: '12px', 
                  padding: '8px 12px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '14px', color: '#666' }}>🚚 Delivery:</span>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: deliveryInfo.color + '15',
                    color: deliveryInfo.color,
                    border: `1px solid ${deliveryInfo.color}30`
                  }}>
                    {deliveryInfo.icon} {deliveryInfo.label}
                    {deliveryInfo.delivery?.driver_name && (
                      <span style={{ marginLeft: '8px', fontWeight: 'normal' }}>
                        - {deliveryInfo.delivery.driver_name}
                      </span>
                    )}
                  </span>
                </div>
                
                {/* Return Reason */}
                {order.return_reason && (
                  <div style={{ 
                    marginBottom: '12px', 
                    padding: '10px',
                    background: '#fff3cd',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#856404'
                  }}>
                    📝 <strong>Return Reason:</strong> {order.return_reason}
                    {order.credit_note_amount > 0 && (
                      <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                        | Credit: ₹{order.credit_note_amount}
                      </span>
                    )}
                  </div>
                )}

                {/* ✅ FIXED: Return Progress Tracker */}
                {returnProgress && (
                  <div style={{ 
                    marginTop: '15px', 
                    padding: '20px', 
                    background: '#f8f9fa', 
                    borderRadius: '10px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '15px', fontSize: '14px', color: '#333' }}>
                      📋 Return Progress - Step {returnProgress.currentStep + 1} of 4
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start',
                      position: 'relative' 
                    }}>
                      {returnProgress.steps.map((step, index) => (
                        <div key={index} style={{ 
                          textAlign: 'center', 
                          flex: 1, 
                          position: 'relative',
                          zIndex: 1
                        }}>
                          {/* Step Circle */}
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: step.complete ? '#28a745' : '#e0e0e0',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 8px',
                            fontWeight: 'bold',
                            fontSize: '16px',
                            boxShadow: step.complete ? '0 4px 12px rgba(40, 167, 69, 0.3)' : 'none',
                            transition: 'all 0.3s ease'
                          }}>
                            {step.complete ? '✓' : (index === returnProgress.currentStep ? '●' : index + 1)}
                          </div>
                          
                          {/* Step Label */}
                          <div style={{ 
                            fontSize: '11px', 
                            color: step.complete ? '#28a745' : '#666',
                            fontWeight: step.complete ? '600' : 'normal',
                            marginTop: '5px'
                          }}>
                            {step.label}
                          </div>
                          
                          {/* Status indicator for current step */}
                          {index === returnProgress.currentStep && (
                            <div style={{
                              marginTop: '5px',
                              padding: '2px 8px',
                              background: '#007bff',
                              color: 'white',
                              borderRadius: '10px',
                              fontSize: '10px',
                              display: 'inline-block'
                            }}>
                              CURRENT
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Connecting Lines */}
                      {[0, 1, 2].map((index) => (
                        <div key={`line-${index}`} style={{
                          position: 'absolute',
                          top: '20px',
                          left: `${(index * 33.33) + 16.67}%`,
                          width: '33.33%',
                          height: '3px',
                          background: returnProgress.currentStep > index ? '#28a745' : '#e0e0e0',
                          zIndex: 0,
                          transition: 'background 0.3s ease'
                        }} />
                      ))}
                    </div>
                    
                    {/* Progress percentage */}
                    <div style={{ 
                      marginTop: '20px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: '#666'
                    }}>
                      <div style={{
                        width: '100%',
                        height: '6px',
                        background: '#e0e0e0',
                        borderRadius: '3px',
                        overflow: 'hidden',
                        marginBottom: '5px'
                      }}>
                        <div style={{
                          width: `${((returnProgress.currentStep + 1) / 4) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #28a745, #20c997)',
                          borderRadius: '3px',
                          transition: 'width 0.5s ease'
                        }} />
                      </div>
                      {Math.round(((returnProgress.currentStep + 1) / 4) * 100)}% Complete
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {order.status === 'pending' && (
                    <button
                      onClick={() => handleCancel(order.order_id)}
                      style={{
                        padding: '8px 20px',
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '13px'
                      }}
                    >
                      ❌ Cancel Order
                    </button>
                  )}

                  {order.status === 'delivered' &&
 !order.return_reason &&
 Number(order.credit_note_amount) === 0 && (
                    <button
                      onClick={() => {
                        setSelectedOrder(order.order_id);
                        setReason('');
                        setCreditAmount('');
                      }}
                      style={{
                        padding: '8px 20px',
                        background: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '13px'
                      }}
                    >
                      ↩️ Process Return
                    </button>
                  )}
                  
                  {/* Show update pickup status button for returned orders */}
                  {order.status === 'returned' && deliveryInfo.delivery && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {deliveryInfo.status === 'return_pickup_pending' && (
                        <button
                          onClick={async () => {
                            try {
                              await axios.put(`/api/delivery/${deliveryInfo.delivery.id}/status`, {
                                status: 'in_transit'
                              });
                              if (refreshAllData) refreshAllData();
                            } catch (error) {
                              alert('Failed to update status');
                            }
                          }}
                          style={{
                            padding: '8px 20px',
                            background: '#007bff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}
                        >
                          🚀 Start Pickup
                        </button>
                      )}
                      {deliveryInfo.status === 'in_transit' && (
                        <button
                          onClick={async () => {
                            try {
                              await axios.put(`/api/delivery/${deliveryInfo.delivery.id}/status`, {
                                status: 'delivered'
                              });
                              if (refreshAllData) refreshAllData();
                            } catch (error) {
                              alert('Failed to update status');
                            }
                          }}
                          style={{
                            padding: '8px 20px',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '13px'
                          }}
                        >
                          ✅ Complete Pickup
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Return Modal */}
      {selectedOrder && (
        <>
          <div 
            onClick={() => {
              setSelectedOrder(null);
              setReason('');
              setCreditAmount('');
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999,
              backdropFilter: 'blur(2px)'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'white',
            padding: '30px',
            borderRadius: '15px',
            zIndex: 1000,
            minWidth: '450px',
            maxWidth: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>💰 Process Return for #{selectedOrder}</h3>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Return Reason *
              </label>
              <input
                placeholder="e.g., Damaged product, Wrong item, etc."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '2px solid #e0e0e0',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Credit Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter refund amount"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '2px solid #e0e0e0',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setSelectedOrder(null);
                  setReason('');
                  setCreditAmount('');
                }}
                style={{
                  padding: '12px 24px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReturn(selectedOrder)}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(40, 167, 69, 0.3)'
                }}
              >
                💳 Issue Credit Note
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default ReturnsHandler;