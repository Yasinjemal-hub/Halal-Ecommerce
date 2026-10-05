import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FiShield, FiUsers, FiCheckCircle, FiAlertTriangle,
    FiFileText, FiCalendar, FiStar, FiArrowRight,
    FiTrendingUp, FiAward, FiSearch, FiX,
    FiAlertCircle, FiUser
} from 'react-icons/fi';
import mejilisService from '../services/mejilisService';
import authService from '../services/authService';
import MerchantApplicationForm from '../components/merchant/MerchantApplicationForm';
import MerchantApplicationStatus from '../components/merchant/MerchantApplicationStatus';
import { useLanguage } from '../i18n/LanguageContext';
import { backendError } from '../utils/backendErrors';
import './Mejilis.css';

// Business types / regions now live in the shared application form
// (components/merchant/MerchantApplicationForm.jsx).
const COMPLAINT_CATEGORIES = [
    { value: 'halal_violation', key: 'complaint_halal_violation' },
    { value: 'quality_issue', key: 'complaint_quality_issue' },
    { value: 'false_advertising', key: 'complaint_false_advertising' },
    { value: 'hygiene_concern', key: 'complaint_hygiene_concern' },
    { value: 'pricing_dispute', key: 'complaint_pricing_dispute' },
    { value: 'delivery_issue', key: 'complaint_delivery_issue' },
    { value: 'customer_service', key: 'complaint_customer_service' },
    { value: 'other', key: 'complaint_other' },
];

const VERIFY_STATUS_KEYS = {
    pending: 'appst_st_pending',
    under_review: 'appst_st_under_review',
    approved: 'appst_st_approved',
    rejected: 'appst_st_rejected',
    suspended: 'appst_st_suspended',
};

