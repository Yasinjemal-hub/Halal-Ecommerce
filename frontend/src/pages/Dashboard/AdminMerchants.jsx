import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  FiSearch, FiAlertCircle, FiClock, FiX, FiPower,
  FiCalendar, FiMapPin, FiMail, FiPhone, FiShoppingBag, FiFileText,
  FiDownload, FiExternalLink, FiShield,
} from 'react-icons/fi';
import adminService from '../../services/adminService';
import { useLanguage } from '../../i18n/LanguageContext';
import { backendError } from '../../utils/backendErrors';
import { toast } from 'react-hot-toast';
import './Dashboard.css';
import './AdminMerchants.css';

const VERIFICATION_STATES = ['pending', 'under_review', 'approved', 'rejected', 'suspended'];
const PAGE_SIZE = 8;

const MM_STATUS_KEYS = {
  pending: 'appst_st_pending',
  under_review: 'appst_st_under_review',
  approved: 'appst_st_approved',
  rejected: 'appst_st_rejected',
  suspended: 'appst_st_suspended',
};

const MM_TYPE_KEYS = {
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

const ownerUserId = (merchant) => {
  if (!merchant?.user) return null;
  return typeof merchant.user === 'object' ? merchant.user._id : merchant.user;
};

// ── Identity/business document preview ────────────────────
// Documents are loaded ONLY through the authenticated admin detail
// endpoint (GET /api/admin/merchants/:id); public responses never
// include them.
const DocumentCard = ({ title, doc }) => {
  const { t } = useLanguage();
  const [imgState, setImgState] = useState('loading'); // loading | loaded | failed
  const url = doc?.url || '';

  useEffect(() => {
    setImgState('loading');
  }, [url]);

  if (!url) {
    return (
      <div className="mm-doc-card" data-testid={`doc-missing-${title}`}>
        <h4>{title}</h4>
        <p className="text-body">{t('mm_doc_missing')}</p>
      </div>
    );
  }

  const looksLikeImage =
    url.startsWith('data:image') || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);

  return (
    <div className="mm-doc-card">
      <h4>{title}</h4>
      <div className="mm-doc-preview">
        {looksLikeImage ? (
          <>
            {imgState === 'loading' && <p className="text-body">{t('mm_preview_loading')}</p>}
            {imgState === 'failed' ? (
              <p className="text-body">{t('mm_preview_unavailable')}</p>
            ) : (
              <img
                src={url}
                alt={t('mm_preview_alt', { title })}
                style={imgState === 'loading' ? { display: 'none' } : undefined}
                onLoad={() => setImgState('loaded')}
                onError={() => setImgState('failed')}
              />
            )}
          </>
        ) : (
          <p className="text-body"><FiFileText size={28} /> {t('mm_doc_file')}</p>
        )}
      </div>
      <div className="mm-doc-actions">
        <a
          className="btn btn-ghost btn-sm"
          href={url}
          target="_blank"
          rel="noreferrer"
        >
          <FiExternalLink size={14} /> {t('mm_open')}
        </a>
        <a className="btn btn-ghost btn-sm" href={url} download>
          <FiDownload size={14} /> {t('mm_download')}
        </a>
      </div>
    </div>
  );
};

