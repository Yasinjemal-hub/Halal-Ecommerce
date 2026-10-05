import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FiSearch, FiClock, FiAlertCircle, FiAward, FiX, FiFileText, FiDownload, FiExternalLink } from 'react-icons/fi';
import mejilisService from '../../services/mejilisService';
import { useLanguage } from '../../i18n/LanguageContext';
import { backendError } from '../../utils/backendErrors';
import './Dashboard.css';
import './AdminMerchants.css';

const CERT_STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'expired', 'revoked', 'suspended'];
const CERT_TYPES = ['halal_product', 'halal_establishment', 'halal_slaughter', 'halal_import'];
const PAGE_SIZE = 8;

const CERT_STATUS_KEYS = {
    pending: 'appst_st_pending',
    under_review: 'appst_st_under_review',
    approved: 'appst_st_approved',
    rejected: 'appst_st_rejected',
    expired: 'cert_st_expired',
    revoked: 'cert_st_revoked',
    suspended: 'appst_st_suspended',
};

const CERT_TYPE_KEYS = {
    halal_product: 'cert_type_halal_product',
    halal_establishment: 'cert_type_halal_establishment',
    halal_slaughter: 'cert_type_halal_slaughter',
    halal_import: 'cert_type_halal_import',
};

const BIZ_TYPE_KEYS = {
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

// Supporting-evidence preview. Documents load only through the
// authorized reviewer detail endpoint — never from public APIs.
const EvidenceCard = ({ doc }) => {
    const { t, formatDate } = useLanguage();
    const [imgState, setImgState] = useState('loading');
    const url = doc?.url || '';
    const isImage = url.startsWith('data:image');
    const isPdf = url.startsWith('data:application/pdf');
    const formatStatus = (s) => (CERT_STATUS_KEYS[s] ? t(CERT_STATUS_KEYS[s]) : String(s || ''));
    const prettyType = (v) => (CERT_TYPE_KEYS[v] ? t(CERT_TYPE_KEYS[v]) : String(v || ''));

    if (!url) return null;

    return (
        <div className="mm-doc-card">
            <h4>{doc.name || t('cert_ev_doc')}</h4>
            <p className="text-body" style={{ textTransform: 'capitalize' }}>
                {prettyType(doc.documentType)}
                {doc.uploadedAt ? ` • ${formatDate(doc.uploadedAt)}` : ''}
            </p>
            <div className="mm-doc-preview">
                {isImage ? (
                    <>
                        {imgState === 'loading' && <p className="text-body">{t('mm_preview_loading')}</p>}
                        {imgState === 'failed' ? (
                            <p className="text-body">{t('cert_ev_unavailable')}</p>
                        ) : (
                            <img
                                src={url}
                                alt={t('cert_ev_preview', { name: doc.name || '' })}
                                style={imgState === 'loading' ? { display: 'none' } : undefined}
                                onLoad={() => setImgState('loaded')}
                                onError={() => setImgState('failed')}
                            />
                        )}
                    </>
                ) : isPdf ? (
                    <p className="text-body"><FiFileText size={28} /> {t('cert_ev_pdf')}</p>
                ) : (
                    <p className="text-body"><FiFileText size={28} /> {t('cert_ev_file')}</p>
                )}
            </div>
            <div className="mm-doc-actions">
                <a className="btn btn-ghost btn-sm" href={url} target="_blank" rel="noreferrer">
                    <FiExternalLink size={14} /> {t('cert_ev_open')}
                </a>
                <a className="btn btn-ghost btn-sm" href={url} download={doc.name || 'evidence'}>
                    <FiDownload size={14} /> {t('cert_ev_download')}
                </a>
            </div>
        </div>
    );
};

const CertificationDetail = ({ certId, onClose }) => {
    const { t, formatDate } = useLanguage();
    const [detail, setDetail] = useState(null);
    const [state, setState] = useState('loading');
    const [submitting] = useState(false);
    const closeRef = useRef(null);

    const loadDetail = useCallback(async () => {
        setState('loading');
        try {
            const res = await mejilisService.getCertificationById(certId);
            const cert = res.certification || res;
            setDetail(cert);
            setState('success');
        } catch (err) {
            setState('error');
        }
    }, [certId]);

    useEffect(() => { loadDetail(); }, [loadDetail]);

    useEffect(() => {
        closeRef.current?.focus();
        const onKey = (e) => { if (e.key === 'Escape' && !submitting) onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, submitting]);

    const merchant = detail?.merchant && typeof detail.merchant === 'object' ? detail.merchant : null;
    const formatStatus = (s) => (CERT_STATUS_KEYS[s] ? t(CERT_STATUS_KEYS[s]) : String(s || ''));
    const prettyType = (v) => (CERT_TYPE_KEYS[v] ? t(CERT_TYPE_KEYS[v]) : String(v || ''));
    const formatBizType = (v) => (BIZ_TYPE_KEYS[v] ? t(BIZ_TYPE_KEYS[v]) : String(v || ''));

    return (
        <div className="mm-backdrop" onClick={() => { if (!submitting) onClose(); }}>
            <div className="mm-modal" role="dialog" aria-modal="true" aria-labelledby="cert-detail-title" onClick={(e) => e.stopPropagation()}>
                <div className="mm-modal-header">
                    <div>
                        <h2 id="cert-detail-title">{t('cert_detail_title')}</h2>
                        {detail && (
                            <div className="mm-row-title">
                                <span className={`mm-badge mm-badge-${detail.status}`}>{formatStatus(detail.status)}</span>
                                {detail.certificateNumber && (
                                    <span className="mm-badge mm-badge-active" style={{ fontFamily: 'monospace' }}>{detail.certificateNumber}</span>
                                )}
                            </div>
                        )}
                    </div>
                    <button ref={closeRef} type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
                        <FiX size={16} /> {t('cc_close')}
                    </button>
                </div>

                <div className="mm-modal-body">
                    {state === 'loading' && <p className="text-body" data-testid="cert-detail-loading">{t('mm_detail_loading')}</p>}
                    {state === 'error' && (
                        <div data-testid="cert-detail-error">
                            <p className="text-body">{t('mm_detail_error')}</p>
                            <button type="button" className="btn btn-primary btn-sm" onClick={loadDetail}>{t('ord_retry')}</button>
                        </div>
                    )}

                    {state === 'success' && detail && (
                        <>
                            <div className="mm-detail-grid">
                                <div className="mm-detail-card">
                                    <h3>{t('cert_merchant')}</h3>
                                    <dl>
                                        <dt>{t('mm_biz')}</dt><dd>{merchant?.businessName || '—'}</dd>
                                        <dt>{t('cert_type_label')}</dt><dd style={{ textTransform: 'capitalize' }}>{merchant?.businessType ? formatBizType(merchant.businessType) : '—'}</dd>
                                        <dt>{t('cert_phone')}</dt><dd>{merchant?.businessPhone || '—'}</dd>
                                        <dt>{t('cert_account')}</dt><dd style={{ textTransform: 'capitalize' }}>{formatStatus(merchant?.verificationStatus)}</dd>
                                        <dt>{t('cert_applied_label')}</dt><dd>{detail.applicationDate ? formatDate(detail.applicationDate) : '—'}</dd>
                                    </dl>
                                </div>
                                <div className="mm-detail-card">
                                    <h3>{t('cert_request')}</h3>
                                    <dl>
                                        <dt>{t('cert_type_label')}</dt><dd style={{ textTransform: 'capitalize' }}>{prettyType(detail.certificateType)}</dd>
                                        <dt>{t('appst_issuer')}</dt><dd>{detail.issuingAuthority || '—'}</dd>
                                        <dt>{t('appst_issued')}</dt><dd>{detail.issueDate ? formatDate(detail.issueDate) : '—'}</dd>
                                        <dt>{t('cert_expires_label')}</dt><dd>{detail.expiryDate ? formatDate(detail.expiryDate) : '—'}</dd>
                                        <dt>{t('cert_reviewed')}</dt>
                                        <dd>
                                            {detail.reviewedBy
                                                ? `${detail.reviewedBy.firstName || ''} ${detail.reviewedBy.lastName || ''}`.trim()
                                                : '—'}
                                            {detail.reviewedAt ? ` • ${formatDate(detail.reviewedAt)}` : ''}
                                        </dd>
                                    </dl>
                                </div>
                                <div className="mm-detail-card full">
                                    <h3>{t('cert_scope')}</h3>
                                    <p className="text-body">{detail.scope || '—'}</p>
                                    {(detail.coveredProducts || []).length > 0 && (
                                        <p className="text-body"><strong>{t('cert_covered')}</strong> {detail.coveredProducts.join(', ')}</p>
                                    )}
                                </div>
                                <div className="mm-detail-card full">
                                    <h3>{t('mm_review_history')}</h3>
                                    <dl>
                                        <dt>{t('cert_notes')}</dt><dd>{detail.reviewNotes || '—'}</dd>
                                        <dt>{t('cert_rejection')}</dt><dd>{detail.rejectionReason || '—'}</dd>
                                        <dt>{t('cert_revocation')}</dt><dd>{detail.revocationReason || '—'}</dd>
                                    </dl>
                                    {(detail.statusHistory || []).length > 0 && (
                                        <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: '0.875rem' }}>
                                            {detail.statusHistory.map((h, i) => (
                                                <li key={h._id || i}>
                                                    <strong style={{ textTransform: 'capitalize' }}>{formatStatus(h.status)}</strong>
                                                    {' — '}{h.changedAt ? formatDate(h.changedAt, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                                                    {h.changedBy ? ` ${t('cert_by')} ${h.changedBy.firstName || ''} ${h.changedBy.lastName || ''}`.trimEnd() : ''}
                                                    {h.note ? `: ${h.note}` : ''}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 style={{ marginBottom: 8 }}>{t('cert_evidence', { count: (detail.documents || []).length })}</h3>
                                {(detail.documents || []).length === 0 ? (
                                    <p className="text-body">{t('cert_no_evidence')}</p>
                                ) : (
                                    <div className="mm-docs">
                                        {detail.documents.map((d, i) => (
                                            <EvidenceCard key={d._id || i} doc={d} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {(detail.inspections || []).length > 0 && (
                                <div className="mm-detail-card full">
                                    <h3>{t('cert_inspections', { count: detail.inspections.length })}</h3>
                                    <ul style={{ paddingLeft: 18, fontSize: '0.875rem' }}>
                                        {detail.inspections.map((insp, i) => (
                                            <li key={insp._id || i}>
                                                <strong>{insp.inspectorName}</strong>
                                                {' — '}{insp.inspectionDate ? formatDate(insp.inspectionDate) : ''}
                                                {insp.location ? ` ${t('cert_at')} ${insp.location}` : ''}:{' '}
                                                <span style={{ textTransform: 'capitalize' }}>{formatStatus(insp.result)}</span>
                                                {insp.findings ? ` — ${insp.findings}` : ''}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="mm-decision">
                                <h3>{t('mm_decision')}</h3>
                                <p className="text-body">
                                    {t('cert_decision_retired')}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminCertifications = () => {
    const { t, formatDate } = useLanguage();
    const [certs, setCerts] = useState([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [statusCounts, setStatusCounts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
            setCurrentPage(1);
        }, 400);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const loadCerts = useCallback(async (page) => {
        setLoading(true);
        setError('');
        try {
            const params = { page, limit: PAGE_SIZE, sort: sortBy };
            if (debouncedSearch) params.search = debouncedSearch;
            if (filterStatus !== 'all') params.status = filterStatus;
            if (filterType !== 'all') params.certificateType = filterType;
            if (dateFrom) params.from = dateFrom;
            if (dateTo) params.to = dateTo;
            const res = await mejilisService.getCertifications(params);
            setCerts(res.certifications || []);
            setTotal(res.total || 0);
            setTotalPages(res.totalPages || 0);
            if (res.statusCounts) setStatusCounts(res.statusCounts);
        } catch (err) {
            setError(backendError(t, err, 'err_load_certs'));
            setCerts([]);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, filterStatus, filterType, dateFrom, dateTo, sortBy, t]);

    useEffect(() => { loadCerts(currentPage); }, [loadCerts, currentPage]);

    const formatStatus = (s) => (CERT_STATUS_KEYS[s] ? t(CERT_STATUS_KEYS[s]) : String(s || ''));
    const prettyType = (v) => (CERT_TYPE_KEYS[v] ? t(CERT_TYPE_KEYS[v]) : String(v || ''));

    const stats = [
        { label: t('cert_stat_needs'), value: statusCounts ? (statusCounts.pending + statusCounts.under_review) : '…' },
        { label: t('appst_issued'), value: statusCounts?.approved ?? '…' },
        { label: t('cert_stat_corrections'), value: statusCounts?.rejected ?? '…' },
        { label: t('mm_stat_suspended'), value: statusCounts?.suspended ?? '…' },
        { label: t('cert_stat_revoked'), value: statusCounts?.revoked ?? '…' },
        { label: t('cert_stat_expired'), value: statusCounts?.expired ?? '…' },
    ];

    const pageWindow = [];
    for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p += 1) {
        pageWindow.push(p);
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-welcome">
                <div>
                    <h1 className="heading-section">{t('cert_title')}</h1>
                    <p className="text-body">
                        {t('cert_desc')}
                    </p>
                </div>
            </div>

            <div className="dashboard-stats" data-testid="cert-status-counts">
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
                            placeholder={t('cert_search_ph')}
                            aria-label={t('cert_search_label')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="mm-select"
                        aria-label={t('cert_filter_status')}
                        value={filterStatus}
                        onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="pending,under_review">{t('cert_filter_needs')}</option>
                        <option value="all">{t('mm_filter_all')}</option>
                        {CERT_STATUSES.map((s) => (
                            <option key={s} value={s}>{formatStatus(s)}</option>
                        ))}
                    </select>
                    <select
                        className="mm-select"
                        aria-label={t('cert_filter_type')}
                        value={filterType}
                        onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="all">{t('cert_filter_all_types')}</option>
                        {CERT_TYPES.map((ct) => (
                            <option key={ct} value={ct}>{prettyType(ct)}</option>
                        ))}
                    </select>
                    <select
                        className="mm-select"
                        aria-label={t('cert_sort_label')}
                        value={sortBy}
                        onChange={(e) => { setSortBy(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="newest">{t('cc_sort_newest')}</option>
                        <option value="oldest">{t('cc_sort_oldest')}</option>
                        <option value="expiry">{t('cert_sort_expiry')}</option>
                    </select>
                    <input
                        type="date"
                        className="mm-input"
                        aria-label={t('cert_from_label')}
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    />
                    <input
                        type="date"
                        className="mm-input"
                        aria-label={t('cert_to_label')}
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                    />
                </div>

                {loading ? (
                    <div className="mm-state" data-testid="certs-loading">
                        <FiClock size={24} />
                        <p>{t('cert_loading')}</p>
                    </div>
                ) : error ? (
                    <div className="mm-state" data-testid="certs-error">
                        <FiAlertCircle size={24} />
                        <h3>{t('cert_error')}</h3>
                        <p>{error}</p>
                        <button type="button" className="btn btn-primary btn-sm" data-testid="retry-certs" onClick={() => loadCerts(currentPage)}>
                            {t('ord_retry')}
                        </button>
                    </div>
                ) : certs.length === 0 ? (
                    <div className="mm-state" data-testid="certs-empty">
                        <FiAward size={32} />
                        <h3>{t('cert_empty')}</h3>
                        <p>{t('mm_empty_desc')}</p>
                    </div>
                ) : (
                    <>
                        <p className="mm-result-count" aria-live="polite">
                            {t('cert_showing', { shown: certs.length, total, page: currentPage, pages: totalPages })}
                        </p>
                        <div className="mm-list">
                            {certs.map((c) => (
                                <div key={c._id} className="mm-row">
                                    <div className="mm-row-main">
                                        <div className="mm-row-title">
                                            <h4>{c.merchant?.businessName || t('cert_unknown_biz')}</h4>
                                            <span className={`mm-badge mm-badge-${c.status}`}>{formatStatus(c.status)}</span>
                                            {c.certificateNumber && (
                                                <span className="mm-badge mm-badge-active" style={{ fontFamily: 'monospace' }}>{c.certificateNumber}</span>
                                            )}
                                        </div>
                                        <div className="mm-row-meta">
                                            <span style={{ textTransform: 'capitalize' }}>{prettyType(c.certificateType)}</span>
                                            <span>{c.applicationDate ? t('cert_applied', { date: formatDate(c.applicationDate) }) : '—'}</span>
                                            {c.expiryDate && <span>{t('cert_expires', { date: formatDate(c.expiryDate) })}</span>}
                                        </div>
                                    </div>
                                    <div className="mm-row-actions">
                                        <button type="button" className="btn btn-primary btn-sm" onClick={() => setSelectedId(c._id)}>
                                            <FiFileText size={14} /> {t('mm_review')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {totalPages > 1 && (
                            <nav className="mm-pagination" aria-label={t('cert_pages')}>
                                <button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
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
                                <button type="button" className="btn btn-ghost btn-sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                                    {t('cc_next')}
                                </button>
                            </nav>
                        )}
                    </>
                )}
            </div>

            {selectedId && (
                <CertificationDetail
                    certId={selectedId}
                    onClose={() => setSelectedId(null)}
                />
            )}
        </div>
    );
};

export default AdminCertifications;
