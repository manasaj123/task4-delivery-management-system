import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import DeliveryScheduler from "./components/DeliveryScheduler";
import ReturnsHandler from "./components/ReturnsHandler";
import ComplaintManager from "./components/ComplaintManager";
import RevenueDashboard from "./components/RevenueDashboard";
import DriverManagement from "./components/DriverManagement";
import "./App.css";

export default function App() {
  const [deliveries, setDeliveries] = useState([]);
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchDeliveries(),
      fetchOrders(),
      fetchComplaints(),
      fetchDrivers()
    ]);
    setLoading(false);
  };

  const fetchDeliveries = async () => {
    try {
      const res = await axios.get('/api/delivery');
      setDeliveries(res.data || []);
    } catch (error) {
      console.error('Fetch deliveries failed:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get('/api/orders');
      setOrders(res.data || []);
    } catch (error) {
      console.error('Fetch orders failed:', error);
    }
  };

  const fetchComplaints = async () => {
    try {
      const res = await axios.get('/api/complaints');
      setComplaints(res.data || []);
    } catch (error) {
      console.error('Fetch complaints failed:', error);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await axios.get('/api/drivers');
      setDrivers(res.data || []);
    } catch (error) {
      console.error('Fetch drivers failed:', error);
    }
  };

  const refreshAllData = useCallback(() => {
    fetchAllData();
  }, []);

  // Calculate stats for overview cards
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const activeDeliveries = deliveries.filter(d => 
    d.status === 'pending' || d.status === 'in_transit'
  );
  const activeComplaints = complaints.filter(c => 
    c.status === 'new' || c.status === 'assigned' || c.status === 'in_progress'
  );
  const totalRevenue = deliveredOrders.reduce((sum, o) => 
    sum + (parseFloat(o.total_amount) || 0), 0
  );

  return (
    <div className="app-container">
      <h1>📦 Delivery Order Management System</h1>
      
      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="overview-card">
          <h3>📦 Orders</h3>
          <div className="overview-number">{orders.length}</div>
          <small>{deliveredOrders.length} delivered</small>
        </div>
        <div className="overview-card">
          <h3>🚚 Active Deliveries</h3>
          <div className="overview-number">{activeDeliveries.length}</div>
          <small>Out of {deliveries.length} Total</small>
        </div>
        <div className="overview-card">
          <h3>📞 Active Complaints</h3>
          <div className="overview-number">{activeComplaints.length}</div>
          <small>Out of {complaints.length} Total</small>
        </div>
        <div className="overview-card">
          <h3>💰 Revenue</h3>
          <div className="overview-number">
            ₹{totalRevenue.toLocaleString()}
          </div>
          <small>From delivered orders</small>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          📋 All
        </button>
        <button 
          className={`nav-tab ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          📦 Orders
        </button>
        <button 
          className={`nav-tab ${activeTab === 'delivery' ? 'active' : ''}`}
          onClick={() => setActiveTab('delivery')}
        >
          🚚 Delivery
        </button>
        
        <button 
          className={`nav-tab ${activeTab === 'complaints' ? 'active' : ''}`}
          onClick={() => setActiveTab('complaints')}
        >
          📞 Complaints
        </button>
        <button 
          className={`nav-tab ${activeTab === 'drivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          👨‍✈️ Drivers
        </button>
        <button 
          className={`nav-tab ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          💰 Revenue
        </button>
      </div>

      {/* Conditional Rendering based on active tab */}

      {(activeTab === 'all' || activeTab === 'orders') && (
        <ReturnsHandler 
          orders={orders} 
          setOrders={setOrders}
          deliveries={deliveries}
          setDeliveries={setDeliveries}
          refreshAllData={refreshAllData}
        />
      )}
      {(activeTab === 'all' || activeTab === 'delivery') && (
        <DeliveryScheduler 
          deliveries={deliveries} 
          setDeliveries={setDeliveries}
          orders={orders}
          setOrders={setOrders}
          drivers={drivers}
          refreshAllData={refreshAllData}
        />
      )}
      
      
      
      {(activeTab === 'all' || activeTab === 'complaints') && (
        <ComplaintManager 
          complaints={complaints} 
          setComplaints={setComplaints}
          orders={orders}
          deliveries={deliveries}
          refreshAllData={refreshAllData}
        />
      )}
      
      {(activeTab === 'all' || activeTab === 'drivers') && (
        <DriverManagement 
          drivers={drivers}
          setDrivers={setDrivers}
          deliveries={deliveries}
          refreshAllData={refreshAllData}
        />
      )}
      
      {(activeTab === 'all' || activeTab === 'revenue') && (
        <RevenueDashboard 
          orders={orders}
          deliveries={deliveries}
          complaints={complaints}
        />
      )}
    </div>
  );
}