// ── Application detail + decision workspace ───────────────
// One review decision: approving the business also issues the halal
// certificate automatically. No certificate type/evidence/confirmation
// inputs — the certificate ID is system-generated.
const MerchantDetail = ({ merchantId, onClose, onDecided }) => {
  const { t, formatDate } = useLanguage();
  const [detail, setDetail] = useState(null);
  const [state, setState] = useState('loading'); // loading | success | error
  const [action, setAction] = useState('approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedStatus, setSavedStatus] = useState('');
  const closeRef = useRef(null);

  const loadDetail = useCallback(async () => {
    setState('loading');
    try {
      const res = await adminService.getMerchantById(merchantId);
      const merchant = res.merchant || res;
      setDetail(merchant);
      setState('success');
    } catch (err) {
      setState('error');
    }
  }, [merchantId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  // Focus management + Esc to close.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const formatStatus = (s) => (MM_STATUS_KEYS[s] ? t(MM_STATUS_KEYS[s]) : String(s || ''));
  const formatType = (s) => (MM_TYPE_KEYS[s] ? t(MM_TYPE_KEYS[s]) : String(s || ''));

  const startDecision = () => {
    setFieldError('');
    setSavedStatus('');
    if (action === 'reject' && !rejectionReason.trim()) {
      setFieldError(t('mm_reject_required'));
      return;
    }
    setConfirming(true);
  };

  // UI actions map to server verification statuses.
  const targetStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action;

  const submitDecision = async () => {
    if (submitting) return; // prevent accidental duplicate submission
    setSubmitting(true);
    try {
      const payload = {
        verificationStatus: targetStatus,
        verificationNotes: reviewerNotes.trim() || undefined,
        rejectionReason: action === 'reject' ? rejectionReason.trim() : undefined,
      };
      const res = await adminService.verifyMerchant(merchantId, payload);
      const saved = res.merchant || res;
      // Merge the issued certificate so the detail view reflects the
      // single-decision outcome.
      if (res.certification && typeof res.certification === 'object') {
        saved.halalCertification = res.certification;
      }
      setDetail(saved);
      setSavedStatus(saved.verificationStatus || targetStatus);
      setConfirming(false);
      toast.success(t('mm_status_updated', { status: formatStatus(saved.verificationStatus || targetStatus) }));
      onDecided(saved);
    } catch (err) {
      toast.error(backendError(t, err, 'err_verify_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const address = detail?.businessAddress || {};
  const addressLine = [address.street, address.subcity, address.woreda, address.city, address.region]
    .filter(Boolean)
    .join(', ');
  const cert = detail?.halalCertification && typeof detail.halalCertification === 'object'
    ? detail.halalCertification
    : null;

  return (
    <div className="mm-backdrop" onClick={() => { if (!submitting) onClose(); }}>
      <div
        className="mm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mm-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mm-modal-header">
          <div>
            <h2 id="mm-detail-title">{t('mm_detail_title')}</h2>
            {detail && (
              <div className="mm-row-title">
                <span className={`mm-badge mm-badge-${detail.verificationStatus}`}>
                  {formatStatus(detail.verificationStatus)}
                </span>
                <span className={`mm-badge ${detail.isActive ? 'mm-badge-active' : 'mm-badge-inactive'}`}>
                  {detail.isActive ? t('cc_active_account') : t('cc_inactive_account')}
                </span>
              </div>
            )}
          </div>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <FiX size={16} /> {t('cc_close')}
          </button>
        </div>

        <div className="mm-modal-body">
          {state === 'loading' && <p className="text-body" data-testid="detail-loading">{t('mm_detail_loading')}</p>}
          {state === 'error' && (
            <div data-testid="detail-error">
              <p className="text-body">{t('mm_detail_error')}</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={loadDetail}>
                {t('ord_retry')}
              </button>
            </div>
          )}

          {state === 'success' && detail && (
            <>
              <div className="mm-detail-grid">
                <div className="mm-detail-card">
                  <h3>{t('mm_biz')}</h3>
                  <dl>
                    <dt>{t('mm_name')}</dt><dd>{detail.businessName}</dd>
                    <dt>{t('mm_type')}</dt><dd style={{ textTransform: 'capitalize' }}>{formatType(detail.businessType)}</dd>
                    <dt>{t('mm_address')}</dt><dd>{addressLine || t('cc_not_provided')}</dd>
                    <dt>{t('mm_website')}</dt><dd>{detail.website || '—'}</dd>
                    <dt>{t('mm_applied')}</dt><dd>{detail.createdAt ? formatDate(detail.createdAt) : '—'}</dd>
                  </dl>
                </div>
                <div className="mm-detail-card">
                  <h3>{t('mm_contacts')}</h3>
                  <dl>
                    <dt>{t('mm_owner')}</dt>
                    <dd>{`${detail.user?.firstName || ''} ${detail.user?.lastName || ''}`.trim() || '—'}</dd>
                    <dt>{t('mm_owner_email')}</dt><dd>{detail.user?.email || '—'}</dd>
                    <dt>{t('mm_owner_phone')}</dt><dd>{detail.user?.phone || '—'}</dd>
                    <dt>{t('mm_biz_email')}</dt><dd>{detail.businessEmail || '—'}</dd>
                    <dt>{t('mm_biz_phone')}</dt><dd>{detail.businessPhone || '—'}</dd>
                  </dl>
                </div>
                <div className="mm-detail-card full">
                  <h3>{t('mm_submitted_notes')}</h3>
                  <p className="text-body">{detail.description || t('mm_no_description')}</p>
                  {detail.applicationNotes && (
                    <p className="text-body"><strong>{t('mm_applicant_note')}</strong> {detail.applicationNotes}</p>
                  )}
                </div>
                <div className="mm-detail-card full">
                  <h3>{t('mm_review_history')}</h3>
                  <dl>
                    <dt>{t('mm_reviewer_notes')}</dt><dd>{detail.verificationNotes || '—'}</dd>
                    <dt>{t('mm_rejection_reason')}</dt><dd>{detail.rejectionReason || '—'}</dd>
                    <dt>{t('mm_reviewed_by')}</dt>
                    <dd>
                      {detail.verifiedBy
                        ? `${detail.verifiedBy.firstName || ''} ${detail.verifiedBy.lastName || ''}`.trim()
                        : '—'}
                    </dd>
                    <dt>{t('mm_verified_at')}</dt>
                    <dd>{detail.verifiedAt ? formatDate(detail.verifiedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</dd>
                  </dl>
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: '8px' }}>{t('mm_documents')}</h3>
                <div className="mm-docs">
                  <DocumentCard title={t('mm_doc_license')} doc={detail.governmentLicense} />
                  <DocumentCard title={t('mm_doc_id')} doc={detail.nationalId} />
                </div>
              </div>

              <div>
                <h3 style={{ marginBottom: '8px' }}>{t('mm_cert')}</h3>
                {cert && cert.certificateNumber ? (
                  <div className="mm-detail-card full" data-testid="cert-application">
                    <dl>
                      <dt>{t('mm_cert_status')}</dt>
                      <dd style={{ textTransform: 'capitalize' }}>
                        {formatStatus(cert.status)}
                        {` (${cert.certificateNumber})`}
                      </dd>
                      <dt>{t('appst_issuer')}</dt><dd>{cert.issuingAuthority || '—'}</dd>
                      <dt>{t('appst_issued')}</dt><dd>{cert.issueDate ? formatDate(cert.issueDate) : '—'}</dd>
                      <dt>{t('appst_valid_until')}</dt><dd>{cert.expiryDate ? formatDate(cert.expiryDate) : '—'}</dd>
                    </dl>
                  </div>
                ) : (
                  <p className="text-body" data-testid="cert-no-evidence">{t('mm_no_cert')}</p>
                )}
              </div>

              <div className="mm-cert-note">
                <FiShield size={14} style={{ marginRight: 4 }} />
                {t('mm_cert_note')}
              </div>

              <div className="mm-decision">
                <h3>{t('mm_decision')}</h3>
                {savedStatus && (
                  <p className="mm-success" data-testid="decision-saved">
                    {t('mm_saved', { status: formatStatus(savedStatus) })}
                  </p>
                )}
                <div className="mm-decision-row" role="group" aria-label={t('mm_decision')}>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={submitting}
                    onClick={() => { setAction('approve'); setConfirming(false); setFieldError(''); }}
                  >
                    {t('mej_approve')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--error)' }}
                    disabled={submitting}
                    onClick={() => { setAction('reject'); setConfirming(false); setFieldError(''); }}
                  >
                    {t('mej_reject')}
                  </button>
                  <select
                    className="mm-select"
                    style={{ maxWidth: 220 }}
                    aria-label={t('mm_other_status')}
                    value={['approve', 'reject'].includes(action) ? '' : action}
                    disabled={submitting}
                    onChange={(e) => { if (e.target.value) { setAction(e.target.value); setConfirming(false); setFieldError(''); } }}
                  >
                    <option value="">{t('mm_other_status')}</option>
                    <option value="under_review">{t('mm_mark_review')}</option>
                    <option value="suspended">{t('mm_suspend')}</option>
                    <option value="pending">{t('mm_reopen')}</option>
                  </select>
                </div>

                <label htmlFor="mm-reviewer-notes">{t('mm_notes_label')}</label>
                <textarea
                  id="mm-reviewer-notes"
                  className="mm-textarea"
                  placeholder={t('mm_notes_ph')}
                  value={reviewerNotes}
                  disabled={submitting}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                />
                {action === 'reject' && (
                  <>
                    <label htmlFor="mm-rejection-reason">{t('mm_reject_label')}</label>
                    <textarea
                      id="mm-rejection-reason"
                      className="mm-textarea"
                      placeholder={t('mm_reject_ph')}
                      value={rejectionReason}
                      disabled={submitting}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </>
                )}
                {fieldError && <p className="mm-field-error">{fieldError}</p>}
                {!confirming ? (
                  <div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={submitting}
                      onClick={startDecision}
                    >
                      {submitting ? t('cc_saving') : t('mm_continue_to', { status: formatStatus(targetStatus) })}
                    </button>
                  </div>
                ) : (
                  <div className="mm-confirm" data-testid="decision-confirm">
                    <p>
                      {t('mm_confirm_sentence', { name: detail.businessName, status: formatStatus(targetStatus) })}
                      {action === 'reject' && <> {t('mm_reason', { reason: rejectionReason.trim() })}</>}
                      {targetStatus === 'approved' && (
                        <span data-testid="decision-cert-summary"> {t('mm_cert_auto')}</span>
                      )}
                    </p>
                    <div className="mm-decision-row">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={submitting}
                        onClick={submitDecision}
                      >
                        {submitting ? t('cc_saving') : t('cc_confirm')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={submitting}
                        onClick={() => setConfirming(false)}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Merchants Management workspace ────────────────────────
const AdminMerchants = () => {
  const [searchParams] = useSearchParams();
  // Deep review route: /admin/merchants/:id opens the application
  // detail workspace directly (used by the admin dashboard queue).
  const { id: routeMerchantId } = useParams();
  const navigate = useNavigate();
  const initialStatus = VERIFICATION_STATES.includes(searchParams.get('status'))
    ? searchParams.get('status')
    : 'all';

  const [merchants, setMerchants] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterVerification, setFilterVerification] = useState(initialStatus);
  const [filterActivity, setFilterActivity] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedId, setSelectedId] = useState(routeMerchantId || null);
  const [confirmToggleId, setConfirmToggleId] = useState(null);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const { t, formatDate } = useLanguage();

  const loadMerchants = useCallback(async (page) => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE, sort: sortBy };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterVerification !== 'all') params.verificationStatus = filterVerification;
      if (filterActivity !== 'all') params.isActive = filterActivity === 'active' ? 'true' : 'false';
      const res = await adminService.getAllMerchants(params);
      setMerchants(res.merchants || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 0);
      if (res.statusCounts) setStatusCounts(res.statusCounts);
    } catch (err) {
      setError(backendError(t, err, 'err_load_merchants'));
      setMerchants([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterVerification, filterActivity, sortBy, t]);

  useEffect(() => {
    loadMerchants(currentPage);
  }, [loadMerchants, currentPage]);

  const handleDecided = useCallback(() => {
    // Reload the list so rows, ordering, and status counts reflect the
    // server-confirmed state (a decision can move the row out of the
    // current filter).
    loadMerchants(currentPage);
  }, [loadMerchants, currentPage]);

  const requestToggle = (merchantId) => {
    setConfirmToggleId((cur) => (cur === merchantId ? null : merchantId));
  };

  const formatRowStatus = (s) => (MM_STATUS_KEYS[s] ? t(MM_STATUS_KEYS[s]) : String(s || ''));

  const handleToggleStatus = async (merchant) => {
    const userId = ownerUserId(merchant);
    if (!userId) {
      toast.error(t('mm_no_owner'));
      return;
    }
    setToggling(merchant._id);
    try {
      await adminService.toggleUserStatus(userId);
      setMerchants((prev) => prev.map((m) =>
        m._id === merchant._id ? { ...m, isActive: !m.isActive } : m
      ));
      setConfirmToggleId(null);
      toast.success(t(merchant.isActive ? 'mm_deactivated' : 'mm_activated'));
    } catch (err) {
      toast.error(backendError(t, err, 'err_account_access_failed'));
    } finally {
      setToggling(null);
    }
  };

  const stats = [
    { label: t('mm_stat_total'), value: statusCounts ? total : '…', state: null },
    { label: t('mm_stat_pending'), value: statusCounts?.pending ?? '…', state: 'pending' },
    { label: t('mm_stat_review'), value: statusCounts?.under_review ?? '…', state: 'under_review' },
    { label: t('mm_stat_approved'), value: statusCounts?.approved ?? '…', state: 'approved' },
    { label: t('mm_stat_rejected'), value: statusCounts?.rejected ?? '…', state: 'rejected' },
    { label: t('mm_stat_suspended'), value: statusCounts?.suspended ?? '…', state: 'suspended' },
  ];

  const pageWindow = [];
  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p += 1) {
    pageWindow.push(p);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">{t('mm_title')}</h1>
          <p className="text-body">
            {t('mm_desc')}
          </p>
        </div>
      </div>

      <div className="dashboard-stats" data-testid="merchant-status-counts">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-info">
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <div className="mm-toolbar" role="search">
          <div className="mm-search-wrap">
            <FiSearch className="mm-search-icon" />
            <input
              type="text"
              className="mm-input"
              placeholder={t('mm_search_ph')}
              aria-label={t('mm_search_label')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="mm-select"
            aria-label={t('mm_filter_verification')}
            value={filterVerification}
            onChange={(e) => { setFilterVerification(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">{t('mm_filter_all')}</option>
            {VERIFICATION_STATES.map((s) => (
              <option key={s} value={s}>{formatRowStatus(s)}</option>
            ))}
          </select>
          <select
            className="mm-select"
            aria-label={t('mm_filter_activity')}
            value={filterActivity}
            onChange={(e) => { setFilterActivity(e.target.value); setCurrentPage(1); }}
          >
            <option value="all">{t('mm_act_all')}</option>
            <option value="active">{t('mm_act_active')}</option>
            <option value="inactive">{t('mm_act_inactive')}</option>
          </select>
          <select
            className="mm-select"
            aria-label={t('mm_sort_label')}
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
          >
            <option value="newest">{t('cc_sort_newest')}</option>
            <option value="oldest">{t('cc_sort_oldest')}</option>
            <option value="name">{t('cc_sort_name')}</option>
          </select>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => loadMerchants(currentPage)}
          >
            {t('cc_refresh')}
          </button>
        </div>

        {loading ? (
          <div className="mm-state" data-testid="merchants-loading">
            <FiClock size={24} />
            <p>{t('mm_loading')}</p>
          </div>
        ) : error ? (
          <div className="mm-state" data-testid="merchants-error">
            <FiAlertCircle size={24} />
            <h3>{t('mm_error')}</h3>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              data-testid="retry-merchants"
              onClick={() => loadMerchants(currentPage)}
            >
              {t('ord_retry')}
            </button>
          </div>
        ) : merchants.length === 0 ? (
          <div className="mm-state" data-testid="merchants-empty">
            <FiShoppingBag size={32} />
            <h3>{t('mm_empty')}</h3>
            <p>{t('mm_empty_desc')}</p>
          </div>
        ) : (
          <>
            <p className="mm-result-count" aria-live="polite">
              {t('mm_showing', { shown: merchants.length, total, page: currentPage, pages: totalPages })}
            </p>
            <div className="mm-list">
              {merchants.map((merchant) => (
                <div key={merchant._id} className="mm-row">
                  <div className="mm-row-main">
                    <div className="mm-row-title">
                      <h4>{merchant.businessName}</h4>
                      <span className={`mm-badge mm-badge-${merchant.verificationStatus}`}>
                        {formatRowStatus(merchant.verificationStatus)}
                      </span>
                      <span className={`mm-badge ${merchant.isActive ? 'mm-badge-active' : 'mm-badge-inactive'}`}>
                        {merchant.isActive ? t('cc_active') : t('cc_inactive')}
                      </span>
                    </div>
                    <div className="mm-row-meta">
                      <span><FiMail size={13} /> {merchant.businessEmail || merchant.user?.email || t('cc_not_provided')}</span>
                      <span><FiPhone size={13} /> {merchant.businessPhone || merchant.user?.phone || t('cc_not_provided')}</span>
                      <span><FiMapPin size={13} /> {merchant.businessAddress?.city || t('cc_not_provided')}</span>
                      <span><FiCalendar size={13} /> {merchant.createdAt ? formatDate(merchant.createdAt) : '—'}</span>
                    </div>
                  </div>
                  <div className="mm-row-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setSelectedId(merchant._id)}
                    >
                      <FiFileText size={14} /> {t('mm_review')}
                    </button>
                    {confirmToggleId === merchant._id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--error)' }}
                          disabled={toggling === merchant._id}
                          onClick={() => handleToggleStatus(merchant)}
                        >
                          {toggling === merchant._id ? t('cc_saving') : (merchant.isActive ? t('mm_confirm_deactivate') : t('mm_confirm_activate'))}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={toggling === merchant._id}
                          onClick={() => setConfirmToggleId(null)}
                        >
                          {t('cancel')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title={merchant.isActive ? t('mm_deactivate') : t('mm_activate')}
                        onClick={() => requestToggle(merchant._id)}
                      >
                        <FiPower size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="mm-pagination" aria-label={t('mm_pages')}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  {t('cc_prev')}
                </button>
                {pageWindow.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn-sm ${p === currentPage ? 'btn-primary' : 'btn-ghost'}`}
                    aria-current={p === currentPage ? 'page' : undefined}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  {t('cc_next')}
                </button>
              </nav>
            )}
          </>
        )}
      </div>

      {selectedId && (
        <MerchantDetail
          merchantId={selectedId}
          onClose={() => {
            setSelectedId(null);
            // Leave the deep route when its detail workspace closes.
            if (routeMerchantId) navigate('/admin/merchants');
          }}
          onDecided={handleDecided}
        />
      )}
    </div>
  );
};

export default AdminMerchants;