const MERCHANT_TYPE_KEYS = {
    restaurant: 'mtype_restaurant',
    grocery: 'mtype_grocery',
    butcher: 'mtype_butcher',
    bakery: 'mtype_bakery',
    spice_shop: 'mtype_spice_shop',
    clothing: 'mtype_clothing',
    cosmetics: 'mtype_cosmetics',
    wholesale: 'mtype_wholesale',
    supermarket: 'mtype_supermarket',
    other: 'mtype_other',
};
const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const Mejilis = () => {
    const { t, formatDate } = useLanguage();
    const [activeTab, setActiveTab] = useState('register');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const isLoggedIn = authService.isAuthenticated();
    const currentUser = authService.getCurrentUser();
    const isMerchantUser = currentUser?.role === 'merchant';

    // ── Registration State ─────────────────────────────────
    // The form and status UI live in shared merchant components
    // (components/merchant/) so this tab matches /merchant/register.
    const [regStatus, setRegStatus] = useState(null);
    const [regLoading, setRegLoading] = useState(true);
    const [regError, setRegError] = useState('');
    const [editingApplication, setEditingApplication] = useState(false);

    // ── Complaint State ────────────────────────────────────
    const [complaintForm, setComplaintForm] = useState({
        merchantIdentifier: '',
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
    const [merchantsLoading, setMerchantsLoading] = useState(false);
    const [merchantsError, setMerchantsError] = useState('');

    // A request failure stays an error state — never "unregistered".
    // The form renders only after the server confirms no application exists.
    const checkRegistrationStatus = useCallback(async () => {
        try {
            setRegLoading(true);
            setRegError('');
            const data = await mejilisService.getRegistrationStatus();
            setRegStatus(data);
        } catch (err) {
            // Not registered yet
            setRegStatus(null);
            setRegError(backendError(t, err, 'mreg_load_error'));
        } finally {
            setRegLoading(false);
        }
    }, [t]);

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
            setMerchantsLoading(true);
            setMerchantsError('');
            const params = {};
            if (merchantFilter) params.verificationStatus = merchantFilter;
            console.log('Fetching merchants with params:', params);
            const data = await mejilisService.getMerchants(params);
            console.log('Merchants response:', data);
            const merchantsList = data.merchants || [];
            console.log('Merchants count:', merchantsList.length);
            setMerchants(merchantsList);
        } catch (err) {
            const errorMsg = backendError(t, err, 'err_load_merchants');
            console.error('Error loading merchants:', errorMsg, err);
            setMerchantsError(errorMsg);
            setMerchants([]);
        } finally {
            setMerchantsLoading(false);
        }
    }, [merchantFilter, t]);

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

    // ── Register / Resubmit Merchant ───────────────────────
    // Submission itself is owned by MerchantApplicationForm; here we only
    // sync the resulting status into this page.
    const handleApplicationSubmitted = (merchant, message) => {
        setEditingApplication(false);
        setSuccessMsg(message || t('mreg_submitted'));
        setRegStatus({ isRegistered: true, merchant });
    };

    // ── File Complaint ─────────────────────────────────────
    const handleComplaint = async (e) => {
        e.preventDefault();
        setComplaintSubmitting(true);
        setSuccessMsg('');
        setErrorMsg('');

        try {
            const evidenceUrl = complaintEvidenceFile ? await fileToBase64(complaintEvidenceFile) : '';
            await mejilisService.fileComplaint({
                ...complaintForm,
                evidence: evidenceUrl ? [{ url: evidenceUrl, name: complaintEvidenceFile.name }] : [],
            });
            setSuccessMsg(t('mej_complaint_ok'));
            setComplaintForm({ merchantIdentifier: '', category: '', subject: '', description: '' });
            setComplaintEvidenceFile(null);
        } catch (err) {
            setErrorMsg(backendError(t, err, 'err_complaint_failed'));
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
            setSuccessMsg(t('mej_merchant_status', { status: t(VERIFY_STATUS_KEYS[status] || 'appst_st_pending') }));
            loadMerchants();
            if (dashboardStats) loadDashboard();
        } catch (err) {
            setErrorMsg(backendError(t, err, 'err_action_failed'));
        }
    };

    const validateImageFile = (file) => {
        if (!file) return false;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setErrorMsg(t('appform_img_type_error'));
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            setErrorMsg(t('appform_img_size', { size: MAX_IMAGE_SIZE_MB }));
            return false;
        }
        return true;
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
                    <img src="/images/mejilis-hero.png" alt={t('mej_alt_chamber')} fetchPriority="high" decoding="async" width="640" height="640" />
                    <div className="mejilis-hero-overlay" />
                    <div className="mejilis-hero-pattern" />
                </div>
                <div className="mejilis-hero-content">
                    <div className="mejilis-hero-badge">
                        <FiShield size={16} />
                        {t('mej_hero_badge')}
                    </div>
                    <h1>
                        The <span className="text-gradient-gold">Mejilis</span> Council<br />
                        {t('mej_hero_title_2')}
                    </h1>
                    <p className="mejilis-hero-desc">
                        {t('mej_hero_desc')}
                    </p>
                    <div className="mejilis-hero-actions">
                        {isLoggedIn ? (
                            <>
                                <button
                                    className="btn btn-gold"
                                    onClick={() => setActiveTab('register')}
                                    id="mejilis-register-btn"
                                >
                                    <FiFileText size={18} /> {t('footer_register_merchant')}
                                </button>
                                <button
                                    className="btn btn-white-outline"
                                    onClick={() => setActiveTab('complaints')}
                                    id="mejilis-complaint-btn"
                                >
                                    <FiAlertTriangle size={18} /> {t('mej_complaint_btn')}
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/register" className="btn btn-gold" id="mejilis-signup-btn">
                                    <FiUser size={18} /> {t('mej_create_account')}
                                </Link>
                                <Link to="/login" className="btn btn-white-outline" id="mejilis-login-btn">
                                    {t('auth_sign_in')} <FiArrowRight size={16} />
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
                        <div className="mejilis-stat-label">{t('footer_verified_merchants')}</div>
                    </div>
                    <div className="mejilis-stat-card animate-fade-in-up">
                        <div className="mejilis-stat-icon gold"><FiAward size={24} /></div>
                        <div className="mejilis-stat-value">{dashboardStats?.stats?.approvedCertifications || 120}+</div>
                        <div className="mejilis-stat-label">{t('mej_stat_certs')}</div>
                    </div>
                    <div className="mejilis-stat-card animate-fade-in-up">
                        <div className="mejilis-stat-icon blue"><FiUsers size={24} /></div>
                        <div className="mejilis-stat-value">{dashboardStats?.stats?.totalMerchants || 200}+</div>
                        <div className="mejilis-stat-label">{t('mej_stat_total')}</div>
                    </div>
                    <div className="mejilis-stat-card animate-fade-in-up">
                        <div className="mejilis-stat-icon red"><FiAlertTriangle size={24} /></div>
                        <div className="mejilis-stat-value">{dashboardStats?.stats?.pendingMerchants || 12}</div>
                        <div className="mejilis-stat-label">{t('mej_stat_pending')}</div>
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
                        <FiFileText size={16} /> {t('mej_tab_register')}
                    </button>
                    <button
                        className={`mejilis-tab ${activeTab === 'complaints' ? 'active' : ''}`}
                        onClick={() => setActiveTab('complaints')}
                        id="tab-complaints"
                    >
                        <FiAlertTriangle size={16} /> {t('mej_tab_complaints')}
                    </button>
                    {currentUser?.role === 'admin' && (
                        <>
                            <button
                                className={`mejilis-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setActiveTab('dashboard')}
                                id="tab-dashboard"
                            >
                                <FiTrendingUp size={16} /> {t('nav_dashboard')}
                                <span className="mejilis-tab-badge warning">
                                    {dashboardStats?.stats?.pendingMerchants || '…'}
                                </span>
                            </button>
                            <button
                                className={`mejilis-tab ${activeTab === 'merchants' ? 'active' : ''}`}
                                onClick={() => setActiveTab('merchants')}
                                id="tab-merchants"
                            >
                                <FiUsers size={16} /> {t('mej_tab_merchants')}
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
                            <h3>{t('mreg_signin')}</h3>
                            <p>{t('mreg_signin_desc')}</p>
                            <Link to="/register" className="btn btn-primary btn-lg">
                                {t('mreg_create_account')} <FiArrowRight size={16} />
                            </Link>
                        </div>
                    ) : regLoading ? (
                        <div className="mejilis-loading">
                            <div className="spinner" />
                            <p>{t('mreg_checking')}</p>
                        </div>
                    ) : regError && !regStatus ? (
                        <div className="mejilis-status-card">
                            <div className="mejilis-status-icon warning">
                                <FiAlertTriangle size={36} />
                            </div>
                            <h3>{t('mreg_load_error')}</h3>
                            <p>{regError}</p>
                            <button type="button" className="btn btn-primary btn-lg" onClick={checkRegistrationStatus}>
                                {t('ord_retry')}
                            </button>
                        </div>
                    ) : regStatus?.isRegistered && !editingApplication ? (
                        <MerchantApplicationStatus
                            merchant={regStatus.merchant}
                            onUpdateRequest={() => setEditingApplication(true)}
                        />
                    ) : regStatus?.isRegistered && editingApplication ? (
                        <MerchantApplicationForm
                            mode="resubmit"
                            initialValues={regStatus.merchant}
                            onSubmitted={handleApplicationSubmitted}
                            onCancel={() => setEditingApplication(false)}
                        />
                    ) : !isMerchantUser && regStatus ? (
                        <div className="mejilis-status-card">
                            <div className="mejilis-status-icon warning">
                                <FiAlertTriangle size={36} />
                            </div>
                            <h3>{t('mreg_restricted')}</h3>
                            <p>
                                {t('mej_restricted_role', { role: currentUser?.role || 'consumer' })}
                            </p>
                            <p>
                                {t('mej_restricted_help')}
                            </p>
                            <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                <Link to="/" className="btn btn-primary btn-lg">
                                    {t('mreg_home')}
                                </Link>
                                <Link to="/dashboard" className="btn btn-white-outline btn-lg">
                                    {t('mreg_dashboard')}
                                </Link>
                            </div>
                        </div>
                    ) : regStatus?.isRegistered === false ? (
                        <div className="mejilis-register-layout">
                            {/* Left - Info */}
                            <div className="mejilis-register-info">
                                <h2>{t('mej_become')}</h2>
                                <p>
                                    {t('mej_become_desc')}
                                </p>
                                <div className="mejilis-register-image">
                                    <img src="/images/merchant-partnership.png" alt={t('mej_alt_partnership')} loading="lazy" decoding="async" width="640" height="640" />
                                </div>
                                <div className="mejilis-register-steps">
                                    <div className="mejilis-step">
                                        <div className="mejilis-step-number">1</div>
                                        <div className="mejilis-step-content">
                                            <h4>{t('mej_step_submit')}</h4>
                                            <p>{t('mej_step_submit_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="mejilis-step">
                                        <div className="mejilis-step-number">2</div>
                                        <div className="mejilis-step-content">
                                            <h4>{t('mej_step_review')}</h4>
                                            <p>{t('mej_step_review_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="mejilis-step">
                                        <div className="mejilis-step-number">3</div>
                                        <div className="mejilis-step-content">
                                            <h4>{t('mej_step_verified')}</h4>
                                            <p>{t('mej_step_verified_desc')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Right - Registration Form (shared component,
                                same as /merchant/register) */}
                            <MerchantApplicationForm
                                mode="create"
                                onSubmitted={handleApplicationSubmitted}
                            />
                        </div>
                    ) : (
                        <div className="mejilis-loading">
                            <div className="spinner" />
                            <p>Checking registration status...</p>
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
                            <h3>{t('mreg_signin')}</h3>
                            <p>{t('mej_signin_complaint')}</p>
                            <Link to="/login" className="btn btn-primary btn-lg">
                                {t('auth_sign_in')} <FiArrowRight size={16} />
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="mejilis-complaint-form-card">
                                <h3><FiAlertTriangle size={20} /> {t('mej_report')}</h3>
                                <p style={{ color: 'var(--text-tertiary)', marginBottom: 24, fontSize: '0.9375rem' }}>
                                    {t('mej_report_desc')}
                                </p>

                                <form className="mejilis-form" onSubmit={handleComplaint}>
                                    {/* ── SECTION 1: REPORT DETAILS ── */}
                                    <div className="mejilis-form-section">
                                        <h4 className="mejilis-form-section-title"><FiSearch /> {t('mej_merchant_cat')}</h4>
                                        <div className="mejilis-form-row" style={{ marginBottom: 0 }}>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">
                                                    {t('mej_merchant_id')} <span className="required">*</span>
                                                </label>
                                                <input
                                                    className="mejilis-form-input"
                                                    type="text"
                                                    placeholder={t('mej_merchant_id_ph')}
                                                    value={complaintForm.merchantIdentifier}
                                                    onChange={(e) => setComplaintForm({ ...complaintForm, merchantIdentifier: e.target.value })}
                                                    required
                                                    id="complaint-merchant-identifier"
                                                />
                                                <small style={{ display: 'block', marginTop: '8px', color: 'var(--text-tertiary)' }}>
                                                    {t('mej_merchant_hint')}
                                                </small>
                                            </div>
                                            <div className="mejilis-form-group">
                                                <label className="mejilis-form-label">
                                                    {t('mej_complaint_cat')} <span className="required">*</span>
                                                </label>
                                                <select
                                                    className="mejilis-form-select"
                                                    value={complaintForm.category}
                                                    onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                                                    required
                                                    id="complaint-category"
                                                >
                                                    <option value="">{t('mej_select_cat')}</option>
                                                    {COMPLAINT_CATEGORIES.map((cat) => (
                                                        <option key={cat.value} value={cat.value}>{t(cat.key)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ── SECTION 2: ISSUE DESCRIPTION ── */}
                                    <div className="mejilis-form-section">
                                        <h4 className="mejilis-form-section-title"><FiFileText /> {t('mej_incident')}</h4>
                                        <div className="mejilis-form-group full-width" style={{ marginBottom: '20px' }}>
                                            <label className="mejilis-form-label">
                                                {t('mej_subject')} <span className="required">*</span>
                                            </label>
                                            <input
                                                className="mejilis-form-input"
                                                type="text"
                                                placeholder={t('mej_subject_ph')}
                                                value={complaintForm.subject}
                                                onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                                                required
                                                id="complaint-subject"
                                            />
                                        </div>
                                        <div className="mejilis-form-group full-width" style={{ marginBottom: '20px' }}>
                                            <label className="mejilis-form-label">
                                                {t('mej_description')} <span className="required">*</span>
                                            </label>
                                            <textarea
                                                className="mejilis-form-textarea"
                                                placeholder={t('mej_description_ph')}
                                                value={complaintForm.description}
                                                onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                                                required
                                                rows={5}
                                                id="complaint-description"
                                            />
                                        </div>
                                        <div className="mejilis-form-group full-width" style={{ marginBottom: 0 }}>
                                            <label className="mejilis-form-label">{t('mej_evidence')}</label>
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
                                                <span>{complaintEvidenceFile ? complaintEvidenceFile.name : t('mej_evidence_drop')}</span>
                                                <small>{t('appform_file_types', { size: MAX_IMAGE_SIZE_MB })}</small>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => selectComplaintEvidence(e.target.files?.[0] || null)}
                                                />
                                            </label>
                                            {complaintEvidenceFile && (
                                                <div className="mejilis-file-preview">
                                                    <img src={URL.createObjectURL(complaintEvidenceFile)} alt="Complaint evidence preview" />
                                                    <button type="button" onClick={() => setComplaintEvidenceFile(null)}>{t('appform_remove')}</button>
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
                                                <div className="spinner" /> {t('appform_submitting')}
                                            </>
                                        ) : (
                                            <>
                                                <FiAlertTriangle size={18} /> {t('mej_submit_report')}
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>

                            {/* Info card */}
                            <div className="mejilis-register-image" style={{ maxWidth: 600, margin: '0 auto' }}>
                                <img src="/images/halal-certification.png" alt={t('mej_alt_cert')} style={{ height: 240 }} loading="lazy" decoding="async" width="640" height="640" />
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
                            <h3>{t('mej_admin_required')}</h3>
                            <p>{t('mej_admin_dash')}</p>
                        </div>
                    ) : dashLoading ? (
                        <div className="mejilis-loading">
                            <div className="spinner" />
                            <p>{t('mej_loading_dash')}</p>
                        </div>
                    ) : dashboardStats ? (
                        <>
                            <div className="mejilis-section-header">
                                <h2>{t('mej_dashboard')}</h2>
                            </div>

                            {/* Pending Merchants Table */}
                            {dashboardStats.pendingMerchantsList?.length > 0 && (
                                <>
                                    <h3 style={{ marginBottom: 16, fontSize: '1.125rem' }}>
                                        {t('mej_pending_apps', { count: dashboardStats.pendingMerchantsList.length })}
                                    </h3>
                                    <div className="mejilis-table-container" style={{ marginBottom: 32 }}>
                                        <table className="mejilis-table">
                                            <thead>
                                                <tr>
                                                    <th>{t('mej_th_merchant')}</th>
                                                    <th>{t('mej_th_type')}</th>
                                                    <th>{t('mej_th_phone')}</th>
                                                    <th>{t('mej_th_status')}</th>
                                                    <th>{t('mej_th_actions')}</th>
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
                                                        <td>{t(MERCHANT_TYPE_KEYS[m.businessType] || 'mtype_other')}</td>
                                                        <td>{m.businessPhone}</td>
                                                        <td>
                                                            <span className={`status-badge ${m.verificationStatus}`}>
                                                                {t(VERIFY_STATUS_KEYS[m.verificationStatus] || 'appst_st_pending')}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <div className="mejilis-action-btns">
                                                                <button
                                                                    className="mejilis-action-btn approve"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'approved')}
                                                                    id={`approve-${m._id}`}
                                                                >
                                                                    {t('mej_approve')}
                                                                </button>
                                                                <button
                                                                    className="mejilis-action-btn reject"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'rejected')}
                                                                    id={`reject-${m._id}`}
                                                                >
                                                                    {t('mej_reject')}
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
                                {t('mej_recent')}
                            </h3>
                            <div className="mejilis-table-container">
                                <table className="mejilis-table">
                                    <thead>
                                        <tr>
                                            <th>{t('mej_th_merchant')}</th>
                                            <th>{t('mej_th_type')}</th>
                                            <th>{t('mej_th_phone')}</th>
                                            <th>{t('mej_th_status')}</th>
                                            <th>{t('mej_th_joined')}</th>
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
                                                <td>{t(MERCHANT_TYPE_KEYS[m.businessType] || 'mtype_other')}</td>
                                                <td>{m.businessPhone}</td>
                                                <td>
                                                    <span className={`status-badge ${m.verificationStatus}`}>
                                                        {t(VERIFY_STATUS_KEYS[m.verificationStatus] || 'appst_st_pending')}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                                                    {formatDate(m.createdAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="mejilis-empty">
                            <div className="mejilis-empty-icon"><FiFileText size={48} /></div>
                            <h3>{t('mej_no_data')}</h3>
                            <p>{t('mej_no_data_desc')}</p>
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
                            <h3>{t('mej_admin_required')}</h3>
                            <p>{t('mej_admin_merchants')}</p>
                        </div>
                    ) : (
                        <>
                            <div className="mejilis-section-header">
                                <h2>{t('mej_all')}</h2>
                                <div className="mejilis-filters">
                                    {['', 'pending', 'approved', 'rejected', 'suspended'].map((f) => (
                                        <button
                                            key={f}
                                            className={`mejilis-filter-btn ${merchantFilter === f ? 'active' : ''}`}
                                            onClick={() => setMerchantFilter(f)}
                                            id={`filter-${f || 'all'}`}
                                        >
                                            {f === '' ? t('ord_all') : t(VERIFY_STATUS_KEYS[f] || 'appst_st_pending')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {merchantsError && (
                                <div className="mejilis-error-message" style={{ marginBottom: '20px' }}>
                                    <FiAlertCircle size={20} />
                                    <p>{merchantsError}</p>
                                </div>
                            )}

                            {merchantsLoading ? (
                                <div className="mejilis-loading">
                                    <div className="spinner" />
                                    <p>{t('mej_loading_merchants')}</p>
                                </div>
                            ) : merchants.length > 0 ? (
                                <div className="mejilis-table-container">
                                    <table className="mejilis-table">
                                        <thead>
                                            <tr>
                                                <th>{t('mej_th_merchant')}</th>
                                                <th>{t('mej_th_type')}</th>
                                                <th>{t('mej_th_phone')}</th>
                                                <th>{t('mej_th_rating')}</th>
                                                <th>{t('mej_th_status')}</th>
                                                <th>{t('mej_th_actions')}</th>
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
                                                    <td>{t(MERCHANT_TYPE_KEYS[m.businessType] || 'mtype_other')}</td>
                                                    <td>{m.businessPhone}</td>
                                                    <td>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <FiStar size={14} color="var(--accent-500)" />
                                                            {m.ratingsAverage || 0}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${m.verificationStatus}`}>
                                                            {t(VERIFY_STATUS_KEYS[m.verificationStatus] || 'appst_st_pending')}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div className="mejilis-action-btns">
                                                            {m.verificationStatus !== 'approved' && (
                                                                <button
                                                                    className="mejilis-action-btn approve"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'approved')}
                                                                >
                                                                    {t('mej_approve')}
                                                                </button>
                                                            )}
                                                            {m.verificationStatus !== 'rejected' && (
                                                                <button
                                                                    className="mejilis-action-btn reject"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'rejected')}
                                                                >
                                                                    {t('mej_reject')}
                                                                </button>
                                                            )}
                                                            {m.verificationStatus !== 'suspended' && m.verificationStatus === 'approved' && (
                                                                <button
                                                                    className="mejilis-action-btn review"
                                                                    onClick={() => handleVerifyMerchant(m._id, 'suspended')}
                                                                >
                                                                    {t('mej_suspend')}
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
                                    <div className="mejilis-empty-icon"><FiSearch size={48} /></div>
                                    <h3>{t('mej_no_merchants')}</h3>
                                    <p>{t('mej_no_merchants_desc')}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ═══ FEATURES SECTION ═════════════════════════════════ */}
            <section className="mejilis-features">
                <div className="mejilis-features-header">
                    <h2>{t('mej_why')}</h2>
                    <p>
                        {t('mej_why_desc')}
                    </p>
                </div>
                <div className="mejilis-features-grid stagger-children">
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiShield size={28} />
                        </div>
                        <h3>{t('mej_f_verification')}</h3>
                        <p>
                            {t('mej_f_verification_desc')}
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiAward size={28} />
                        </div>
                        <h3>{t('mej_f_official')}</h3>
                        <p>
                            {t('mej_f_official_desc')}
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiUsers size={28} />
                        </div>
                        <h3>{t('mej_f_consumer')}</h3>
                        <p>
                            {t('mej_f_consumer_desc')}
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiCalendar size={28} />
                        </div>
                        <h3>{t('mej_f_reviews')}</h3>
                        <p>
                            {t('mej_f_reviews_desc')}
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiSearch size={28} />
                        </div>
                        <h3>{t('mej_f_inspection')}</h3>
                        <p>
                            {t('mej_f_inspection_desc')}
                        </p>
                    </div>
                    <div className="mejilis-feature-card animate-fade-in-up">
                        <div className="mejilis-feature-icon">
                            <FiTrendingUp size={28} />
                        </div>
                        <h3>{t('mej_f_growth')}</h3>
                        <p>
                            {t('mej_f_growth_desc')}
                        </p>
                    </div>
                </div>
            </section>

            {/* ═══ CTA SECTION ══════════════════════════════════════ */}
            <section className="mejilis-cta">
                <div className="mejilis-cta-content">
                    <div className="mejilis-cta-images">
                        <div className="mejilis-cta-img">
                            <img src="/images/mejilis-hero.png" alt={t('mej_alt_council')} loading="lazy" decoding="async" width="640" height="640" />
                        </div>
                        <div className="mejilis-cta-img">
                            <img src="/images/halal-certification.png" alt={t('mej_alt_cert')} loading="lazy" decoding="async" width="640" height="640" />
                        </div>
                        <div className="mejilis-cta-img">
                            <img src="/images/merchant-partnership.png" alt={t('mej_alt_partnership')} loading="lazy" decoding="async" width="640" height="640" />
                        </div>
                    </div>
                    <h2>{t('mej_cta_title')}</h2>
                    <p>
                        {t('mej_cta_desc')}
                    </p>
                    {isLoggedIn ? (
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={() => { setActiveTab('register'); window.scrollTo({ top: 400, behavior: 'smooth' }); }}
                            id="cta-register-btn"
                        >
                            {t('mej_cta_start')} <FiArrowRight size={16} />
                        </button>
                    ) : (
                        <Link to="/register" className="btn btn-primary btn-lg" id="cta-signup-btn">
                            {t('mej_cta_create')} <FiArrowRight size={16} />
                        </Link>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Mejilis;
