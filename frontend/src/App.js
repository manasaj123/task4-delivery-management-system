import React, { useState } from "react";
import DeliveryScheduler from "./components/DeliveryScheduler";
import ReturnsHandler from "./components/ReturnsHandler";
import ComplaintManager from "./components/ComplaintManager";
import RevenueDashboard from "./components/RevenueDashboard";
import "./App.css";

export default function App() {
  const [deliveries, setDeliveries] = useState([]);
 const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]);

  return (
    <div className="app-container">
      <h1>📦 Delivery Order Management</h1>

      <DeliveryScheduler deliveries={deliveries} setDeliveries={setDeliveries} />
      <ComplaintManager complaints={complaints} setComplaints={setComplaints} />
       <ReturnsHandler orders={orders} setOrders={setOrders} deliveries={deliveries} setDeliveries={setDeliveries} />
      
      <RevenueDashboard />
    </div>
  );
}
