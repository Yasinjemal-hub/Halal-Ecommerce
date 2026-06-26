import React, { useEffect, useState } from 'react';
import { FiSearch, FiChevronDown, FiPackage, FiAlertCircle, FiCheckCircle, FiPower, FiTrendingUp, FiCalendar, FiMapPin, FiClock, FiX, FiMail, FiPhone, FiShoppingBag } from 'react-icons/fi';
import adminService from '../../services/adminService';
import merchantService from '../../services/merchantService';
import { toast } from 'react-hot-toast';
import './Dashboard.css';

const AdminMerchants = () => {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerification, setFilterVerification] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [expandedMerchant, setExpandedMerchant] = useState(null);
  const [merchantProducts, setMerchantProducts] = useState({});
  const [loadingProducts, setLoadingProducts] = useState({});
  const [toggling, setToggling] = useState(null);
  const [verifying, setVerifying] = useState(null);
  const [verificationUpdates, setVerificationUpdates] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    loadMerchants();
  }, []);

  const loadMerchants = async () => {
    setLoading(true);
    try {
      const response = await adminService.getAllMerchants();
      const merchantList = response.merchants || response;
      setMerchants(merchantList);
    } catch (error) {
      console.error('Error loading merchants:', error);
      toast.error('Failed to load merchants');
    } finally {
      setLoading(false);
    }
  };

  const handleExpandMerchant = async (merchantId) => {
    if (expandedMerchant === merchantId) {
      setExpandedMerchant(null);
    } else {
      setExpandedMerchant(merchantId);
      if (!merchantProducts[merchantId]) {
        await loadMerchantProducts(merchantId);
      }
    }
  };

  const loadMerchantProducts = async (merchantId) => {
    setLoadingProducts(prev => ({ ...prev, [merchantId]: true }));
    try {
      const response = await merchantService.getMerchantProducts(merchantId);
      const products = response.products || response;
      setMerchantProducts(prev => ({
        ...prev,
        [merchantId]: products
      }));
    } catch (error) {
      console.error('Error loading merchant products:', error);
      toast.error('Failed to load products');
      setMerchantProducts(prev => ({
        ...prev,
        [merchantId]: []
      }));
    } finally {
      setLoadingProducts(prev => ({ ...prev, [merchantId]: false }));
    }
  };

  const handleToggleStatus = async (merchantId, currentStatus) => {
    setToggling(merchantId);
    try {
      await adminService.toggleUserStatus(merchantId);
      setMerchants(merchants.map(m =>
        m._id === merchantId ? { ...m, isActive: !currentStatus } : m
      ));
      toast.success('Merchant status updated');
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('Failed to update merchant status');
    } finally {
      setToggling(null);
    }
  };

  const handleVerificationChange = (merchantId, value) => {
    setVerificationUpdates(prev => ({ ...prev, [merchantId]: value }));
  };

  const handleUpdateMerchantVerification = async (merchantId) => {
    const merchant = merchants.find((m) => m._id === merchantId);
    if (!merchant) return;

    const verificationStatus = verificationUpdates[merchantId] || merchant.verificationStatus;

    setVerifying(merchantId);
    try {
      const response = await adminService.verifyMerchant(merchantId, {
        verificationStatus,
      });
      const updatedMerchant = response.merchant || response;
      setMerchants(merchants.map(m => (m._id === merchantId ? updatedMerchant : m)));
      setVerificationUpdates(prev => ({ ...prev, [merchantId]: updatedMerchant.verificationStatus }));
      toast.success(`Merchant status updated to ${verificationStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating merchant verification:', error);
      toast.error(error.response?.data?.message || 'Failed to update merchant verification');
    } finally {
      setVerifying(null);
    }
  };

  const filteredMerchants = merchants
    .filter(merchant => {
      const matchesSearch =
        merchant.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.businessEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.businessPhone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.user?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        merchant.user?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

      if (filterVerification === 'approved') {
        if (!matchesSearch || merchant.verificationStatus !== 'approved') return false;
      } else if (filterVerification === 'pending') {
        if (!matchesSearch || merchant.verificationStatus !== 'pending') return false;
      } else if (!matchesSearch) return false;

      if (filterStatus === 'active') return merchant.isActive;
      if (filterStatus === 'inactive') return !merchant.isActive;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'name') return a.businessName.localeCompare(b.businessName);
      return 0;
    });

  const paginatedMerchants = filteredMerchants.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredMerchants.length / itemsPerPage);
  const inactiveMerchants = merchants.filter(m => !m.isActive).length;
  const showingFrom = filteredMerchants.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const showingTo = Math.min(currentPage * itemsPerPage, filteredMerchants.length);

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">Merchants Management</h1>
          <p className="text-body">
            Review merchant registrations, verify marketplace eligibility, and control merchant account access.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#2ecc7115', color: '#2ecc71' }}>
            <FiShoppingBag size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{merchants.length}</span>
            <span className="stat-label">Total Merchants</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#3498db15', color: '#3498db' }}>
            <FiCheckCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{merchants.filter(m => m.verificationStatus === 'approved').length}</span>
            <span className="stat-label">Approved</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f39c1215', color: '#f39c12' }}>
            <FiClock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{merchants.filter(m => m.verificationStatus === 'pending').length}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e7434315', color: '#e74343' }}>
            <FiX size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{inactiveMerchants}</span>
            <span className="stat-label">Inactive</span>
          </div>
        </div>
      </div>

      {/* Search, Filter & Sort */}
      <div className="dashboard-section">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', gridColumn: 'span 1' }}>
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
            value={filterVerification}
            onChange={(e) => {
              setFilterVerification(e.target.value);
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
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
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
            <option value="all">All Activity</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
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
            Loading merchants...
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}><FiShoppingBag size={32} /></div>
            No merchants found
          </div>
        ) : (
          <>
            <div style={{ marginBottom: '14px', color: '#555', fontSize: '14px' }}>
              Showing {showingFrom}-{showingTo} of {filteredMerchants.length} merchants
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paginatedMerchants.map(merchant => (
                <div key={merchant._id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
                  <div
                    onClick={() => handleExpandMerchant(merchant._id)}
                    style={{
                      padding: '16px',
                      backgroundColor: expandedMerchant === merchant._id ? '#f9f9f9' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background-color 0.2s',
                      borderBottom: expandedMerchant === merchant._id ? '1px solid var(--border-color)' : 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = expandedMerchant === merchant._id ? '#f9f9f9' : 'white')}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>{merchant.businessName}</h4>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '14px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: merchant.verificationStatus === 'approved' ? '#d4edda' : '#fff3cd',
                          color: merchant.verificationStatus === 'approved' ? '#155724' : '#856404'
                        }}>
                          {merchant.verificationStatus === 'approved' ? <FiCheckCircle size={11} /> : <FiAlertCircle size={11} />}
                          {merchant.verificationStatus.replace('_', ' ')}
                        </span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '14px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: merchant.isActive ? '#d4edda' : '#f8d7da',
                          color: merchant.isActive ? '#155724' : '#856404'
                        }}>
                          {merchant.isActive ? '●' : '○'} {merchant.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '13px', color: '#666' }}>
                        <div><FiMail size={13} style={{marginRight:4}} /> {merchant.businessEmail || merchant.user?.email || 'Not provided'}</div>
                        <div><FiPhone size={13} style={{marginRight:4}} /> {merchant.businessPhone || merchant.user?.phone || 'Not provided'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiMapPin size={13} /> {merchant.businessAddress?.city || 'Not provided'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiCalendar size={13} /> {new Date(merchant.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '20px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStatus(merchant._id, merchant.isActive);
                        }}
                        disabled={toggling === merchant._id}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: toggling === merchant._id ? 'not-allowed' : 'pointer',
                          opacity: toggling === merchant._id ? 0.5 : 1,
                          color: merchant.isActive ? '#e74343' : '#27ae60',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => !toggling && (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        title={merchant.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <FiPower size={16} />
                      </button>
                      <FiChevronDown
                        size={20}
                        style={{
                          transform: expandedMerchant === merchant._id ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                          color: '#666'
                        }}
                      />
                    </div>
                  </div>
                  {expandedMerchant === merchant._id && (
                    <div style={{ padding: '16px', backgroundColor: '#fafafa', borderTop: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ minWidth: '180px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white' }}>
                          <div style={{ fontSize: '12px', marginBottom: '8px', color: '#777' }}>Business type</div>
                          <div style={{ fontWeight: '600' }}>{merchant.businessType || 'N/A'}</div>
                        </div>
                        <div style={{ minWidth: '180px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white' }}>
                          <div style={{ fontSize: '12px', marginBottom: '8px', color: '#777' }}>Products</div>
                          <div style={{ fontWeight: '600' }}>{merchant.totalProducts || 0}</div>
                        </div>
                        <div style={{ minWidth: '180px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white' }}>
                          <div style={{ fontSize: '12px', marginBottom: '8px', color: '#777' }}>Orders</div>
                          <div style={{ fontWeight: '600' }}>{merchant.totalOrders || 0}</div>
                        </div>
                        <div style={{ minWidth: '180px', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white' }}>
                          <div style={{ fontSize: '12px', marginBottom: '8px', color: '#777' }}>Revenue</div>
                          <div style={{ fontWeight: '600' }}>ETB {merchant.totalRevenue?.toLocaleString() || 0}</div>
                        </div>
                      </div>
                      <div style={{ marginBottom: '20px', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Verification status</div>
                            <div style={{ fontSize: '13px', color: '#666' }}>Change merchant verification state if needed.</div>
                          </div>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 12px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: merchant.verificationStatus === 'approved' ? '#d4edda' : '#fff3cd',
                            color: merchant.verificationStatus === 'approved' ? '#155724' : '#856404'
                          }}>
                            {merchant.verificationStatus.replace('_', ' ')}
                          </span>
                        </div>
                        <div style={{ display: 'grid', gap: '12px', marginTop: '16px' }}>
                          <select
                            value={verificationUpdates[merchant._id] || merchant.verificationStatus}
                            onChange={(e) => handleVerificationChange(merchant._id, e.target.value)}
                            style={{
                              width: '100%',
                              maxWidth: '320px',
                              padding: '10px 12px',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              fontSize: '14px',
                              backgroundColor: 'white'
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="under_review">Under Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="suspended">Suspended</option>
                          </select>
                          <button
                            onClick={() => handleUpdateMerchantVerification(merchant._id)}
                            disabled={verifying === merchant._id}
                            style={{
                              width: 'fit-content',
                              padding: '10px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: '#0D7C3D',
                              color: 'white',
                              cursor: verifying === merchant._id ? 'not-allowed' : 'pointer',
                              opacity: verifying === merchant._id ? 0.6 : 1,
                              fontWeight: '600'
                            }}
                          >
                            {verifying === merchant._id ? 'Saving...' : 'Save status'}
                          </button>
                        </div>
                      </div>
                      {/* Products Section */}
                      {loadingProducts[merchant._id] ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>
                          <FiClock size={16} style={{marginRight:4}} /> Loading products...
                        </div>
                      ) : (merchantProducts[merchant._id] || []).length > 0 ? (
                        <div>
                          <h5 style={{ marginTop: 0, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}>
                            <FiPackage size={14} /> Products ({(merchantProducts[merchant._id] || []).length})
                          </h5>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                            {(merchantProducts[merchant._id] || []).slice(0, 8).map(product => (
                              <div key={product._id} style={{
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '10px',
                                textAlign: 'center',
                                backgroundColor: 'white',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
                              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}
                              >
                                {(product.images?.[0]?.url || product.image) && (
                                  <img
                                    src={product.images?.[0]?.url || product.image}
                                    alt={product.name}
                                    style={{ width: '100%', height: '90px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }}
                                  />
                                )}
                                <h6 style={{ margin: '0 0 6px 0', fontSize: '12px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</h6>
                                <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#0D7C3D', fontWeight: '600' }}>
                                  ${product.price?.toFixed(2)}
                                </p>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', fontSize: '11px', color: '#999' }}>
                                  <FiTrendingUp size={11} />
                                  {product.sold || 0} sold
                                </div>
                              </div>
                            ))}
                          </div>
                          {(merchantProducts[merchant._id] || []).length > 8 && (
                            <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: '#999' }}>
                              +{(merchantProducts[merchant._id] || []).length - 8} more products
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
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

export default AdminMerchants;
