import React, { useState } from 'react';
import axios from 'axios';
import "./Styles.css"; 

const DeliveryScheduler = ({ deliveries, setDeliveries }) => {
  const [formData, setFormData] = useState({
    order_id: '',
    customer_name: '',
    customer_phone: '',
    address: '',
    scheduled_time: '',
    driver_id: '',
    driver_name: '',
    lat: 17.3850,
    lng: 78.4867
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSchedule = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    
    try {
      console.log('📦 Sending:', formData); // DEBUG
      const res = await axios.post('/api/delivery/schedule', formData);
      console.log('✅ Response:', res.data);
      
      // Add to deliveries list
      setDeliveries(prev => [res.data, ...prev]);
      
      // SUCCESS FEEDBACK - VISIBLE!
      setSuccessMsg(`✅ Delivery #${res.data.order_id} scheduled!`);
      
      // Reset form
      setFormData({
        order_id: '', customer_name: '', customer_phone: '',
        address: '', scheduled_time: '', driver_id: '', driver_name: '', lat: 17.3850, lng: 78.4867
      });
      
      // Auto-clear success message
      setTimeout(() => setSuccessMsg(''), 5000);
      
    } catch (error) {
      console.error('❌ Error:', error.response?.data || error.message);
      setSuccessMsg(`❌ ${error.response?.data?.error || 'Failed to schedule'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="delivery-scheduler">
      <h2>🚚 Delivery Scheduler</h2>
      
      <div className="scheduler-grid">
        {/* FORM */}
        <div className="form-section">
          <h3>📝 New Delivery</h3>
          
          {/* ✅ SUCCESS/ERROR DISPLAY */}
          {successMsg && (
            <div className={`success-msg ${successMsg.includes('✅') ? 'success' : 'error'}`}>
              {successMsg}
            </div>
          )}
          
          <form className="delivery-form" onSubmit={handleSchedule}>
            <input 
              placeholder="Order ID " 
              value={formData.order_id}
              onChange={(e) => setFormData({...formData, order_id: e.target.value})}
              required 
            />
            <input 
              placeholder="Customer Name" 
              value={formData.customer_name}
              onChange={(e) => setFormData({...formData, customer_name: e.target.value})}
              required
            />
            <input 
              placeholder="Phone " 
              value={formData.customer_phone}
              onChange={(e) => setFormData({...formData, customer_phone: e.target.value})}
            />
            <input 
              placeholder="Full Address" 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              required
            />
            <div className="time-row">
              <input 
                type="datetime-local" 
                value={formData.scheduled_time}
                onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                required 
              />
              <input 
                placeholder="Driver ID" 
                value={formData.driver_id}
                onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
              />
            </div>
            <button type="submit" className="schedule-btn" disabled={submitting}>
              {submitting ? '⏳ Scheduling...' : '📦 Schedule Delivery'}
            </button>
          </form>
        </div>

        {/* DELIVERIES */}
        <div className="delivery-list-section">
          <div className="deliveries-count">
            Active: <strong>{deliveries.length}</strong>
          </div>
          <h3>📋 Live List</h3>
          <div className="deliveries-list">
            {deliveries.length === 0 ? (
              <div className="empty-state">
                No deliveries yet
              </div>
            ) : (
              deliveries.map(delivery => (
                <div key={delivery.id} className={`delivery-item ${delivery.status || 'pending'}`}>
                  <div className="delivery-header">
                    <div className="order-id">#{delivery.order_id}</div>
                    <span className={`delivery-status status-${delivery.status || 'pending'}`}>
                      {delivery.status || 'pending'}
                    </span>
                  </div>
                  
                  <div className="delivery-details">
                    <span>{delivery.customer_name}</span>
                    <span>{new Date(delivery.scheduled_time).toLocaleTimeString()}</span>
                  </div>
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
