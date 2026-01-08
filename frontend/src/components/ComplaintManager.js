import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Styles.css";  

const ComplaintManager = () => {
  const [complaints, setComplaints] = useState([]);
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
    try {
      await axios.post("/api/complaints", formData);
      setFormData({
        complaint_id: "",
        customer_name: "",
        customer_phone: "",
        order_id: "",
        subject: "",
        description: "",
        priority: "medium",
      });
      fetchComplaints();
    } catch (err) {
      alert("Failed to create complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalate = async (id) => {
    try {
      await axios.put(`/api/complaints/${id}/escalate`, {
        escalation_level: 2,
        assigned_to: "manager",
      });
      fetchComplaints();
    } catch (err) {
      console.error("Escalation failed", err);
    }
  };

  return (
    <section className="complaint-manager">
      <h2>📞 Complaints Manager</h2>

      <div className="manager-grid">
        <div className="complaint-form-section">
          <h3>📝 New Complaint</h3>
          <form onSubmit={handleSubmitComplaint}>
            
            <input
              placeholder="Customer Name"
              value={formData.customer_name}
              onChange={(e) =>
                setFormData({ ...formData, customer_name: e.target.value })
              }
              required
            />
            <input
              placeholder="Phone"
              value={formData.customer_phone}
              onChange={(e) =>
                setFormData({ ...formData, customer_phone: e.target.value })
              }
            />
            <input
              placeholder="Order ID"
              value={formData.order_id}
              onChange={(e) =>
                setFormData({ ...formData, order_id: e.target.value })
              }
            />
            <input
              placeholder="Subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              required
            />
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
            />
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button className="submit-btn" disabled={submitting}>
              {submitting ? "⏳ Creating..." : "🚨 Add Complaint"}
            </button>
          </form>
        </div>

        <div className="complaint-list-section">
          <h3>📋 Complaints</h3>
          {loading ? (
            <p>Loading...</p>
          ) : complaints.length === 0 ? (
            <p>No complaints</p>
          ) : (
            complaints.map((c) => (
              <div
                key={c.id}
                className={`complaint-item priority-${c.priority || "medium"}`}
              >
                <strong>{c.subject}</strong>
                <p>{c.customer_name}</p>
                <span className="status-badge">{c.status || "new"}</span>
                {c.status === "new" && (
                  <button
                    className="escalate-btn"
                    onClick={() => handleEscalate(c.id)}
                  >
                    Escalate
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default ComplaintManager;
