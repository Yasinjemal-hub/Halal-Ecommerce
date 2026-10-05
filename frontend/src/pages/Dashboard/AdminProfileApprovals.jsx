import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiCheckCircle, FiX, FiAlertCircle, FiMail, FiClock, FiRefreshCw, FiUser } from 'react-icons/fi';
import adminService from '../../services/adminService';
import { getChangedFields } from '../../utils/profileUpdates';
import { useLanguage } from '../../i18n/LanguageContext';
import { backendError } from '../../utils/backendErrors';
import { toast } from 'react-hot-toast';
import './Dashboard.css';
import './AdminMerchants.css';

const PAGE_SIZE = 10;

const FIELD_KEYS = {
  firstName: 'pa_field_first',
  lastName: 'pa_field_last',
  email: 'pa_field_email',
  phone: 'pa_field_phone',
};

const ROLE_KEYS = {
  consumer: 'auth_consumer',
  merchant: 'auth_merchant',
  admin: 'pa_role_admin',
  superadmin: 'pa_role_superadmin',
};

const AdminProfileApprovals = () => {
  const { t, formatDate } = useLanguage();
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { userId, action } | null
  const [reviewNotes, setReviewNotes] = useState({});
  const requestRef = useRef(0);

  const fullName = (user) => `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || t('pa_unnamed');
  const fieldLabel = (field) => (FIELD_KEYS[field] ? t(FIELD_KEYS[field]) : String(field || ''));
  const roleLabel = (role) => (ROLE_KEYS[role] ? t(ROLE_KEYS[role]) : String(role || ''));

  const loadQueue = useCallback(async (page) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getPendingProfileUpdates({ page, limit: PAGE_SIZE });
      if (requestRef.current !== requestId) return; // stale response
      setRequests(res.users || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 0);
    } catch (err) {
      if (requestRef.current !== requestId) return;
      setError(backendError(t, err, 'err_load_approvals'));
      setRequests([]);
    } finally {
      if (requestRef.current === requestId) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadQueue(currentPage);
  }, [loadQueue, currentPage]);

  const handleDecide = async (user, action) => {
    if (processing) return; // prevent duplicate submissions
    setProcessing(user._id);
    try {
      await adminService.approveUserProfileUpdate(user._id, {
        action,
        reviewNotes: (reviewNotes[user._id] || '').trim(),
        expectedRequestedAt: user.pendingProfileUpdate?.requestedAt,
      });
      setReviewNotes((prev) => {
        const updated = { ...prev };
        delete updated[user._id];
        return updated;
      });
      setConfirm(null);
      toast.success(t(action === 'approved' ? 'pa_approved_toast' : 'pa_rejected_toast'));
      // Reload from the server so the queue only changes on confirmed
      // success (a decision can also resolve other records).
      await loadQueue(currentPage);
    } catch (err) {
      const status = err.response?.status;
      const message = backendError(t, err, action === 'approved' ? 'pa_err_approve' : 'pa_err_reject');
      if (status === 409) {
        // Stale: the request changed (resubmitted or already decided).
        toast.error(message);
        await loadQueue(currentPage);
      } else {
        // Record stays in the queue; the error is shown without a false
        // success and the reviewer can retry.
        toast.error(message);
      }
    } finally {
      setProcessing(null);
    }
  };

  const pageWindow = [];
  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p += 1) {
    pageWindow.push(p);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">{t('pa_title')}</h1>
          <p className="text-body">
            {t('pa_desc')}
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => loadQueue(currentPage)} disabled={loading}>
          <FiRefreshCw size={14} /> {t('cc_refresh')}
        </button>
      </div>

      {/* Stats */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f39c1215', color: '#f39c12' }}>
            <FiClock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{loading ? '…' : total}</span>
            <span className="stat-label">{t('pa_stat_pending')}</span>
          </div>
        </div>
      </div>

      {/* Queue */}
      <div className="dashboard-section">
        {loading ? (
          <div className="mm-state" data-testid="approvals-loading" aria-busy="true">
            <FiClock size={24} />
            <p>{t('pa_loading')}</p>
          </div>
        ) : error ? (
          <div className="mm-state" data-testid="approvals-error">
            <FiAlertCircle size={24} />
            <h3>{t('pa_error')}</h3>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              data-testid="retry-approvals"
              onClick={() => loadQueue(currentPage)}
            >
              {t('ord_retry')}
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="mm-state" data-testid="approvals-empty">
            <FiCheckCircle size={32} />
            <h3>{t('pa_empty')}</h3>
            <p>{t('pa_empty_desc')}</p>
          </div>
        ) : (
          <>
            <p className="mm-result-count" aria-live="polite">
              {t('pa_showing', { shown: requests.length, total, page: currentPage, pages: Math.max(totalPages, 1) })}
            </p>
            <div className="mm-list">
              {requests.map((user) => {
                const changedFields = getChangedFields(user);
                const isProcessing = processing === user._id;
                const confirming = confirm?.userId === user._id ? confirm.action : null;
                return (
                  <div key={user._id} className="mm-detail-card full" data-testid="approval-card" style={{ marginBottom: 'var(--space-4)' }}>
                    <div className="mm-row-title">
                      <h4>{fullName(user)}</h4>
                      <span className="mm-badge mm-badge-pending">{t('pa_pending_badge')}</span>
                      <span className={`mm-badge ${user.isActive ? 'mm-badge-active' : 'mm-badge-inactive'}`}>
                        {roleLabel(user.role || 'consumer')}
                      </span>
                    </div>
                    <div className="mm-row-meta" style={{ marginBottom: 'var(--space-3)' }}>
                      <span><FiMail size={13} /> {user.email || t('cc_not_provided')}</span>
                      <span><FiUser size={13} /> {user.phone || t('pa_no_phone')}</span>
                      <span>
                        <FiClock size={13} />{' '}
                        {user.pendingProfileUpdate?.requestedAt
                          ? t('pa_requested', { date: formatDate(user.pendingProfileUpdate.requestedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })
                          : t('pa_date_unknown')}
                      </span>
                    </div>

                    {changedFields.length === 0 ? (
                      <p className="mm-field-error" data-testid="approval-no-changes">
                        {t('pa_no_changes')}
                      </p>
                    ) : (
                      <div className="mm-detail-grid">
                        {changedFields.map(({ field, current, requested }) => (
                          <div key={field} className="mm-detail-card" data-testid={`approval-field-${field}`}>
                            <h3>{fieldLabel(field)}</h3>
                            <dl>
                              <dt>{t('pa_current')}</dt>
                              <dd>{String(current) === '' ? '—' : String(current)}</dd>
                              <dt>{t('pa_requested_label')}</dt>
                              <dd>{String(requested)}</dd>
                            </dl>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: 'var(--space-4)' }}>
                      <label className="input-label" htmlFor={`notes-${user._id}`}>
                        {t('pa_notes_label')}
                      </label>
                      <textarea
                        id={`notes-${user._id}`}
                        className="mm-textarea"
                        value={reviewNotes[user._id] || ''}
                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [user._id]: e.target.value }))}
                        placeholder={t('pa_notes_ph')}
                        disabled={isProcessing}
                      />
                    </div>

                    {!confirming ? (
                      <div className="mm-decision-row" style={{ marginTop: 'var(--space-3)' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={isProcessing || changedFields.length === 0}
                          onClick={() => setConfirm({ userId: user._id, action: 'approved' })}
                        >
                          <FiCheckCircle size={14} /> {t('mej_approve')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--error)' }}
                          disabled={isProcessing || changedFields.length === 0}
                          onClick={() => setConfirm({ userId: user._id, action: 'rejected' })}
                        >
                          <FiX size={14} /> {t('mej_reject')}
                        </button>
                      </div>
                    ) : (
                      <div className="mm-confirm" data-testid="decision-confirm" style={{ marginTop: 'var(--space-3)' }}>
                        <p>
                          {t('pa_confirm', {
                            action: t(confirming === 'approved' ? 'pa_act_approve' : 'pa_act_reject'),
                            name: fullName(user),
                            email: user.email,
                          })}
                        </p>
                        <div className="mm-decision-row">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            disabled={isProcessing}
                            onClick={() => handleDecide(user, confirming)}
                          >
                            {isProcessing ? t('cc_saving') : t('cc_confirm')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={isProcessing}
                            onClick={() => setConfirm(null)}
                          >
                            {t('cancel')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav className="mm-pagination" aria-label={t('pa_pages')}>
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
    </div>
  );
};

export default AdminProfileApprovals;
