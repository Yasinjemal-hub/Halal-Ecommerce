import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FiShield, FiUsers, FiCheckCircle, FiAlertTriangle,
    FiFileText, FiCalendar, FiStar, FiArrowRight,
    FiClock,
    FiTrendingUp, FiAward, FiSearch, FiX,
    FiAlertCircle, FiUser
} from 'react-icons/fi';
import mejilisService from '../services/mejilisService';
import authService from '../services/authService';
import './Mejilis.css';

// ── Business Types ──────────────────────────────────────
const BUSINESS_TYPES = [
    { value: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
    { value: 'grocery', label: 'Grocery', emoji: '🛒' },
    { value: 'butcher', label: 'Butcher', emoji: '🥩' },
    { value: 'bakery', label: 'Bakery', emoji: '🍞' },
    { value: 'wholesale', label: 'Wholesale', emoji: '📦' },
    { value: 'cosmetics', label: 'Cosmetics', emoji: '✨' },
    { value: 'clothing', label: 'Clothing', emoji: '👗' },
    { value: 'spice_shop', label: 'Spice Shop', emoji: '🌶️' },
    { value: 'supermarket', label: 'Supermarket', emoji: '🏪' },
    { value: 'other', label: 'Other', emoji: '🏢' },
];

const REGIONS = [
    'Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa',
    'Gambella', 'Harari', 'Oromia', 'Sidama', 'Somali',
    'South West Ethiopia', 'Southern Nations', 'Tigray',
];

const COMPLAINT_CATEGORIES = [
    { value: 'halal_violation', label: '🚫 Halal Violation' },
    { value: 'quality_issue', label: '📉 Quality Issue' },
    { value: 'false_advertising', label: '📢 False Advertising' },
    { value: 'hygiene_concern', label: '🧹 Hygiene Concern' },
    { value: 'pricing_dispute', label: '💰 Pricing Dispute' },
    { value: 'delivery_issue', label: '📦 Delivery Issue' },
    { value: 'customer_service', label: '📞 Customer Service' },
    { value: 'other', label: '📝 Other' },
];
const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const Mejilis = () => {
    const [activeTab, setActiveTab] = useState('register');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const isLoggedIn = authService.isAuthenticated();
    const currentUser = authService.getCurrentUser();

    // ── Registration State ─────────────────────────────────
    const [regStatus, setRegStatus] = useState(null);
    const [regLoading, setRegLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [licenseFile, setLicenseFile] = useState(null);
    const [nationalIdFile, setNationalIdFile] = useState(null);
    const [licenseDragOver, setLicenseDragOver] = useState(false);
    const [nationalIdDragOver, setNationalIdDragOver] = useState(false);
    const [regForm, setRegForm] = useState({
        businessName: '',
        businessNameAmharic: '',
        description: '',
        businessType: '',
        businessPhone: '',
        businessEmail: '',
        city: '',
        region: '',
        subcity: '',
        street: '',
    });

    // ── Complaint State ────────────────────────────────────
    const [complaintForm, setComplaintForm] = useState({
        merchantId: '',
        category: '',
        subject: '',
        description: '',
    });
    const [complaintSubmitting, setComplaintSubmitting] = useState(false);
    const [complaintEvidenceFile, setComplaintEvidenceFile] = useState(null);
    const [complaintDragOver, setComplaintDragOver] = useState(false);

    // ── Dashboard State (Admin) ────────────────────────────
    const [dashboardStats, setDashboardStats] = useState(null);
    const [merchants, setMerchants] = useState([]);
    const [merchantFilter, setMerchantFilter] = useState('');
    const [dashLoading, setDashLoading] = useState(false);

    const checkRegistrationStatus = useCallback(async () => {
        try {
            setRegLoading(true);
            const data = await mejilisService.getRegistrationStatus();
            setRegStatus(data);
        } catch (err) {
            // Not registered yet
            setRegStatus({ isRegistered: false });
        } finally {
            setRegLoading(false);
        }
    }, []);

    const loadDashboard = useCallback(async () => {
        try {
            setDashLoading(true);
            const data = await mejilisService.getDashboard();
            setDashboardStats(data);
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setDashLoading(false);
        }
    }, []);

    const loadMerchants = useCallback(async () => {
        try {
            const params = {};
            if (merchantFilter) params.verificationStatus = merchantFilter;
            const data = await mejilisService.getMerchants(params);
            setMerchants(data.merchants || []);
        } catch (err) {
            console.error('Error loading merchants:', err);
        }
    }, [merchantFilter]);

    // ── Check registration status on mount ─────────────────
    useEffect(() => {
        if (isLoggedIn) {
            checkRegistrationStatus();
            if (currentUser?.role === 'admin') {
                setActiveTab('dashboard');
            }
        } else {
            setRegLoading(false);
        }
    }, [checkRegistrationStatus, currentUser?.role, isLoggedIn]);

    // ── Load dashboard when tab changes ────────────────────
    useEffect(() => {
        if (activeTab === 'dashboard' && currentUser?.role === 'admin') {
            loadDashboard();
        }
        if (activeTab === 'merchants' && currentUser?.role === 'admin') {
            loadMerchants();
        }
    }, [activeTab, currentUser?.role, loadDashboard, loadMerchants]);

    // ── Register Merchant ──────────────────────────────────
    const handleRegister = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const [licenseUrl, nationalIdUrl] = await Promise.all([
                licenseFile ? fileToBase64(licenseFile) : Promise.resolve(''),
                nationalIdFile ? fileToBase64(nationalIdFile) : Promise.resolve(''),
            ]);

            const merchantData = {
                businessName: regForm.businessName,
                businessNameAmharic: regForm.businessNameAmharic,
                description: regForm.description,
                businessType: regForm.businessType,
                businessPhone: regForm.businessPhone,
                businessEmail: regForm.businessEmail,
                businessAddress: {
                    city: regForm.city,
                    region: regForm.region,
                    subcity: regForm.subcity,
                    street: regForm.street,
                },
                governmentLicense: licenseUrl ? { url: licenseUrl } : undefined,
                nationalId: nationalIdUrl ? { url: nationalIdUrl } : undefined,
            };

            const result = await mejilisService.registerMerchant(merchantData);
            setSuccessMsg(result.message || 'Registration submitted successfully!');
            setRegStatus({ isRegistered: true, merchant: result.merchant });
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── File Complaint ─────────────────────────────────────
    const handleComplaint = async (e) => {
        e.preventDefault();
        setComplaintSubmitting(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const evidenceUrl = complaintEvidenceFile ? await fileToBase64(complaintEvidenceFile) : '';
            const result = await mejilisService.fileComplaint({
                ...complaintForm,
                evidence: evidenceUrl ? [{ url: evidenceUrl, name: complaintEvidenceFile.name }] : [],
            });
            setSuccessMsg(result.message || 'Complaint filed successfully!');
            setComplaintForm({ merchantId: '', category: '', subject: '', description: '' });
            setComplaintEvidenceFile(null);
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Failed to file complaint.');
        } finally {
            setComplaintSubmitting(false);
        }
    };

    // ── Verify Merchant (Admin) ────────────────────────────
    const handleVerifyMerchant = async (merchantId, status) => {
        try {
            await mejilisService.verifyMerchant(merchantId, {
                verificationStatus: status,
                verificationNotes: `Status changed to ${status} by admin`,
            });
            setSuccessMsg(`Merchant ${status} successfully!`);
            loadMerchants();
            if (dashboardStats) loadDashboard();
        } catch (err) {
            setErrorMsg(err.response?.data?.message || 'Action failed.');
        }
    };

    const updateRegForm = (field, value) => {
        setRegForm((prev) => ({ ...prev, [field]: value }));
    };

    const validateImageFile = (file) => {
        if (!file) return false;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setErrorMsg('Only JPG, PNG, or WEBP images are allowed.');
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            setErrorMsg(`Image must be ${MAX_IMAGE_SIZE_MB}MB or smaller.`);
            return false;
        }
        return true;
    };

    const selectLicenseFile = (file) => {
        if (!file) {
            setLicenseFile(null);
            return;
        }
        if (!validateImageFile(file)) return;
        setLicenseFile(file);
    };

    const selectNationalIdFile = (file) => {
        if (!file) {
            setNationalIdFile(null);
            return;
        }
        if (!validateImageFile(file)) return;
        setNationalIdFile(file);
    };

    const selectComplaintEvidence = (file) => {
        if (!file) {
            setComplaintEvidenceFile(null);
            return;
        }
        if (!validateImageFile(file)) return;
        setComplaintEvidenceFile(file);
    };

    // ── Clear messages after 5s ────────────────────────────
    useEffect(() => {
        if (successMsg || errorMsg) {
            const timer = setTimeout(() => {
                setSuccessMsg('');
                setErrorMsg('');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [successMsg, errorMsg]);

    return (
        <div className="mejilis-page">
            {/* ═══ HERO SECTION ═════════════════════════════════════ */}
            <section className="mejilis-hero">
                <div className="mejilis-hero-bg">
                    <img src="/images/mejilis-hero.png" alt="Mejilis Council Chamber" />
                    <div className="mejilis-hero-overlay" />
                    <div className="mejilis-hero-pattern" />
                </div>
                <div className="mejilis-hero-content">
                    <div className="mejilis-hero-badge">
                        <FiShield size={16} />
                        Ethiopian Islamic Affairs Supreme Council
                    </div>
                    <h1>
                        The <span className="text-gradient-gold">Mejilis</span> Council<br />
                        Halal Verification System
                    </h1>
                    <p className="mejilis-hero-desc">
                        Ensuring trust, transparency, and Halal compliance across all merchants.
                        Register your business, verify certifications, or report concerns — all
                        managed by the Mejilis Council.
                    </p>
                    <div className="mejilis-hero-actions">
                        {isLoggedIn ? (
                            <>
                                <button
                                    className="btn btn-gold"
                                    onClick={() => setActiveTab('register')}
                                    id="mejilis-register-btn"
                                >
                                    <FiFileText size={18} /> Register as Merchant
                                </button>
                                <button
                                    className="btn btn-white-outline"
                                    onClick={() => setActiveTab('complaints')}
                                    id="mejilis-complaint-btn"
                                >
                                    <FiAlertTriangle size={18} /> File a Complaint
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/register" className="btn btn-gold" id="mejilis-signup-btn">
                                    <FiUser size={18} /> Create Account to Begin
                                </Link>
                                <Link to="/login" className="btn btn-white-outline" id="mejilis-login-btn">
                                    Sign In <FiArrowRight size={16} />
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ═══ STATS BAR ════════════════════════════════════════ */}
            <div className="mejilis-stats-bar">
                <div className="mejilis-stats-grid stagger-children">
                    <div className="mejilis-stat-card animate-fade-in-up">
                        <div className="mejilis-stat-icon green"><FiShield size={24} /></div>
                        <div className="mejilis-stat-value">{dashboardStats?.stats?.approvedMerchants || 150}+</div>
                        <div className="mejilis-stat-label">Verified Merchants</div>
                    </div>
                    <div className="mejilis-stat-card animate-fade-in-up">
                        <div className="mejilis-stat-icon gold"><FiAward size={24} /></div>
                        <div className="mejilis-stat-value">{dashboardStats?.stats?.approvedCertifications || 120}+</div>
                        <div className="mejilis-stat-label">Certifications Issued</div>
                    </div>
                    <div className="mejilis-stat-card animate-fade-in-up">
                        <div className="mejilis-stat-icon blue"><FiUsers size={24} /></div>
                        <div className="mejilis-stat-value">{dashboardStats?.stats?.totalMerchants || 200}+</div>
                        <div className="mejilis-stat-label">Total Merchants</div>
                    </div>
                    <div className="mejilis-stat-card animate-fade-in-up">
                        <div className="mejilis-stat-icon red"><FiAlertTriangle size={24} /></div>
                        <div className="mejilis-stat-value">{dashboardStats?.stats?.pendingMerchants || 12}</div>
                        <div className="mejilis-stat-label">Pending Review</div>
                    </div>
                </div>
            </div>

            {/* ═══ TAB NAVIGATION ═══════════════════════════════════ */}
            <section className="mejilis-tabs-section">
                <div className="mejilis-tabs" id="mejilis-tabs">
                    <button
                        className={`mejilis-tab ${activeTab === 'register' ? 'active' : ''}`}
                        onClick={() => setActiveTab('register')}
                        id="tab-register"
                    >
                        <FiFileText size={16} /> Merchant Registration
                    </button>
                    <button
                        className={`mejilis-tab ${activeTab === 'complaints' ? 'active' : ''}`}
                        onClick={() => setActiveTab('complaints')}
                        id="tab-complaints"
                    >
                        <FiAlertTriangle size={16} /> Consumer Reports
                    </button>
                    {currentUser?.role === 'admin' && (
                        <>
                            <button
                                className={`mejilis-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setActiveTab('dashboard')}
                                id="tab-dashboard"
                            >
                                <FiTrendingUp size={16} /> Dashboard
                                <span className="mejilis-tab-badge warning">
                                    {dashboardStats?.stats?.pendingMerchants || '…'}
                                </span>
                            </button>
                            <button
                                className={`mejilis-tab ${activeTab === 'merchants' ? 'active' : ''}`}
                                onClick={() => setActiveTab('merchants')}
                                id="tab-merchants"
                            >
                                <FiUsers size={16} /> Manage Merchants
                            </button>
                        </>
                    )}
                </div>
            </section>

            {/* ═══ CONTENT PANELS ═══════════════════════════════════ */}
            <div className="mejilis-content">
                {/* Success / Error Messages */}
                {successMsg && (
                    <div className="mejilis-success-message">
                        <FiCheckCircle size={20} />
                        <p>{successMsg}</p>
                        <button onClick={() => setSuccessMsg('')} style={{ marginLeft: 'auto', background: 'none', color: 'var(--success)' }}>
                            <FiX size={16} />
                        </button>
                    </div>
                )}
                {errorMsg && (
                    <div className="mejilis-error-message">
                        <FiAlertCircle size={20} />
                        <p>{errorMsg}</p>
                        <button onClick={() => setErrorMsg('')} style={{ marginLeft: 'auto', background: 'none', color: 'var(--error)' }}>
                            <FiX size={16} />
                        </button>
                    </div>
                )}

                {/* ── REGISTER TAB ────────────────────────────────── */}
                <div className={`mejilis-panel ${activeTab === 'register' ? 'active' : ''}`}>
                    {!isLoggedIn ? (
                        <div className="mejilis-status-card">
                            <div className="mejilis-status-icon pending">
                                <FiUser size={36} />
                            </div>
                            <h3>Sign In Required</h3>
                            <p>Please create an account or sign in to register as a merchant.</p>
                            <Link to="/register" className="btn btn-primary btn-lg">
                                Create Account <FiArrowRight size={16} />
                            </Link>
                        </div>
                    ) : regLoading ? (
                        <div className="mejilis-loading">
                            <div className="spinner" />
                            <p>Checking registration status...</p>
                        </div>
                    ) : regStatus?.isRegistered ? (
                        <div className="mejilis-status-card">
                            <div className={`mejilis-status-icon ${regStatus.merchant?.verificationStatus || 'pending'}`}>
                                {regStatus.merchant?.verificationStatus === 'approved' ? (
                                    <FiCheckCircle size={36} />
                                ) : regStatus.merchant?.verificationStatus === 'rejected' ? (
                                    <FiX size={36} />
                                ) : (
                                    <FiClock size={36} />
                                )}
                            </div>
                            <h3>
                                {regStatus.merchant?.verificationStatus === 'approved'
                                    ? '✅ Your Business is Verified!'
                                    : regStatus.merchant?.verificationStatus === 'rejected'
                                        ? '❌ Registration Rejected'
                                        : '⏳ Registration Under Review'}
                            </h3>
                            <p>
                                {regStatus.merchant?.verificationStatus === 'approved'
                                    ? `Congratulations! "${regStatus.merchant?.businessName}" has been verified by the Mejilis Council.`
                                    : regStatus.merchant?.verificationStatus === 'rejected'
                                        ? 'Your registration has been reviewed and was not approved. Please contact us for details.'
                                        : `Your business "${regStatus.merchant?.businessName}" is being reviewed by the Mejilis Council. This usually takes 2-5 business days.`}
                            </p>
                            <span className={`status-badge ${regStatus.merchant?.verificationStatus || 'pending'}`}>
                                <FiClock size={12} />
                                {(regStatus.merchant?.verificationStatus || 'pending').replace('_', ' ')}
                            </span>
                            {regStatus.merchant?.verificationNotes && (
                                <p style={{ marginTop: 16, fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                                    <strong>Notes:</strong> {regStatus.merchant.verificationNotes}
                                </p>
                            )}

                            {/* Halal Certificate Display */}
                            {regStatus.merchant?.halalCertification && regStatus.merchant.verificationStatus === 'approved' && (
                                <div style={{
                                    marginTop: 24,
                                    padding: '16px 20px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, rgba(212, 160, 23, 0.1), rgba(13, 124, 61, 0.05))',
                                    border: '1px solid rgba(212, 160, 23, 0.3)',
                                    textAlign: 'left'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                        <div style={{
                                            background: '#D4A017', color: 'white', padding: 8, borderRadius: 8, display: 'flex'
                                        }}>
                                            <FiAward size={24} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0D7C3D' }}>
                                                Official Halal Certification
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                                Issued by Mejilis Council
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                                        <div style={{ flex: 1, minWidth: '120px' }}>
                                            <strong style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'block' }}>Certificate No.</strong>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem' }}>
                                                {regStatus.merchant.halalCertification.certificateNumber || 'PENDING ASSIGNMENT'}
                                            </span>
                                        </div>
                                        <div style={{ flex: 1, minWidth: '120px' }}>
                                            <strong style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'block' }}>Status</strong>
                                            <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                                                {regStatus.merchant.halalCertification.status.toUpperCase()}
                                            </span>
                                        </div>
                                        {regStatus.merchant.halalCertification.expiryDate && (
                                            <div style={{ flex: 1, minWidth: '120px' }}>
                                                <strong style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'block' }}>Valid Until</strong>
                                                <span style={{ fontWeight: 600 }}>
                                                    {new Date(regStatus.merchant.halalCertification.expiryDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="mejilis-register-layout">
                            {/* Left - Info */}
                            <div className="mejilis-register-info">
                                <h2>Become a Verified<br />Halal Merchant 🕌</h2>
                                <p>
                                    Join Ethiopia's trusted Halal marketplace. Register your business with the
                                    Mejilis Council for official verification and reach thousands of conscious consumers.
                                </p>
                                <div className="mejilis-register-image">
                                    <img src="/images/merchant-partnership.png" alt="Merchant Partnership" />
                                </div>
                                <div className="mejilis-register-steps">
                                    <div className="mejilis-step">
                                        <div className="mejilis-step-number">1</div>
                                        <div className="mejilis-step-content">
                                            <h4>Submit Application</h4>
                                            <p>Fill in your business details and submit for review.</p>
                                        </div>
                                    </div>
                                    <div className="mejilis-step">
                                        <div className="mejilis-step-number">2</div>
                                        <div className="mejilis-step-content">
                                            <h4>Mejilis Review</h4>
                                            <p>The council reviews your application and Halal compliance.</p>
                                        </div>
                                    </div>
                                    <div className="mejilis-step">
                                        <div className="mejilis-step-number">3</div>
                                        <div className="mejilis-step-content">
                                            <h4>Get Verified</h4>
                                            <p>Once approved, your store goes live with the Halal badge.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right - Registration Form */}
                            <div className="mejilis-register-form-card">
                                <h3>📋 Merchant Application Form</h3>
                                <p>Please fill out all required fields carefully to submit your business for official verification.</p>
                                <form className="mejilis-form" onSubmit={handleRegister}>
                                    
                                    {/* ── SECTION 1: BUSINESS IDENTITY ── */}
                                    <div className="mejilis-form-section">
                                        <h4 className="mejilis-form-section-title"><FiStar /> Business Identity</h4>
                                        <div className="mejilis-form-row">
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">
                                                    Business Name <span className="required">*</span>
                                                </label>
                                                <input
                                                    className="mejilis-form-input"
                                                    type="text"
                                                    placeholder="e.g. Addis Halal Meats"
                                                    value={regForm.businessName}
                                                    onChange={(e) => updateRegForm('businessName', e.target.value)}
                                                    required
                                                    id="reg-business-name"
                                                />
                                            </div>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">Business Name (Amharic)</label>
                                                <input
                                                    className="mejilis-form-input"
                                                    type="text"
                                                    placeholder="e.g. አዲስ ሐላል ስጋ"
                                                    value={regForm.businessNameAmharic}
                                                    onChange={(e) => updateRegForm('businessNameAmharic', e.target.value)}
                                                    id="reg-business-name-am"
                                                />
                                            </div>
                                        </div>

                                        <div className="mejilis-form-group full-width" style={{ marginBottom: '20px' }}>
                                            <label className="mejilis-form-label">
                                                Business Type <span className="required">*</span>
                                            </label>
                                            <select
                                                className="mejilis-form-select"
                                                value={regForm.businessType}
                                                onChange={(e) => updateRegForm('businessType', e.target.value)}
                                                required
                                                id="reg-business-type"
                                            >
                                                <option value="">Select business type...</option>
                                                {BUSINESS_TYPES.map((type) => (
                                                    <option key={type.value} value={type.value}>
                                                        {type.emoji} {type.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="mejilis-form-group full-width">
                                            <label className="mejilis-form-label">
                                                Description <span className="required">*</span>
                                            </label>
                                            <textarea
                                                className="mejilis-form-textarea"
                                                placeholder="Describe your business, products, and Halal practices in detail..."
                                                value={regForm.description}
                                                onChange={(e) => updateRegForm('description', e.target.value)}
                                                required
                                                rows={4}
                                                id="reg-description"
                                            />
                                        </div>
                                    </div>

                                    {/* ── SECTION 2: CONTACT & LOCATION ── */}
                                    <div className="mejilis-form-section">
                                        <h4 className="mejilis-form-section-title"><FiTrendingUp /> Contact & Location</h4>
                                        <div className="mejilis-form-row">
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">
                                                    Business Phone <span className="required">*</span>
                                                </label>
                                                <input
                                                    className="mejilis-form-input"
                                                    type="tel"
                                                    placeholder="+251911223344"
                                                    value={regForm.businessPhone}
                                                    onChange={(e) => updateRegForm('businessPhone', e.target.value)}
                                                    required
                                                    id="reg-phone"
                                                />
                                            </div>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">Business Email</label>
                                                <input
                                                    className="mejilis-form-input"
                                                    type="email"
                                                    placeholder="info@yourbusiness.com"
                                                    value={regForm.businessEmail}
                                                    onChange={(e) => updateRegForm('businessEmail', e.target.value)}
                                                    id="reg-email"
                                                />
                                            </div>
                                        </div>

                                        <div className="mejilis-form-row">
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">Region</label>
                                                <select
                                                    className="mejilis-form-select"
                                                    value={regForm.region}
                                                    onChange={(e) => updateRegForm('region', e.target.value)}
                                                    id="reg-region"
                                                >
                                                    <option value="">Select region...</option>
                                                    {REGIONS.map((r) => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">City</label>
                                                <input
                                                    className="mejilis-form-input"
                                                    type="text"
                                                    placeholder="e.g. Addis Ababa"
                                                    value={regForm.city}
                                                    onChange={(e) => updateRegForm('city', e.target.value)}
                                                    id="reg-city"
                                                />
                                            </div>
                                        </div>

                                        <div className="mejilis-form-row" style={{ marginBottom: 0 }}>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">Subcity / Kebele</label>
                                                <input
                                                    className="mejilis-form-input"
                                                    type="text"
                                                    placeholder="e.g. Bole"
                                                    value={regForm.subcity}
                                                    onChange={(e) => updateRegForm('subcity', e.target.value)}
                                                    id="reg-subcity"
                                                />
                                            </div>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">Street</label>
                                                <input
                                                    className="mejilis-form-input"
                                                    type="text"
                                                    placeholder="e.g. Churchill Ave"
                                                    value={regForm.street}
                                                    onChange={(e) => updateRegForm('street', e.target.value)}
                                                    id="reg-street"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── SECTION 3: OFFICIAL DOCUMENTS ── */}
                                    <div className="mejilis-form-section">
                                        <h4 className="mejilis-form-section-title"><FiShield /> Official Documents</h4>
                                        <div className="mejilis-form-row" style={{ marginBottom: 0 }}>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">
                                                    Government License Image <span className="required">*</span>
                                                </label>
                                                <label
                                                    className={`mejilis-upload-input ${licenseDragOver ? 'dragover' : ''}`}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setLicenseDragOver(true);
                                                    }}
                                                    onDragLeave={() => setLicenseDragOver(false)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setLicenseDragOver(false);
                                                        selectLicenseFile(e.dataTransfer.files?.[0] || null);
                                                    }}
                                                >
                                                    <FiFileText size={16} />
                                                    <span>{licenseFile ? licenseFile.name : 'Click or drop license image'}</span>
                                                    <small>JPG, PNG, WEBP - max {MAX_IMAGE_SIZE_MB}MB</small>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => selectLicenseFile(e.target.files?.[0] || null)}
                                                        required
                                                    />
                                                </label>
                                                {licenseFile && (
                                                    <div className="mejilis-file-preview">
                                                        <img src={URL.createObjectURL(licenseFile)} alt="Government license preview" />
                                                        <button type="button" onClick={() => setLicenseFile(null)}>Remove</button>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">
                                                    National ID Image <span className="required">*</span>
                                                </label>
                                                <label
                                                    className={`mejilis-upload-input ${nationalIdDragOver ? 'dragover' : ''}`}
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        setNationalIdDragOver(true);
                                                    }}
                                                    onDragLeave={() => setNationalIdDragOver(false)}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        setNationalIdDragOver(false);
                                                        selectNationalIdFile(e.dataTransfer.files?.[0] || null);
                                                    }}
                                                >
                                                    <FiUser size={16} />
                                                    <span>{nationalIdFile ? nationalIdFile.name : 'Click or drop national ID image'}</span>
                                                    <small>JPG, PNG, WEBP - max {MAX_IMAGE_SIZE_MB}MB</small>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => selectNationalIdFile(e.target.files?.[0] || null)}
                                                        required
                                                    />
                                                </label>
                                                {nationalIdFile && (
                                                    <div className="mejilis-file-preview">
                                                        <img src={URL.createObjectURL(nationalIdFile)} alt="National ID preview" />
                                                        <button type="button" onClick={() => setNationalIdFile(null)}>Remove</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="mejilis-form-submit"
                                        disabled={submitting}
                                        id="reg-submit-btn"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="spinner" /> Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <FiShield size={18} /> Submit for Mejilis Verification
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── COMPLAINTS TAB ──────────────────────────────── */}
                <div className={`mejilis-panel ${activeTab === 'complaints' ? 'active' : ''}`}>
                    {!isLoggedIn ? (
                        <div className="mejilis-status-card">
                            <div className="mejilis-status-icon pending">
                                <FiAlertTriangle size={36} />
                            </div>
                            <h3>Sign In Required</h3>
                            <p>Please sign in to file a complaint about a merchant.</p>
                            <Link to="/login" className="btn btn-primary btn-lg">
                                Sign In <FiArrowRight size={16} />
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mejilis-complaint-form-card">
                                <h3><FiAlertTriangle size={20} /> Report a Concern</h3>
                                <p style={{ color: 'var(--text-tertiary)', marginBottom: 24, fontSize: '0.9375rem' }}>
                                    If you've experienced a Halal compliance issue, quality concern, or any other problem with a merchant,
                                    please file a report. The Mejilis Council will investigate.
                                </p>

                                <form className="mejilis-form" onSubmit={handleComplaint}>
                                    {/* ── SECTION 1: REPORT DETAILS ── */}
                                    <div className="mejilis-form-section">
                                        <h4 className="mejilis-form-section-title"><FiSearch /> Merchant & Category</h4>
                                        <div className="mejilis-form-row" style={{ marginBottom: 0 }}>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">
                                                    Merchant ID <span className="required">*</span>
                                                </label>
                                                <input
                                                    className="mejilis-form-input"
                                                    type="text"
                                                    placeholder="Enter Merchant ID here"
                                                    value={complaintForm.merchantId}
                                                    onChange={(e) => setComplaintForm({ ...complaintForm, merchantId: e.target.value })}
                                                    required
                                                    id="complaint-merchant-id"
                                                />
                                            </div>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">
                                                    Complaint Category <span className="required">*</span>
                                                </label>
                                                <select
                                                    className="mejilis-form-select"
                                                    value={complaintForm.category}
                                                    onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                                                    required
                                                    id="complaint-category"
                                                >
                                                    <option value="">Select category...</option>
                                                    {COMPLAINT_CATEGORIES.map((cat) => (
                                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── SECTION 2: ISSUE DESCRIPTION ── */}
                                    <div className="mejilis-form-section">
                                        <h4 className="mejilis-form-section-title"><FiFileText /> Incident Details</h4>
                                        <div className="mejilis-form-group full-width" style={{ marginBottom: '20px' }}>
                                            <label className="mejilis-form-label">
                                                Subject <span className="required">*</span>
                                            </label>
                                            <input
                                                className="mejilis-form-input"
                                                type="text"
                                                placeholder="Briefly summarize the issue (e.g. Halal label found on non-compliant food)"
                                                value={complaintForm.subject}
                                                onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                                                required
                                                id="complaint-subject"
                                            />
                                        </div>
                                        <div className="mejilis-form-group full-width" style={{ marginBottom: '20px' }}>
                                            <label className="mejilis-form-label">
                                                Description <span className="required">*</span>
                                            </label>
                                            <textarea
                                                className="mejilis-form-textarea"
                                                placeholder="Provide detailed chronological information about your experience..."
                                                value={complaintForm.description}
                                                onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                                                required
                                                rows={5}
                                                id="complaint-description"
                                            />
                                        </div>
                                        <div className="mejilis-form-group full-width" style={{ marginBottom: 0 }}>
                                            <label className="mejilis-form-label">Photographic Evidence (Optional)</label>
                                            <label
                                                className={`mejilis-upload-input ${complaintDragOver ? 'dragover' : ''}`}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    setComplaintDragOver(true);
                                                }}
                                                onDragLeave={() => setComplaintDragOver(false)}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    setComplaintDragOver(false);
                                                    selectComplaintEvidence(e.dataTransfer.files?.[0] || null);
                                                }}
                                            >
                                                <FiFileText size={16} />
                                                <span>{complaintEvidenceFile ? complaintEvidenceFile.name : 'Click or drop complaint evidence image'}</span>
                                                <small>JPG, PNG, WEBP - max {MAX_IMAGE_SIZE_MB}MB</small>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => selectComplaintEvidence(e.target.files?.[0] || null)}
                                                />
                                            </label>
                                            {complaintEvidenceFile && (
                                                <div className="mejilis-file-preview">
                                                    <img src={URL.createObjectURL(complaintEvidenceFile)} alt="Complaint evidence preview" />
                                                    <button type="button" onClick={() => setComplaintEvidenceFile(null)}>Remove</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="mejilis-form-submit"
                                        disabled={complaintSubmitting}
                                        id="complaint-submit-btn"
                                        style={{ background: 'linear-gradient(135deg, var(--warning), #b45309)' }}
                                    >
                                        {complaintSubmitting ? (
                                            <>
                                                <div className="spinner" /> Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <FiAlertTriangle size={18} /> Submit Report
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Info card */}
                            <div className="mejilis-register-image" style={{ maxWidth: 600, margin: '0 auto' }}>
                                <img src="/images/halal-certification.png" alt="Halal Certification" style={{ height: 240 }} />
                            </div>
                        </>
                    )}
                </div>

                {/* ── DASHBOARD TAB (Admin) ───────────────────────── */}
                <div className={`mejilis-panel ${activeTab === 'dashboard' ? 'active' : ''}`}>
                    {currentUser?.role !== 'admin' ? (
                        <div className="mejilis-status-card">
                            <div className="mejilis-status-icon pending">
                                <FiShield size={36} />
                            </div>
                            <h3>Admin Access Required</h3>
                            <p>Only Mejilis Council administrators can access the dashboard.</p>
                        </div>
                    ) : dashLoading ? (
                        <div className="mejilis-loading">
                            <div className="spinner" />
                            <p>Loading dashboard...</p>
                        </div>
                    ) : dashboardStats ? (
                        <>
                            <div className="mejilis-section-header">
                                <h2>📊 Mejilis Dashboard</h2>
                            </div>

                            {/* Pending Merchants Table */}
                            {dashboardStats.pendingMerchantsList?.length > 0 && (
                                <>
                                    <h3 style={{ marginBottom: 16, fontSize: '1.125rem' }}>
                                        ⏳ Pending Merchant Applications ({dashboardStats.pendingMerchantsList.length})
                                    </h3>
                                    <div className="mejilis-table-container" style={{ marginBottom: 32 }}>
                                        <table className="mejilis-table">
                                            <thead>
                                                <tr>
                                                    <th>Merchant</th>
                                                    <th>Type</th>
                                                    <th>Phone</th>
                                                    <th>Status</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {dashboardStats.pendingMerchantsList.map((m) => (
                                                    <tr key={m._id}>
                                                        <td>
                                                            <div className="mejilis-merchant-cell">
                                                                <div className="mejilis-merchant-avatar">
                                                                    {m.businessName?.[0] || '?'}
                                                                </div>
                                                                <div>
                                                                    <div className="mejilis-merchant-name">{m.businessName}</div>
                                                                    <div className="mejilis-merchant-email">{m.user?.email}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>{m.businessType?.replace('_', ' ')}</td>
                                                        <td>{m.businessPhone}</td>
                                                        <td>
                                                            <span className={`status-badge ${m.verificationStatus}`}>
                                                                {m.verificationStatus}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="mejilis-action-btns">
                                                                <button
                                                                    className="mejilis-action-btn approve"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'approved')}
                                                                    id={`approve-${m._id}`}
                                                                >
                                                                    ✓ Approve
                                                                </button>
                                                                <button
                                                                    className="mejilis-action-btn reject"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'rejected')}
                                                                    id={`reject-${m._id}`}
                                                                >
                                                                    ✕ Reject
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}

                            {/* Recent Merchants */}
                            <h3 style={{ marginBottom: 16, fontSize: '1.125rem' }}>
                                🕐 Recent Registrations
                            </h3>
                            <div className="mejilis-table-container">
                                <table className="mejilis-table">
                                    <thead>
                                        <tr>
                                            <th>Merchant</th>
                                            <th>Type</th>
                                            <th>Phone</th>
                                            <th>Status</th>
                                            <th>Joined</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(dashboardStats.recentMerchants || []).map((m) => (
                                            <tr key={m._id}>
                                                <td>
                                                    <div className="mejilis-merchant-cell">
                                                        <div className="mejilis-merchant-avatar">
                                                            {m.businessName?.[0] || '?'}
                                                        </div>
                                                        <div>
                                                            <div className="mejilis-merchant-name">{m.businessName}</div>
                                                            <div className="mejilis-merchant-email">{m.user?.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>{m.businessType?.replace('_', ' ')}</td>
                                                <td>{m.businessPhone}</td>
                                                <td>
                                                    <span className={`status-badge ${m.verificationStatus}`}>
                                                        {m.verificationStatus?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                                    {new Date(m.createdAt).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="mejilis-empty">
                            <div className="mejilis-empty-icon">📊</div>
                            <h3>No data available</h3>
                            <p>Dashboard data will appear when merchants register.</p>
                        </div>
                    )}
                </div>

                {/* ── MANAGE MERCHANTS TAB (Admin) ────────────────── */}
                <div className={`mejilis-panel ${activeTab === 'merchants' ? 'active' : ''}`}>
                    {currentUser?.role !== 'admin' ? (
                        <div className="mejilis-status-card">
                            <div className="mejilis-status-icon pending">
                                <FiShield size={36} />
                            </div>
                            <h3>Admin Access Required</h3>
                            <p>Only Mejilis Council administrators can manage merchants.</p>
                        </div>
                    ) : (
                        <>
                            <div className="mejilis-section-header">
                                <h2>👥 All Merchants</h2>
                                <div className="mejilis-filters">
                                    {['', 'pending', 'approved', 'rejected', 'suspended'].map((f) => (
                                        <button
                                            key={f}
                                            className={`mejilis-filter-btn ${merchantFilter === f ? 'active' : ''}`}
                                            onClick={() => setMerchantFilter(f)}
                                            id={`filter-${f || 'all'}`}
                                        >
                                            {f === '' ? 'All' : f.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {merchants.length > 0 ? (
                                <div className="mejilis-table-container">
                                    <table className="mejilis-table">
                                        <thead>
                                            <tr>
                                                <th>Merchant</th>
                                                <th>Type</th>
                                                <th>Phone</th>
                                                <th>Rating</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {merchants.map((m) => (
                                                <tr key={m._id}>
                                                    <td>
                                                        <div className="mejilis-merchant-cell">
                                                            <div className="mejilis-merchant-avatar">
                                                                {m.businessName?.[0] || '?'}
                                                            </div>
                                                            <div>
                                                                <div className="mejilis-merchant-name">{m.businessName}</div>
                                                                <div className="mejilis-merchant-email">{m.user?.email || 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{m.businessType?.replace('_', ' ')}</td>
                                                    <td>{m.businessPhone}</td>
                                                    <td>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <FiStar size={14} color="var(--accent-500)" />
                                                            {m.ratingsAverage || 0}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${m.verificationStatus}`}>
                                                            {m.verificationStatus?.replace('_', ' ')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="mejilis-action-btns">
                                                            {m.verificationStatus !== 'approved' && (
                                                                <button
                                                                    className="mejilis-action-btn approve"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'approved')}
                                                                >
                                                                    ✓ Approve
                                                                </button>
                                                            )}
                                                            {m.verificationStatus !== 'rejected' && (
                                                                <button
                                                                    className="mejilis-action-btn reject"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'rejected')}
                                                                >
                                                                    ✕ Reject
                                                                </button>
                                                            )}
                                                            {m.verificationStatus !== 'suspended' && m.verificationStatus === 'approved' && (
                                                                <button
                                                                    className="mejilis-action-btn review"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'suspended')}
                                                                >
                                                                    ⏸ Suspend
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="mejilis-empty">
                                    <div className="mejilis-empty-icon">👥</div>
                                    <h3>No merchants found</h3>
                                    <p>No merchants match the selected filter.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ═══ FEATURES SECTION ═════════════════════════════════ */}
            <section className="mejilis-features">
                <div className="mejilis-features-header">
                    <h2>Why the Mejilis System Matters</h2>
                    <p>
                        Built on trust, transparency, and Islamic values. The Mejilis Council ensures
                        every merchant meets the highest Halal standards.
                    </p>
                </div>
                <div className="mejilis-features-grid stagger-children">
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiShield size={28} />
                        </div>
                        <h3>Halal Verification</h3>
                        <p>
                            Every merchant is thoroughly reviewed by the Mejilis council to ensure
                            compliance with Islamic Halal standards.
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiAward size={28} />
                        </div>
                        <h3>Official Certification</h3>
                        <p>
                            Approved merchants receive an official Halal certificate from the Ethiopian
                            Islamic Affairs Supreme Council.
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiUsers size={28} />
                        </div>
                        <h3>Consumer Protection</h3>
                        <p>
                            Consumers can report concerns, and the council investigates to maintain
                            marketplace integrity.
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiCalendar size={28} />
                        </div>
                        <h3>Regular Reviews</h3>
                        <p>
                            The council conducts periodic sessions to review merchant compliance and
                            address consumer concerns.
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiSearch size={28} />
                        </div>
                        <h3>Inspection System</h3>
                        <p>
                            On-site inspections ensure merchants maintain halal standards in their
                            operations at all times.
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiTrendingUp size={28} />
                        </div>
                        <h3>Growth Support</h3>
                        <p>
                            Verified merchants gain exposure to thousands of conscious consumers
                            across Ethiopia and beyond.
                        </p>
                    </div>
                </div>
            </section>

            {/* ═══ CTA SECTION ══════════════════════════════════════ */}
            <section className="mejilis-cta">
                <div className="mejilis-cta-content">
                    <div className="mejilis-cta-images">
                        <div className="mejilis-cta-img">
                            <img src="/images/mejilis-hero.png" alt="Mejilis Council" />
                        </div>
                        <div className="mejilis-cta-img">
                            <img src="/images/halal-certification.png" alt="Halal Certification" />
                        </div>
                        <div className="mejilis-cta-img">
                            <img src="/images/merchant-partnership.png" alt="Merchant Partnership" />
                        </div>
                    </div>
                    <h2>Ready to Join the Halal Marketplace?</h2>
                    <p>
                        Whether you're a merchant looking to expand your reach or a consumer
                        seeking verified Halal products — the Mejilis Council is here for you.
                    </p>
                    {isLoggedIn ? (
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => { setActiveTab('register'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                            id="cta-register-btn"
                        >
                            Start Registration <FiArrowRight size={16} />
                        </button>
                    ) : (
                        <Link to="/register" className="btn btn-primary btn-lg" id="cta-signup-btn">
                            Create Your Account <FiArrowRight size={16} />
                        </Link>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Mejilis;
