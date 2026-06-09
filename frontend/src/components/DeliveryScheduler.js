import React, { useState } from 'react';
import axios from 'axios';
import "./Styles.css";

const DeliveryScheduler = ({ deliveries, setDeliveries, orders, setOrders, drivers, refreshAllData }) => {
  const [formData, setFormData] = useState({
    order_id: '',
    customer_name: '',
    customer_phone: '',
    address: '',
    scheduled_time: '',
    driver_id: '',
    lat: 17.3850,
    lng: 78.4867,
    total_amount: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');

  const generateOrderId = () => {
    const count = orders.length + 1;
    return `ORD-${String(count).padStart(3, '0')}`;
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!formData.order_id || !formData.customer_name || !formData.address || !formData.scheduled_time) {
      setError('❌ Please fill all required fields: Order ID, Customer Name, Address, and Scheduled Time');
      setTimeout(() => setError(''), 5000);
      return;
    }

    if (formData.total_amount && parseFloat(formData.total_amount) <= 0) {
      setError('❌ Amount must be greater than 0');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const existingDelivery = deliveries.find(d => d.order_id === formData.order_id);
    if (existingDelivery) {
      setError('❌ Delivery already exists for this order');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setSubmitting(true);
    
    try {
      const existingOrder = orders.find(o => o.order_id === formData.order_id);
      
      if (!existingOrder && formData.total_amount) {
        try {
          await axios.post('/api/orders/create', {
            order_id: formData.order_id,
            customer_name: formData.customer_name,
            customer_phone: formData.customer_phone,
            total_amount: parseFloat(formData.total_amount),
            status: 'pending'
          });
        } catch (orderError) {
          console.error('Order creation error:', orderError.response?.data);
        }
      }

      const selectedDriver = drivers.find(d => d.driver_id === formData.driver_id);
      
      const deliveryData = {
        order_id: formData.order_id,
        customer_name: formData.customer_name,
        customer_phone: formData.customer_phone || '',
        address: formData.address,
        scheduled_time: formData.scheduled_time,
        driver_id: formData.driver_id || '',
        driver_name: selectedDriver ? selectedDriver.name : '',
        lat: formData.lat || 17.3850,
        lng: formData.lng || 78.4867
      };
      
      const res = await axios.post('/api/delivery/schedule', deliveryData);
      
      setDeliveries(prev => [res.data, ...prev]);
      setSuccessMsg(`✅ Delivery #${res.data.order_id} scheduled successfully!`);
      
      const nextOrderId = generateOrderId();
      
      setFormData({
        order_id: nextOrderId,
        customer_name: '',
        customer_phone: '',
        address: '',
        scheduled_time: '',
        driver_id: '',
        lat: 17.3850,
        lng: 78.4867,
        total_amount: ''
      });
      
      setTimeout(() => setSuccessMsg(''), 5000);
      
      if (refreshAllData) {
        await refreshAllData();
      }
      
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to schedule delivery';
      setSuccessMsg(`❌ ${errorMessage}`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (deliveryId, newStatus) => {
    try {
      await axios.put(`/api/delivery/${deliveryId}/status`, { 
        status: newStatus 
      });
      
      if (refreshAllData) {
        await refreshAllData();
      }
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Failed to update delivery status');
    }
  };

  const getAvailableActions = (status) => {
    switch(status) {
      case 'pending':
        return [
          { action: 'in_transit', label: '🚀 Start Delivery', color: '#007bff' },
          { action: 'cancelled', label: '❌ Cancel', color: '#dc3545' }
        ];
      case 'in_transit':
        return [
          { action: 'delivered', label: '✅ Mark Delivered', color: '#28a745' },
          { action: 'cancelled', label: '❌ Cancel', color: '#dc3545' }
        ];
      case 'return_pickup_pending':
        return [
          { action: 'in_transit', label: '🚀 Start Pickup', color: '#007bff' }
        ];
      default:
        return [];
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': '#ffc107',
      'in_transit': '#007bff',
      'delivered': '#28a745',
      'cancelled': '#dc3545',
      'return_pickup_pending': '#6f42c1'
    };
    return colors[status] || '#6c757d';
  };

  const activeDeliveries = deliveries.filter(d => 
    d.status === 'pending' || d.status === 'in_transit'
  );
  const displayDeliveries = showAll ? deliveries : activeDeliveries;

  return (
    <section className="delivery-scheduler">
      <h2>🚚 Delivery Scheduler</h2>
      
      <div className="scheduler-grid">
        <div className="form-section">
          <h3>📝 Schedule New Delivery</h3>
          
          {error && (
            <div style={{
              padding: '10px',
              background: '#f8d7da',
              color: '#721c24',
              borderRadius: '5px',
              marginBottom: '15px',
              fontWeight: 'bold'
            }}>
              {error}
            </div>
          )}
          
          {successMsg && (
            <div style={{
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              fontWeight: 'bold',
              background: successMsg.includes('✅') ? '#d4edda' : '#f8d7da',
              color: successMsg.includes('✅') ? '#155724' : '#721c24',
              border: `1px solid ${successMsg.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
            }}>
              {successMsg}
            </div>
          )}
          
          <form onSubmit={handleSchedule}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Order ID *</label>
              <select
  value={formData.order_id}
  onChange={(e) => {
    const selectedOrder = orders.find(
      o => o.order_id === e.target.value
    );

    if (selectedOrder) {
      setFormData({
        ...formData,
        order_id: selectedOrder.order_id,
        customer_name: selectedOrder.customer_name || '',
        customer_phone: selectedOrder.customer_phone || '',
        total_amount: selectedOrder.total_amount || ''
      });
    }
  }}
  required
  style={{
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ddd'
  }}
>
  <option value="">Select Existing Order</option>

  {orders.map(order => (
    <option
      key={order.order_id}
      value={order.order_id}
    >
      {order.order_id} - {order.customer_name} (₹{order.total_amount})
    </option>
  ))}
</select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Customer Name *</label>
              <input
  placeholder="Customer Name"
  value={formData.customer_name}
  readOnly
  onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
  required
  style={{
    width: '100%',
    padding: '10px',
    borderRadius: '5px',
    border: '1px solid #ddd',
    background: '#f5f5f5'
  }}
/>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Phone</label>
              <input 
                placeholder="Phone Number" 
                value={formData.customer_phone}
                readOnly
                onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Full Address *</label>
              <textarea 
                placeholder="Delivery Address" 
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                required
                rows="2"
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd', resize: 'vertical' }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Order Amount (₹) - Optional</label>
              <input 
                type="number"
                min="0"
                step="0.01"
                placeholder="Creates order if new" 
                value={formData.total_amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || parseFloat(val) >= 0) {
                    setFormData({...formData, total_amount: val});
                  }
                }}
                style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Scheduled Time *</label>
                <input 
                  type="datetime-local" 
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                  required 
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Assign Driver</label>
                <select
                  value={formData.driver_id}
                  onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
                >
                  <option value="">Select Driver</option>
                  {drivers.filter(d => d.status === 'available').map(driver => (
                    <option key={driver.driver_id} value={driver.driver_id}>
                      {driver.name} ({driver.vehicle_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={submitting}
              style={{
                width: '100%',
                padding: '14px',
                background: submitting ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? '⏳ Scheduling...' : '📦 Schedule Delivery'}
            </button>
          </form>
        </div>

        <div className="delivery-list-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              Active: <strong>{activeDeliveries.length}</strong> / Total: {deliveries.length}
            </div>
            <button 
              onClick={() => setShowAll(!showAll)}
              style={{
                padding: '8px 16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              {showAll ? '📋 Show Active' : '📋 Show All'}
            </button>
          </div>
          
          <h3>📋 Delivery List</h3>
          
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {displayDeliveries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                {showAll ? 'No deliveries yet' : 'No active deliveries'}
              </div>
            ) : (
              displayDeliveries.map(delivery => (
                <div 
                  key={delivery.id} 
                  style={{
                    background: 'white',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    border: '1px solid #e0e0e0',
                    borderLeft: `4px solid ${getStatusColor(delivery.status)}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ fontWeight: 'bold', color: '#667eea' }}>
                      #{delivery.order_id}
                    </div>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: '15px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      background: getStatusColor(delivery.status) + '20',
                      color: getStatusColor(delivery.status)
                    }}>
                      {(delivery.status || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
                    <div>👤 {delivery.customer_name}</div>
                    <div>🕐 {new Date(delivery.scheduled_time).toLocaleString()}</div>
                    {delivery.driver_name && <div>🚛 {delivery.driver_name}</div>}
                  </div>
                  
                  <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>
                    📍 {delivery.address}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {getAvailableActions(delivery.status).map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleStatusUpdate(delivery.id, action.action)}
                        style={{
                          padding: '5px 10px',
                          background: action.color,
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  
                  {orders.find(o => o.order_id === delivery.order_id) && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                      💰 Order: ₹{orders.find(o => o.order_id === delivery.order_id).total_amount}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeliveryScheduler;