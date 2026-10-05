import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiSearch, FiAlertCircle, FiCheckCircle, FiPower, FiMail, FiPhone,
  FiCalendar, FiUsers, FiClock, FiX, FiEye, FiGlobe, FiShoppingBag,
} from 'react-icons/fi';
import adminService from '../../services/adminService';
import { hasGenuinePendingRequest } from '../../utils/profileUpdates';
import { useLanguage } from '../../i18n/LanguageContext';
import { backendError } from '../../utils/backendErrors';
import { toast } from 'react-hot-toast';
import './Dashboard.css';
import './AdminMerchants.css';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: 'all', key: 'cc_filter_all' },
  { value: 'active', key: 'cc_filter_active' },
  { value: 'inactive', key: 'cc_filter_inactive' },
];
const SORT_OPTIONS = [
  { value: 'newest', key: 'cc_sort_newest' },
  { value: 'oldest', key: 'cc_sort_oldest' },
  { value: 'name', key: 'cc_sort_name' },
  { value: 'email', key: 'cc_sort_email' },
];

const ORDER_STATUS_KEYS = {
  pending: 'ord_st_pending',
  confirmed: 'ord_st_confirmed',
  processing: 'ord_st_processing',
  shipped: 'ord_st_shipped',
  out_for_delivery: 'ord_st_out_for_delivery',
  delivered: 'ord_st_delivered',
  return_requested: 'ord_st_return_requested',
  returned: 'ord_st_returned',
  refunded: 'ord_st_refunded',
  cancelled: 'ord_st_cancelled',
};

const fullName = (c, unnamed) => `${c?.firstName || ''} ${c?.lastName || ''}`.trim() || unnamed;

// ── Customer detail workspace ────────────────────────────
// Follows the merchant-detail interaction pattern: modal dialog with
// focus management + Esc to close, loading/error/retry states, detail
// grid, and a confirm step for activation changes. All data comes from
// the admin-authorized detail endpoint; the row updates from the
// server-returned user record (never optimistic).
const ConsumerDetail = ({ consumerId, onClose, onStatusChanged }) => {
  const { t, formatDate, formatETB } = useLanguage();
  const [detail, setDetail] = useState(null);
  const [orderSummary, setOrderSummary] = useState(null);
  const [state, setState] = useState('loading'); // loading | success | error
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const closeRef = useRef(null);

  const loadDetail = useCallback(async () => {
    setState('loading');
    try {
      const res = await adminService.getConsumerById(consumerId);
      setDetail(res.user || res);
      setOrderSummary(res.orderSummary || null);
      setState('success');
    } catch (err) {
      setState('error');
    }
  }, [consumerId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, submitting]);

  const submitToggle = async () => {
    if (submitting || !detail) return;
    setSubmitting(true);
    try {
      const res = await adminService.toggleUserStatus(detail._id);
      const saved = res.user || res;
      setDetail(saved);
      setConfirming(false);
      toast.success(t(saved.isActive ? 'cc_reactivated' : 'cc_deactivated', { name: fullName(saved, t('cc_unnamed')) }));
      onStatusChanged(saved);
    } catch (err) {
      toast.error(backendError(t, err, 'err_customer_status_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const hasPending = hasGenuinePendingRequest(detail);

  return (
    <div className="mm-backdrop" onClick={() => { if (!submitting) onClose(); }}>
      <div
        className="mm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cc-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mm-modal-header">
          <div>
            <h2 id="cc-detail-title">{t('cc_detail_title')}</h2>
            {detail && (
              <div className="mm-row-title">
                <span className={`mm-badge ${detail.isActive ? 'mm-badge-active' : 'mm-badge-inactive'}`}>
                  {detail.isActive ? t('cc_active_account') : t('cc_inactive_account')}
                </span>
                {detail.isEmailVerified && (
                  <span className="mm-badge mm-badge-approved">{t('cc_email_verified')}</span>
                )}
                {hasPending && (
                  <span className="mm-badge mm-badge-pending">{t('cc_pending_profile')}</span>
                )}
              </div>
            )}
          </div>
          <button ref={closeRef} type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
            <FiX size={16} /> {t('cc_close')}
          </button>
        </div>

        <div className="mm-modal-body">
          {state === 'loading' && <p className="text-body" data-testid="consumer-detail-loading">{t('cc_detail_loading')}</p>}
          {state === 'error' && (
            <div data-testid="consumer-detail-error">
              <p className="text-body">{t('cc_detail_error')}</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={loadDetail}>
                {t('ord_retry')}
              </button>
            </div>
          )}

          {state === 'success' && detail && (
            <>
              <div className="mm-detail-grid">
                <div className="mm-detail-card">
                  <h3>{t('cc_identity')}</h3>
                  <dl>
                    <dt>{t('cc_name')}</dt><dd>{fullName(detail, t('cc_unnamed'))}</dd>
                    <dt>{t('cc_joined')}</dt><dd>{detail.createdAt ? formatDate(detail.createdAt) : '—'}</dd>
                    <dt>{t('cc_last_login')}</dt><dd>{detail.lastLogin ? formatDate(detail.lastLogin, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</dd>
                    <dt>{t('cc_lang')}</dt><dd>{detail.preferredLanguage || 'en'}</dd>
                  </dl>
                </div>
                <div className="mm-detail-card">
                  <h3>{t('cc_contact')}</h3>
                  <dl>
                    <dt>{t('cc_email')}</dt><dd>{detail.email || '—'}</dd>
                    <dt>{t('cc_phone')}</dt><dd>{detail.phone || '—'}</dd>
                    <dt>{t('cc_email_verified_label')}</dt><dd>{detail.isEmailVerified ? t('cc_yes') : t('cc_no')}</dd>
                    <dt>{t('cc_account_active')}</dt><dd>{detail.isActive ? t('cc_yes') : t('cc_no')}</dd>
                  </dl>
                </div>
                <div className="mm-detail-card full">
                  <h3>{t('cc_pending_changes')}</h3>
                  {hasPending ? (
                    <dl>
                      {detail.pendingProfileUpdate.firstName && (<><dt>{t('cc_first')}</dt><dd>{detail.pendingProfileUpdate.firstName}</dd></>)}
                      {detail.pendingProfileUpdate.lastName && (<><dt>{t('cc_last')}</dt><dd>{detail.pendingProfileUpdate.lastName}</dd></>)}
                      {detail.pendingProfileUpdate.email && (<><dt>{t('cc_email')}</dt><dd>{detail.pendingProfileUpdate.email}</dd></>)}
                      {detail.pendingProfileUpdate.phone && (<><dt>{t('cc_phone')}</dt><dd>{detail.pendingProfileUpdate.phone}</dd></>)}
                      <dt>{t('cc_requested')}</dt><dd>{detail.pendingProfileUpdate.requestedAt ? formatDate(detail.pendingProfileUpdate.requestedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</dd>
                    </dl>
                  ) : (
                    <p className="text-body">{t('cc_no_changes')}</p>
                  )}
                </div>
                <div className="mm-detail-card full">
                  <h3>{t('cc_orders')}</h3>
                  {orderSummary ? (
                    <dl>
                      <dt>{t('cc_total_orders')}</dt><dd>{orderSummary.totalOrders ?? 0}</dd>
                      <dt>{t('cc_total_spent')}</dt><dd>{formatETB(orderSummary.totalSpent || 0)}</dd>
                    </dl>
                  ) : (
                    <p className="text-body">{t('cc_no_summary')}</p>
                  )}
                  {orderSummary?.recentOrders?.length > 0 && (
                    <ul style={{ margin: '12px 0 0', paddingLeft: '18px', fontSize: '0.875rem' }}>
                      {orderSummary.recentOrders.map((o) => (
                        <li key={o._id}>
                          {o.orderNumber || String(o._id).slice(-8).toUpperCase()} — {t(ORDER_STATUS_KEYS[o.status] || 'ord_unknown')} — {formatETB(o.totalPrice || 0)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="mm-decision">
                <h3>{detail.isActive ? t('cc_deactivate') : t('cc_reactivate')}</h3>
                {!confirming ? (
                  <div>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={submitting}
                      onClick={() => setConfirming(true)}
                    >
                      {detail.isActive ? t('cc_continue_deactivate') : t('cc_continue_reactivate')}
                    </button>
                  </div>
                ) : (
                  <div className="mm-confirm" data-testid="consumer-status-confirm">
                    <p>
                      {t('cc_confirm_sentence', {
                        action: detail.isActive ? t('cc_verb_deactivate') : t('cc_verb_reactivate'),
                        name: fullName(detail, t('cc_unnamed')),
                        email: detail.email,
                      })}{' '}
                      {!detail.isActive ? t('cc_reactivate_note') : t('cc_deactivate_note')}
                    </p>
                    <div className="mm-decision-row">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={submitting}
                        onClick={submitToggle}
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

// ── Customers Management workspace ───────────────────────
const AdminConsumers = () => {
  const { t, formatDate, formatETB } = useLanguage();
  const [consumers, setConsumers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedId, setSelectedId] = useState(null);
  const [confirmToggleId, setConfirmToggleId] = useState(null);
  const [toggling, setToggling] = useState(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadConsumers = useCallback(async (page) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE, sort: sortBy };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStatus !== 'all') params.status = filterStatus;
      const res = await adminService.getConsumers(params);
      if (requestRef.current !== requestId) return; // stale: a newer request won
      setConsumers(res.users || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 0);
      if (res.stats) setStats(res.stats);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setError(backendError(t, err, 'err_load_customers'));
      setConsumers([]);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [debouncedSearch, filterStatus, sortBy, t]);

  useEffect(() => {
    loadConsumers(currentPage);
  }, [loadConsumers, currentPage]);

  const applyServerUser = useCallback((saved) => {
    setConsumers((prev) => prev.map((c) => (c._id === saved._id ? saved : c)));
    // Keep header counts consistent without a full reload.
    setStats((prev) => {
      if (!prev) return prev;
      const wasActive = consumers.find((c) => c._id === saved._id)?.isActive;
      if (wasActive === undefined || wasActive === saved.isActive) return prev;
      return {
        ...prev,
        active: prev.active + (saved.isActive ? 1 : -1),
        inactive: prev.inactive + (saved.isActive ? -1 : 1),
      };
    });
  }, [consumers]);

  const requestToggle = (consumerId) => {
    setConfirmToggleId((cur) => (cur === consumerId ? null : consumerId));
  };

  const handleToggleStatus = async (consumer) => {
    if (toggling) return; // prevent duplicate submissions
    setToggling(consumer._id);
    try {
      const res = await adminService.toggleUserStatus(consumer._id);
      const saved = res.user || res;
      applyServerUser(saved);
      setConfirmToggleId(null);
      toast.success(t(saved.isActive ? 'cc_reactivated' : 'cc_deactivated', { name: fullName(saved, t('cc_unnamed')) }));
    } catch (err) {
      toast.error(backendError(t, err, 'err_customer_status_failed'));
    } finally {
      setToggling(null);
    }
  };

  const pageWindow = [];
  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p += 1) {
    pageWindow.push(p);
  }

  const statCards = [
    { label: t('cc_stat_total'), value: stats?.total ?? (loading ? '…' : total), icon: <FiUsers size={24} />, color: '#3498db' },
    { label: t('cc_stat_active'), value: stats?.active ?? '…', icon: <FiCheckCircle size={24} />, color: '#27ae60' },
    { label: t('cc_stat_inactive'), value: stats?.inactive ?? '…', icon: <FiX size={24} />, color: '#e74343' },
    { label: t('cc_stat_pending'), value: stats?.pendingUpdates ?? '…', icon: <FiClock size={24} />, color: '#f39c12' },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">{t('cc_title')}</h1>
          <p className="text-body">
            {t('cc_desc')}
          </p>
        </div>
      </div>

      <div className="dashboard-stats">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}15`, color: s.color }}>
              {s.icon}
            </div>
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
              placeholder={t('cc_search_ph')}
              aria-label={t('cc_search_label')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="mm-select"
            aria-label={t('cc_filter_label')}
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.key)}</option>
            ))}
          </select>
          <select
            className="mm-select"
            aria-label={t('cc_sort_label')}
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{t(o.key)}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => loadConsumers(currentPage)}
          >
            {t('cc_refresh')}
          </button>
        </div>

        {loading ? (
          <div className="mm-state" data-testid="consumers-loading" aria-busy="true">
            <FiClock size={24} />
            <p>{t('cc_loading')}</p>
          </div>
        ) : error ? (
          <div className="mm-state" data-testid="consumers-error">
            <FiAlertCircle size={24} />
            <h3>{t('cc_error')}</h3>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              data-testid="retry-consumers"
              onClick={() => loadConsumers(currentPage)}
            >
              {t('ord_retry')}
            </button>
          </div>
        ) : consumers.length === 0 ? (
          <div className="mm-state" data-testid="consumers-empty">
            <FiUsers size={32} />
            <h3>{t('cc_empty')}</h3>
            <p>{t('cc_empty_desc')}</p>
          </div>
        ) : (
          <>
            <p className="mm-result-count" aria-live="polite">
              {t('cc_showing', { shown: consumers.length, total, page: currentPage, pages: Math.max(totalPages, 1) })}
            </p>
            <div className="mm-list">
              {consumers.map((consumer) => (
                <div key={consumer._id} className="mm-row">
                  <div className="mm-row-main">
                    <div className="mm-row-title">
                      <h4>{fullName(consumer, t('cc_unnamed'))}</h4>
                      <span className={`mm-badge ${consumer.isActive ? 'mm-badge-active' : 'mm-badge-inactive'}`}>
                        {consumer.isActive ? t('cc_active') : t('cc_inactive')}
                      </span>
                      {hasGenuinePendingRequest(consumer) && (
                        <span className="mm-badge mm-badge-pending">{t('cc_pending_badge')}</span>
                      )}
                    </div>
                    <div className="mm-row-meta">
                      <span><FiMail size={13} /> {consumer.email || t('cc_not_provided')}</span>
                      <span><FiPhone size={13} /> {consumer.phone || t('cc_not_provided')}</span>
                      <span><FiGlobe size={13} /> {(consumer.preferredLanguage || 'en').toUpperCase()}</span>
                      <span><FiCalendar size={13} /> {consumer.createdAt ? formatDate(consumer.createdAt) : '—'}</span>
                    </div>
                  </div>
                  <div className="mm-row-actions">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => setSelectedId(consumer._id)}
                    >
                      <FiEye size={14} /> {t('cc_view')}
                    </button>
                    {confirmToggleId === consumer._id ? (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--error)' }}
                          disabled={toggling === consumer._id}
                          onClick={() => handleToggleStatus(consumer)}
                        >
                          {toggling === consumer._id ? t('cc_saving') : (consumer.isActive ? t('cc_confirm_deactivate') : t('cc_confirm_activate'))}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={toggling === consumer._id}
                          onClick={() => setConfirmToggleId(null)}
                        >
                          {t('cancel')}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        title={consumer.isActive ? t('cc_confirm_deactivate') : t('cc_confirm_activate')}
                        aria-label={consumer.isActive ? t('cc_confirm_deactivate') : t('cc_confirm_activate')}
                        onClick={() => requestToggle(consumer._id)}
                      >
                        <FiPower size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="mm-pagination" aria-label="Customers pages">
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
        <ConsumerDetail
          consumerId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChanged={applyServerUser}
        />
      )}

      <div className="dashboard-section" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <FiShoppingBag size={16} />
        <p className="text-body" style={{ margin: 0 }}>
          {t('cc_orders_hint_a')} <a href="/orders">{t('cc_orders')}</a> {t('cc_orders_hint_b')}
        </p>
      </div>
    </div>
  );
};

export default AdminConsumers;
