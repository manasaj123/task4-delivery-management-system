import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DriverManagement = ({ drivers, setDrivers, deliveries, refreshAllData }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    driver_id: '',
    name: '',
    phone: '',
    vehicle_number: '',
    vehicle_type: 'Bike'
  });
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [editingDriver, setEditingDriver] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/drivers');
      setDrivers(res.data || []);
    } catch (error) {
      console.error('Fetch drivers failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDriverId = () => {
    const count = drivers.length + 1;
    return `DRV-${String(count).padStart(3, '0')}`;
  };

  const handleAddDriver = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    
    // Validation
    if (!formData.driver_id || !formData.name) {
      setSuccessMsg('❌ Driver ID and Name are required');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    // Check for duplicate Driver ID
    const duplicateId = drivers.find(d => d.driver_id === formData.driver_id);
    if (duplicateId && !editingDriver) {
      setSuccessMsg('❌ Driver ID already exists. Please use a unique ID.');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }

    // Check for duplicate Phone
    if (formData.phone) {
      const duplicatePhone = drivers.find(d => 
        d.phone === formData.phone && d.driver_id !== formData.driver_id
      );
      if (duplicatePhone) {
        setSuccessMsg('❌ Phone number already registered to another driver.');
        setTimeout(() => setSuccessMsg(''), 3000);
        return;
      }
    }

    // Check for duplicate Vehicle Number
    if (formData.vehicle_number) {
      const duplicateVehicle = drivers.find(d => 
        d.vehicle_number === formData.vehicle_number && d.driver_id !== formData.driver_id
      );
      if (duplicateVehicle) {
        setSuccessMsg('❌ Vehicle number already assigned to another driver.');
        setTimeout(() => setSuccessMsg(''), 3000);
        return;
      }
    }

    // Check for duplicate Name (warning only)
    if (!editingDriver) {
      const duplicateName = drivers.find(d => 
        d.name.toLowerCase() === formData.name.toLowerCase()
      );
      if (duplicateName) {
        const confirmAdd = window.confirm(
          `⚠️ A driver named "${formData.name}" already exists (ID: ${duplicateName.driver_id}).\n\nDo you still want to add this driver?`
        );
        if (!confirmAdd) return;
      }
    }

    try {
      if (editingDriver) {
        await axios.put(`/api/drivers/${formData.driver_id}`, formData);
        setSuccessMsg('✅ Driver updated successfully!');
      } else {
        await axios.post('/api/drivers', formData);
        setSuccessMsg('✅ Driver added successfully!');
      }
      
      setFormData({
        driver_id: generateDriverId(),
        name: '',
        phone: '',
        vehicle_number: '',
        vehicle_type: 'Bike'
      });
      setShowForm(false);
      setEditingDriver(null);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchDrivers();
      if (refreshAllData) refreshAllData();
    } catch (error) {
      setSuccessMsg(`❌ ${error.response?.data?.error || 'Failed to save driver'}`);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const handleEdit = (driver) => {
    setFormData({
      driver_id: driver.driver_id,
      name: driver.name,
      phone: driver.phone || '',
      vehicle_number: driver.vehicle_number || '',
      vehicle_type: driver.vehicle_type || 'Bike'
    });
    setEditingDriver(driver);
    setShowForm(true);
  };

  const handleStatusUpdate = async (driverId, newStatus) => {
    try {
      await axios.put(`/api/drivers/${driverId}/status`, { status: newStatus });
      fetchDrivers();
      if (refreshAllData) refreshAllData();
    } catch (error) {
      console.error('Status update failed:', error);
      alert('Failed to update driver status');
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (window.confirm(`Are you sure you want to delete driver ${driverId}?`)) {
      try {
        await axios.delete(`/api/drivers/${driverId}`);
        setSuccessMsg('✅ Driver deleted successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
        fetchDrivers();
        if (refreshAllData) refreshAllData();
      } catch (error) {
        setSuccessMsg(`❌ ${error.response?.data?.error || 'Failed to delete driver'}`);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    }
  };

  const getDriverDeliveryCount = (driverId) => {
    return deliveries.filter(d => d.driver_id === driverId).length;
  };

  const getDriverActiveDeliveries = (driverId) => {
    return deliveries.filter(d => 
      d.driver_id === driverId && 
      (d.status === 'pending' || d.status === 'in_transit')
    ).length;
  };

  const getDriverCompletedDeliveries = (driverId) => {
    return deliveries.filter(d => 
      d.driver_id === driverId && d.status === 'delivered'
    ).length;
  };

  // Filter drivers
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = searchTerm === '' || 
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.driver_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (driver.phone && driver.phone.includes(searchTerm)) ||
      (driver.vehicle_number && driver.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalDrivers = drivers.length;
  const availableDrivers = drivers.filter(d => d.status === 'available').length;
  const busyDrivers = drivers.filter(d => d.status === 'busy').length;
  const offlineDrivers = drivers.filter(d => d.status === 'offline').length;

  const getStatusIcon = (status) => {
    switch(status) {
      case 'available': return '🟢';
      case 'busy': return '🟡';
      case 'offline': return '⚫';
      default: return '⚪';
    }
  };

  const getVehicleIcon = (type) => {
    switch(type) {
      case 'Bike': return '🏍️';
      case 'Van': return '🚐';
      case 'Truck': return '🚛';
      case 'Car': return '🚗';
      default: return '🚛';
    }
  };

  return (
    <section className="driver-management">
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '25px', 
        flexWrap: 'wrap', 
        gap: '15px' 
      }}>
        <h2 style={{ margin: 0, fontSize: '1.8em' }}>
          👨‍✈️ Driver Management
        </h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              setEditingDriver(null);
              setFormData({
                driver_id: generateDriverId(),
                name: '',
                phone: '',
                vehicle_number: '',
                vehicle_type: 'Bike'
              });
            }
          }}
          style={{
            padding: '14px 28px',
            background: showForm ? '#dc3545' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '15px',
            boxShadow: showForm ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
            transition: 'all 0.3s ease'
          }}
        >
          {showForm ? '✕ Close Form' : '➕ Add New Driver'}
        </button>
      </div>

      {/* Success/Error Message */}
      {successMsg && (
        <div style={{
          padding: '14px 20px',
          borderRadius: '10px',
          marginBottom: '20px',
          fontWeight: '600',
          textAlign: 'center',
          fontSize: '15px',
          background: successMsg.includes('✅') ? '#d4edda' : '#f8d7da',
          color: successMsg.includes('✅') ? '#155724' : '#721c24',
          border: `2px solid ${successMsg.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`,
          animation: 'slideDown 0.3s ease'
        }}>
          {successMsg}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '30px',
          borderRadius: '16px',
          marginBottom: '25px',
          boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)'
        }}>
          <h3 style={{ color: 'white', marginTop: 0, marginBottom: '20px', fontSize: '1.3em' }}>
            {editingDriver ? '✏️ Edit Driver Details' : '📝 Register New Driver'}
          </h3>
          <form onSubmit={handleAddDriver}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  Driver ID *
                </label>
                <input
                  placeholder="e.g., DRV-001"
                  value={formData.driver_id}
                  onChange={(e) => setFormData({...formData, driver_id: e.target.value})}
                  required
                  disabled={editingDriver}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '10px', 
                    border: '2px solid rgba(255,255,255,0.2)',
                    background: editingDriver ? 'rgba(255,255,255,0.5)' : 'white',
                    fontSize: '15px',
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  Driver Name *
                </label>
                <input
                  placeholder="Full Name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '10px', 
                    border: '2px solid rgba(255,255,255,0.2)',
                    fontSize: '15px'
                  }}
                />
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  📱 Phone Number
                </label>
                <input
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '10px', 
                    border: '2px solid rgba(255,255,255,0.2)',
                    fontSize: '15px'
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  🚛 Vehicle Number
                </label>
                <input
                  placeholder="MH01AB1234"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({...formData, vehicle_number: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '10px', 
                    border: '2px solid rgba(255,255,255,0.2)',
                    fontSize: '15px'
                  }}
                />
              </div>
              <div>
                <label style={{ color: 'rgba(255,255,255,0.9)', display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>
                  🚗 Vehicle Type
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                  style={{ 
                    width: '100%', 
                    padding: '14px', 
                    borderRadius: '10px', 
                    border: '2px solid rgba(255,255,255,0.2)',
                    fontSize: '15px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Bike">🏍️ Bike</option>
                  <option value="Van">🚐 Van</option>
                  <option value="Truck">🚛 Truck</option>
                  <option value="Car">🚗 Car</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '16px',
                  background: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
              >
                {editingDriver ? '✅ Update Driver' : '✅ Register Driver'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDriver(null);
                }}
                style={{
                  padding: '16px 30px',
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '16px',
                  transition: 'all 0.3s ease'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '25px'
      }}>
        <div style={{ 
          padding: '25px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          borderRadius: '16px', 
          color: 'white', 
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '5px' }}>{totalDrivers}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Drivers</div>
        </div>
        <div style={{ 
          padding: '25px', 
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', 
          borderRadius: '16px', 
          color: 'white', 
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(67, 233, 123, 0.3)'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '5px' }}>{availableDrivers}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Available</div>
        </div>
        <div style={{ 
          padding: '25px', 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', 
          borderRadius: '16px', 
          color: 'white', 
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(240, 147, 251, 0.3)'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '5px' }}>{busyDrivers}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Busy</div>
        </div>
        <div style={{ 
          padding: '25px', 
          background: 'linear-gradient(135deg, #a8a8a8 0%, #6c757d 100%)', 
          borderRadius: '16px', 
          color: 'white', 
          textAlign: 'center',
          boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)'
        }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '5px' }}>{offlineDrivers}</div>
          <div style={{ fontSize: '14px', opacity: 0.9 }}>Offline</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div style={{
        display: 'flex',
        gap: '15px',
        marginBottom: '25px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name, ID, phone, or vehicle number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '14px 14px 14px 45px',
              borderRadius: '12px',
              border: '2px solid #e0e0e0',
              fontSize: '15px',
              transition: 'all 0.3s ease'
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '14px 20px',
            borderRadius: '12px',
            border: '2px solid #e0e0e0',
            fontSize: '15px',
            cursor: 'pointer',
            minWidth: '150px',
            background: 'white'
          }}
        >
          <option value="all">All Status</option>
          <option value="available">🟢 Available</option>
          <option value="busy">🟡 Busy</option>
          <option value="offline">⚫ Offline</option>
        </select>
      </div>

      {/* Drivers Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
        gap: '20px' 
      }}>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px', 
            gridColumn: '1/-1',
            color: '#666',
            fontSize: '18px'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '15px' }}>🔄</div>
            Loading drivers...
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px', 
            gridColumn: '1/-1', 
            color: '#666',
            background: '#f8f9fa',
            borderRadius: '16px'
          }}>
            <div style={{ fontSize: '50px', marginBottom: '15px' }}>📭</div>
            <h3 style={{ color: '#333', marginBottom: '10px' }}>No Drivers Found</h3>
            <p style={{ color: '#888' }}>
              {searchTerm ? 'Try different search terms' : 'Click "➕ Add New Driver" to register drivers'}
            </p>
          </div>
        ) : (
          filteredDrivers.map(driver => {
            const totalDeliveries = getDriverDeliveryCount(driver.driver_id);
            const activeDeliveries = getDriverActiveDeliveries(driver.driver_id);
            const completedDeliveries = getDriverCompletedDeliveries(driver.driver_id);
            
            return (
              <div
                key={driver.id}
                style={{
                  background: 'white',
                  padding: '25px',
                  borderRadius: '16px',
                  border: '1px solid #e8ecf1',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
                }}
              >
                {/* Status Indicator Line */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: 
                    driver.status === 'available' ? 'linear-gradient(90deg, #43e97b, #38f9d7)' :
                    driver.status === 'busy' ? 'linear-gradient(90deg, #ffc107, #ff9800)' :
                    'linear-gradient(90deg, #6c757d, #495057)'
                }} />

                {/* Driver Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start', 
                  marginBottom: '20px',
                  marginTop: '10px'
                }}>
                  <div>
                    <h3 style={{ margin: '0 0 5px 0', fontSize: '1.2em', color: '#1a1a2e' }}>
                      {getStatusIcon(driver.status)} {driver.name}
                    </h3>
                    <span style={{ 
                      fontSize: '13px', 
                      color: '#667eea', 
                      fontWeight: '600',
                      background: '#f0f0ff',
                      padding: '3px 10px',
                      borderRadius: '6px'
                    }}>
                      {driver.driver_id}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleEdit(driver)}
                      style={{
                        padding: '8px 14px',
                        background: '#e3f2fd',
                        color: '#1976d2',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                      title="Edit Driver"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteDriver(driver.driver_id)}
                      style={{
                        padding: '8px 14px',
                        background: '#ffebee',
                        color: '#c62828',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                      title="Delete Driver"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Driver Info */}
                <div style={{ 
                  marginBottom: '20px',
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '10px'
                }}>
                  {driver.phone && (
                    <div style={{ marginBottom: '8px', fontSize: '14px', color: '#555' }}>
                      <strong>📱 Phone:</strong> {driver.phone}
                    </div>
                  )}
                  {driver.vehicle_number && (
                    <div style={{ marginBottom: '8px', fontSize: '14px', color: '#555' }}>
                      <strong>🚛 Vehicle:</strong> {driver.vehicle_number}
                    </div>
                  )}
                  {driver.vehicle_type && (
                    <div style={{ fontSize: '14px', color: '#555' }}>
                      <strong>🚗 Type:</strong> {getVehicleIcon(driver.vehicle_type)} {driver.vehicle_type}
                    </div>
                  )}
                </div>

                {/* Delivery Stats */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  <div style={{ 
                    textAlign: 'center',
                    padding: '10px',
                    background: '#e3f2fd',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1976d2' }}>{totalDeliveries}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Total</div>
                  </div>
                  <div style={{ 
                    textAlign: 'center',
                    padding: '10px',
                    background: '#fff3e0',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f57c00' }}>{activeDeliveries}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Active</div>
                  </div>
                  <div style={{ 
                    textAlign: 'center',
                    padding: '10px',
                    background: '#e8f5e9',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#388e3c' }}>{completedDeliveries}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Completed</div>
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ 
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  <span style={{
                    padding: '8px 20px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background:
                      driver.status === 'available' ? '#d4edda' :
                      driver.status === 'busy' ? '#fff3cd' : '#e2e3e5',
                    color:
                      driver.status === 'available' ? '#155724' :
                      driver.status === 'busy' ? '#856404' : '#383d41'
                  }}>
                    {getStatusIcon(driver.status)} {driver.status}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  flexWrap: 'wrap',
                  borderTop: '1px solid #e0e0e0',
                  paddingTop: '15px'
                }}>
                  <button
                    onClick={() => handleStatusUpdate(driver.driver_id, 'available')}
                    disabled={driver.status === 'available'}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: driver.status === 'available' ? '#e0e0e0' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: driver.status === 'available' ? 'default' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      opacity: driver.status === 'available' ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🟢 Available
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(driver.driver_id, 'busy')}
                    disabled={driver.status === 'busy'}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: driver.status === 'busy' ? '#e0e0e0' : '#ffc107',
                      color: driver.status === 'busy' ? '#999' : '#000',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: driver.status === 'busy' ? 'default' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      opacity: driver.status === 'busy' ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    🟡 Busy
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(driver.driver_id, 'offline')}
                    disabled={driver.status === 'offline'}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: driver.status === 'offline' ? '#e0e0e0' : '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: driver.status === 'offline' ? 'default' : 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      opacity: driver.status === 'offline' ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ⚫ Offline
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
};

export default DriverManagement;