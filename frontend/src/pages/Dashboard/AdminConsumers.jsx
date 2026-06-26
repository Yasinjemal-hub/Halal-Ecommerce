import React, { useEffect, useState } from 'react';
import { FiSearch, FiAlertCircle, FiCheckCircle, FiPower, FiMail, FiPhone, FiCalendar, FiDownload, FiUsers, FiClock, FiUser, FiX } from 'react-icons/fi';
import adminService from '../../services/adminService';
import { toast } from 'react-hot-toast';
import './Dashboard.css';

const AdminConsumers = () => {
  const [consumers, setConsumers] = useState([]);
  const [totalConsumers, setTotalConsumers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [toggling, setToggling] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadConsumers();
  }, []);

  const loadConsumers = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllUsers({ role: 'consumer', limit: 1000, page: 1 });
      const consumerUsers = response.users || response;
      setConsumers(consumerUsers);
      setTotalConsumers(response.total ?? consumerUsers.length);
    } catch (error) {
      console.error('Error loading consumers:', error);
      toast.error('Failed to load consumers');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (consumerId, currentStatus) => {
    setToggling(consumerId);
    try {
      await adminService.toggleUserStatus(consumerId);
      setConsumers(consumers.map(c =>
        c._id === consumerId ? { ...c, isActive: !currentStatus } : c
      ));
      toast.success('Consumer status updated');
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update consumer status');
    } finally {
      setToggling(null);
    }
  };

  const filteredConsumers = consumers
    .filter(consumer => {
      const matchesSearch =
        consumer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consumer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        consumer.email?.toLowerCase().includes(searchTerm.toLowerCase());

      if (filter === 'active') return matchesSearch && consumer.isActive;
      if (filter === 'inactive') return matchesSearch && !consumer.isActive;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      return 0;
    });

  const paginatedConsumers = filteredConsumers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredConsumers.length / itemsPerPage);
  const pendingUpdates = consumers.filter(c => c.pendingProfileUpdate?.status === 'pending').length;
  const showingFrom = filteredConsumers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, filteredConsumers.length);

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">Consumer Accounts</h1>
          <p className="text-body">
            Activate or deactivate consumer accounts and track pending profile updates. Profile edits are reviewed on the Approvals page.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3498db15', color: '#3498db' }}>
            <FiUsers size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalConsumers}</span>
            <span className="stat-label">Total Consumers</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#27ae6015', color: '#27ae60' }}>
            <FiCheckCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{consumers.filter(c => c.isActive).length}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e7434315', color: '#e74343' }}>
            <FiX size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{consumers.filter(c => !c.isActive).length}</span>
            <span className="stat-label">Inactive</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f39c1215', color: '#f39c12' }}>
            <FiClock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{pendingUpdates}</span>
            <span className="stat-label">Pending Profile Updates</span>
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort */}
      <div className="dashboard-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: '100%',
                paddingLeft: '36px',
                padding: '10px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="all">All Consumers</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white'
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: '24px', marginBottom: '12px', color: '#f39c12' }}><FiClock size={24} /></div>
            Loading consumers...
          </div>
        ) : filteredConsumers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}><FiUser size={32} /></div>
            No consumers found
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '14px', color: '#555', fontSize: '14px' }}>
              Showing {showingFrom}-{showingTo} of {filteredConsumers.length} consumer accounts
            </div>
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafafa', borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '14px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Name</th>
                    <th style={{ padding: '14px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Email</th>
                    <th style={{ padding: '14px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Phone</th>
                    <th style={{ padding: '14px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Status</th>
                    <th style={{ padding: '14px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Pending Update</th>
                    <th style={{ padding: '14px', textAlign: 'left', fontWeight: '600', fontSize: '13px' }}>Joined</th>
                    <th style={{ padding: '14px', textAlign: 'center', fontWeight: '600', fontSize: '13px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedConsumers.map((consumer, idx) => (
                    <tr key={consumer._id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: idx % 2 === 0 ? 'white' : '#fafafa' }}>
                      <td style={{ padding: '14px' }}>
                        <strong>{consumer.firstName} {consumer.lastName}</strong>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#666', fontSize: '13px' }}>
                          <FiMail size={14} />
                          {consumer.email}
                        </div>
                      </td>
                      <td style={{ padding: '14px', color: '#666', fontSize: '13px' }}>
                        {consumer.phone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FiPhone size={14} />
                            {consumer.phone}
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: consumer.isActive ? '#d4edda' : '#f8d7da',
                          color: consumer.isActive ? '#155724' : '#856404'
                        }}>
                          {consumer.isActive ? <FiCheckCircle size={13} /> : <FiAlertCircle size={13} />}
                          {consumer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        {consumer.pendingProfileUpdate?.status === 'pending' ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: '#fff3cd',
                            color: '#856404'
                          }}>
                            <FiAlertCircle size={13} /> Pending
                          </span>
                        ) : (
                          <span style={{ color: '#666', fontSize: '13px' }}>None</span>
                        )}
                      </td>
                      <td style={{ padding: '14px', color: '#666', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiCalendar size={13} />
                          {new Date(consumer.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleStatus(consumer._id, consumer.isActive)}
                          disabled={toggling === consumer._id}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: toggling === consumer._id ? 'not-allowed' : 'pointer',
                            opacity: toggling === consumer._id ? 0.5 : 1,
                            color: consumer.isActive ? '#e74343' : '#27ae60',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => !toggling && (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          title={consumer.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <FiPower size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '20px' }}>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.5 : 1,
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  ← Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      padding: '6px 10px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '4px',
                      backgroundColor: currentPage === page ? '#0D7C3D' : 'white',
                      color: currentPage === page ? 'white' : 'inherit',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.5 : 1,
                    fontSize: '13px',
                    fontWeight: '500'
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminConsumers;
