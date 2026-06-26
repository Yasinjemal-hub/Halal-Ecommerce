import React, { useEffect, useState } from 'react';
import { FiCheckCircle, FiX, FiAlertCircle, FiUser, FiMail, FiPhone, FiClock } from 'react-icons/fi';
import adminService from '../../services/adminService';
import { toast } from 'react-hot-toast';
import './Dashboard.css';

const AdminProfileApprovals = () => {
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [reviewNotes, setReviewNotes] = useState({});

  useEffect(() => {
    loadPendingUpdates();
  }, []);

  const loadPendingUpdates = async () => {
    setLoading(true);
    try {
      const response = await adminService.getPendingProfileUpdates();
      const users = response.users || response;
      setPendingUpdates(users);
    } catch (error) {
      console.error('Error loading pending updates:', error);
      toast.error('Failed to load pending profile updates');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    setProcessing(userId);
    try {
      await adminService.approveUserProfileUpdate(userId, {
        action: 'approved',
        reviewNotes: reviewNotes[userId] || ''
      });
      setPendingUpdates(pendingUpdates.filter(u => u._id !== userId));
      toast.success('Profile update approved');
      setReviewNotes(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      console.error('Error approving update:', error);
      toast.error(error.response?.data?.message || 'Failed to approve update');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (userId) => {
    setProcessing(userId);
    try {
      await adminService.approveUserProfileUpdate(userId, {
        action: 'rejected',
        reviewNotes: reviewNotes[userId] || ''
      });
      setPendingUpdates(pendingUpdates.filter(u => u._id !== userId));
      toast.success('Profile update rejected');
      setReviewNotes(prev => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      console.error('Error rejecting update:', error);
      toast.error(error.response?.data?.message || 'Failed to reject update');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">Profile Update Approvals</h1>
          <p className="text-body">
            Review and approve pending profile updates from users.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f39c1215', color: '#f39c12' }}>
            <FiClock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{pendingUpdates.length}</span>
            <span className="stat-label">Pending Approvals</span>
          </div>
        </div>
      </div>

      {/* Pending Updates */}
      <div className="dashboard-section">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
            Loading pending updates...
          </div>
        ) : pendingUpdates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FiCheckCircle size={48} style={{ color: '#27ae60', marginBottom: '16px' }} />
            <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>All caught up!</h3>
            <p style={{ margin: 0, color: 'var(--text-tertiary)' }}>
              No pending profile updates to review.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {pendingUpdates.map(user => (
              <div key={user._id} style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                {/* User Header */}
                <div style={{
                  padding: '16px',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#fafafa'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px'
                  }}>
                    {user.avatar?.url ? (
                      <img src={user.avatar.url} alt={user.firstName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      user.firstName?.[0] || 'U'
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, marginBottom: '4px' }}>
                      {user.firstName} {user.lastName}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
                      <FiMail size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {user.email}
                    </p>
                  </div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    backgroundColor: user.role === 'merchant' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(52, 152, 219, 0.15)',
                    color: user.role === 'merchant' ? '#27ae60' : '#3498db'
                  }}>
                    {user.role}
                  </span>
                </div>

                {/* Changes */}
                <div style={{ padding: '16px' }}>
                  <h5 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FiAlertCircle size={16} /> Requested Changes
                  </h5>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                    {user.pendingProfileUpdate?.firstName && (
                      <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#999' }}>First Name</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#27ae60' }}>
                          → {user.pendingProfileUpdate.firstName}
                        </p>
                      </div>
                    )}
                    {user.pendingProfileUpdate?.lastName && (
                      <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#999' }}>Last Name</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#27ae60' }}>
                          → {user.pendingProfileUpdate.lastName}
                        </p>
                      </div>
                    )}
                    {user.pendingProfileUpdate?.email && (
                      <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#999' }}>Email</p>
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#27ae60' }}>
                          → {user.pendingProfileUpdate.email}
                        </p>
                      </div>
                    )}
                    {user.pendingProfileUpdate?.phone && (
                      <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                        <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#999' }}>Phone</p>
                        <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#27ae60' }}>
                          → {user.pendingProfileUpdate.phone}
                        </p>
                      </div>
                    )}
                  </div>

                  <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#999' }}>
                    Requested on {new Date(user.pendingProfileUpdate?.requestedAt).toLocaleString()}
                  </p>
                </div>

                {/* Review Notes */}
                <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600' }}>
                    Review Notes (optional)
                  </label>
                  <textarea
                    value={reviewNotes[user._id] || ''}
                    onChange={(e) => setReviewNotes(prev => ({ ...prev, [user._id]: e.target.value }))}
                    placeholder="Add notes about this decision..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '10px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Actions */}
                <div style={{
                  padding: '16px',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'flex-end',
                  backgroundColor: '#fafafa'
                }}>
                  <button
                    onClick={() => handleReject(user._id)}
                    disabled={processing === user._id}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #e74343',
                      backgroundColor: 'white',
                      color: '#e74343',
                      cursor: processing === user._id ? 'not-allowed' : 'pointer',
                      opacity: processing === user._id ? 0.5 : 1,
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => !processing && (e.currentTarget.style.backgroundColor = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'white')}
                  >
                    <FiX size={16} /> Reject
                  </button>
                  <button
                    onClick={() => handleApprove(user._id)}
                    disabled={processing === user._id}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#27ae60',
                      color: 'white',
                      cursor: processing === user._id ? 'not-allowed' : 'pointer',
                      opacity: processing === user._id ? 0.5 : 1,
                      fontSize: '14px',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => !processing && (e.currentTarget.style.backgroundColor = '#229954')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#27ae60')}
                  >
                    <FiCheckCircle size={16} /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProfileApprovals;
