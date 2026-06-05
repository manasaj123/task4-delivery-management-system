import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Styles.css";

const ComplaintManager = ({ complaints, setComplaints, orders, deliveries, refreshAllData }) => {
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    order_id: "",
    subject: "",
    description: "",
    priority: "medium",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [managerReview, setManagerReview] = useState({
  resolution_type: '',
  manager_notes: '',
  customer_message: '',
  resolved_by: 'Manager'
});

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/complaints");
      setComplaints(res.data || []);
    } catch (err) {
      console.error("Fetch complaints failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg('');
    try {
      const linkedOrder = orders.find(o => o.order_id === formData.order_id);
      
      const complaintData = {
        customer_name: linkedOrder ? linkedOrder.customer_name : formData.customer_name,
        customer_phone: linkedOrder ? linkedOrder.customer_phone : formData.customer_phone,
        order_id: formData.order_id || null,
        subject: formData.subject,
        description: formData.description,
        priority: formData.priority
      };

      await axios.post("/api/complaints", complaintData);
      
      setFormData({
        customer_name: "",
        customer_phone: "",
        order_id: "",
        subject: "",
        description: "",
        priority: "medium",
      });
      
      setSuccessMsg('✅ Complaint registered successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchComplaints();
      if (refreshAllData) refreshAllData();
    } catch (err) {
      setSuccessMsg('❌ ' + (err.response?.data?.error || 'Failed to create complaint'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (id, level) => {
    try {
      const status = level === 1 ? 'assigned' : 'in_progress';
      const assigned_to = level === 1 ? 'team_lead' : 'manager';
      
      await axios.put(`/api/complaints/${id}/escalate`, {
        escalation_level: level,
        assigned_to: assigned_to,
        status: status
      });
      
      fetchComplaints();
      if (refreshAllData) refreshAllData();
    } catch (err) {
      console.error("Escalation failed", err);
      alert('Failed to update complaint');
    }
  };

 const handleResolve = async (id) => {
  try {
    await axios.put(`/api/complaints/${id}/resolve`, {
      resolution_type: managerReview.resolution_type,
      manager_notes: managerReview.manager_notes,
      customer_message: managerReview.customer_message,
      resolved_by: managerReview.resolved_by
    });

    setManagerReview({
      resolution_type: '',
      manager_notes: '',
      customer_message: '',
      resolved_by: 'Manager'
    });

    fetchComplaints();

    if (refreshAllData) {
      refreshAllData();
    }

  } catch (err) {
    console.error("Resolution failed", err);
    alert("Failed to resolve complaint");
  }
};

  const handleClose = async (id) => {
    try {
      await axios.put(`/api/complaints/${id}/close`);
      fetchComplaints();
      if (refreshAllData) refreshAllData();
    } catch (err) {
      console.error("Close failed", err);
      alert('Failed to close complaint');
    }
  };

  const getLinkedOrder = (orderId) => {
    return orders?.find(o => o.order_id === orderId);
  };

  const getLinkedDelivery = (orderId) => {
    return deliveries?.find(d => d.order_id === orderId);
  };

  const getStatusColor = (status) => {
    const colors = {
      'new': '#007bff',
      'assigned': '#17a2b8',
      'in_progress': '#ffc107',
      'resolved': '#28a745',
      'closed': '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  const getComplaintActions = (complaint) => {
    const actions = [];
    
    switch(complaint.status) {
      case 'new':
        actions.push({
          action: () => handleEscalate(complaint.id, 1),
          label: '👤 Assign to Team',
          color: '#17a2b8'
        });
        break;
        
      case 'assigned':
        actions.push({
          action: () => handleEscalate(complaint.id, 2),
          label: '⬆️ Escalate to Manager',
          color: '#ffc107'
        });
        actions.push({
          action: () => handleResolve(complaint.id),
          label: '✅ Resolve',
          color: '#28a745'
        });
        break;
        
      case 'in_progress':
        actions.push({
          action: () => handleResolve(complaint.id),
          label: '✅ Mark Resolved',
          color: '#28a745'
        });
        actions.push({
          action: () => handleClose(complaint.id),
          label: '🔒 Close',
          color: '#6c757d'
        });
        break;
        
      case 'resolved':
        actions.push({
          action: () => handleClose(complaint.id),
          label: '🔒 Close Complaint',
          color: '#6c757d'
        });
        break;
    }
    
    return actions;
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.order_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <section className="complaint-manager">
      <h2>📞 Complaints Manager</h2>

      <div className="manager-grid">
        <div className="complaint-form-section">
          <h3>📝 New Complaint</h3>
          
          {successMsg && (
            <div style={{
              padding: '10px',
              borderRadius: '5px',
              marginBottom: '15px',
              fontWeight: 'bold',
              background: successMsg.includes('✅') ? '#d4edda' : '#f8d7da',
              color: successMsg.includes('✅') ? '#155724' : '#721c24'
            }}>
              {successMsg}
            </div>
          )}
          
          <form onSubmit={handleSubmitComplaint}>
            <select
              value={formData.order_id}
              onChange={(e) => {
                const orderId = e.target.value;
                const linkedOrder = orders.find(o => o.order_id === orderId);
                setFormData({
                  ...formData,
                  order_id: orderId,
                  customer_name: linkedOrder ? linkedOrder.customer_name : '',
                  customer_phone: linkedOrder ? linkedOrder.customer_phone : ''
                });
              }}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            >
              <option value="">Select Order (Auto-fills customer info)</option>
              {orders?.map(order => (
                <option key={order.order_id} value={order.order_id}>
                  #{order.order_id} - {order.customer_name} (₹{order.total_amount})
                </option>
              ))}
            </select>
            
            <input
              placeholder="Customer Name *"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              required
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            />
            
            <input
              placeholder="Phone"
              value={formData.customer_phone}
              onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            />
            
            <input
              placeholder="Subject *"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            />
            
            <textarea
              placeholder="Description *"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows="3"
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd', resize: 'vertical' }}
            />
            
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '5px', border: '1px solid #ddd' }}
            >
              <option value="low">Low Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="high">High Priority</option>
            </select>
            
            <button 
              disabled={submitting}
              style={{ 
                width: '100%',
                padding: '12px',
                background: submitting ? '#6c757d' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '16px'
              }}
            >
              {submitting ? "⏳ Creating..." : "🚨 Register Complaint"}
            </button>
          </form>
        </div>

        <div className="complaint-list-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0 }}>📋 Complaints ({filteredComplaints.length})</h3>
            
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px',
                  width: '150px'
                }}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '5px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', padding: '20px' }}>Loading complaints...</p>
            ) : filteredComplaints.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#666' }}>
                <p>📭 No complaints found</p>
              </div>
            ) : (
              filteredComplaints.map((c) => {
                const linkedOrder = getLinkedOrder(c.order_id);
                const linkedDelivery = getLinkedDelivery(c.order_id);
                
                return (
                  <div
                    key={c.id}
                    style={{
                      background: 'white',
                      padding: '15px',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      border: '1px solid #e0e0e0',
                      borderLeft: `4px solid ${
                        c.priority === 'high' ? '#dc3545' : 
                        c.priority === 'medium' ? '#ffc107' : '#28a745'
                      }`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <strong>{c.subject || 'No Subject'}</strong>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        background: getStatusColor(c.status),
                        color: 'white'
                      }}>
                        {(c.status || 'new').replace('_', ' ')}
                      </span>
                    </div>
                    
                    <p style={{ margin: '5px 0' }}>
                      👤 <strong>{c.customer_name}</strong>
                      {c.customer_phone && <span style={{ marginLeft: '10px', color: '#666' }}>📱 {c.customer_phone}</span>}
                    </p>
                    
                    {c.order_id && linkedOrder && (
                      <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        📦 Order: <strong>#{c.order_id}</strong>
                        <span style={{ marginLeft: '8px' }}>₹{linkedOrder.total_amount}</span>
                        <span style={{ 
                          marginLeft: '8px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          background: linkedOrder.status === 'delivered' ? '#d4edda' : '#fff3cd',
                          color: linkedOrder.status === 'delivered' ? '#155724' : '#856404'
                        }}>
                          {linkedOrder.status}
                        </span>
                      </p>
                    )}
                    
                    {linkedDelivery && (
                      <p style={{ margin: '5px 0', fontSize: '14px' }}>
                        🚚 Delivery: <strong>{(linkedDelivery.status || '').replace('_', ' ')}</strong>
                        {linkedDelivery.driver_name && (
                          <span style={{ marginLeft: '8px', color: '#007bff' }}>
                            Driver: {linkedDelivery.driver_name}
                          </span>
                        )}
                      </p>
                    )}
                    
                    <p style={{ margin: '8px 0', color: '#555', fontStyle: 'italic' }}>
                      📝 "{c.description}"
                    </p>
                    
                    <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {getComplaintActions(c).map((action, index) => (
                        <button
                          key={index}
                          onClick={action.action}
                          style={{
                            padding: '8px 16px',
                            background: action.color,
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                    
                    {c.status === 'in_progress' && (
  <div
    style={{
      marginTop: '15px',
      padding: '12px',
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #ddd'
    }}
  >
    <h4>👨‍💼 Manager Resolution Panel</h4>

    <select
      onChange={(e) =>
        setManagerReview({
          ...managerReview,
          resolution_type: e.target.value
        })
      }
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '8px'
      }}
    >
      <option value="">Select Resolution</option>
      <option value="refund">💰 Refund Processed</option>
      <option value="reschedule">📅 Order Rescheduled</option>
      <option value="replacement">🔄 Replacement Sent</option>
      <option value="priority_delivery">🚚 Priority Delivery</option>
    </select>

    <textarea
      placeholder="Manager Notes"
      onChange={(e) =>
        setManagerReview({
          ...managerReview,
          manager_notes: e.target.value
        })
      }
      style={{
        width: '100%',
        marginBottom: '8px'
      }}
    />

    <textarea
      placeholder="Message to Customer"
      onChange={(e) =>
        setManagerReview({
          ...managerReview,
          customer_message: e.target.value
        })
      }
      style={{
        width: '100%',
        marginBottom: '8px'
      }}
    />

    <button
      onClick={() => handleResolve(c.id)}
      style={{
        background: '#28a745',
        color: '#fff',
        border: 'none',
        padding: '10px 15px',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      ✅ Manager Resolve Complaint
    </button>
  </div>
)}
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#999' }}>
                      ID: {c.id} | Created: {new Date(c.created_at).toLocaleString()}
                      {c.assigned_to && <span> | Assigned to: {c.assigned_to}</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ComplaintManager;