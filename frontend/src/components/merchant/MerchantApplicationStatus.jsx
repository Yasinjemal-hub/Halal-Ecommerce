import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    FiCheckCircle, FiClock, FiX, FiAward, FiDownload, FiArrowRight, FiEye,
} from 'react-icons/fi';
import mejilisService from '../../services/mejilisService';
import { isCertificateIssued } from '../../utils/certification';
import { useLanguage } from '../../i18n/LanguageContext';
import { mapBackendMessage } from '../../utils/backendErrors';

// Single source of truth for the merchant application status display,
// used by both the /merchant/register route and the Mejlis page.
//
// One-approval rule: Majlis approval of the business registration also
// approves the business as halal certified. The certificate below renders
// whenever the business is approved and the system-issued record is valid.

const STATUS_KEYS = {
    pending: { title: 'appst_pending_title', body: 'appst_pending_body', next: 'appst_pending_next' },
    under_review: { title: 'appst_review_title', body: 'appst_review_body', next: 'appst_review_next' },
    approved: { title: 'appst_approved_title', body: 'appst_approved_body', next: 'appst_approved_next' },
    rejected: { title: 'appst_rejected_title', body: 'appst_rejected_body', next: 'appst_rejected_next' },
    suspended: { title: 'appst_suspended_title', body: 'appst_suspended_body', next: 'appst_suspended_next' },
};

const APP_STATUS_KEYS = {
    pending: 'appst_st_pending',
    under_review: 'appst_st_under_review',
    approved: 'appst_st_approved',
    rejected: 'appst_st_rejected',
    suspended: 'appst_st_suspended',
};

const MerchantApplicationStatus = ({ merchant, onUpdateRequest }) => {
    const { t, formatDate } = useLanguage();
    const [viewState, setViewState] = useState('idle'); // idle | working | error
    const [downloadState, setDownloadState] = useState('idle'); // idle | working | error
    const [pdfError, setPdfError] = useState('');
    const [pdfNotice, setPdfNotice] = useState('');
    const objectUrlsRef = React.useRef([]);
    React.useEffect(() => {
        const urls = objectUrlsRef.current;
        return () => {
            urls.forEach((u) => {
                try { window.URL.revokeObjectURL(u); } catch { /* noop */ }
            });
            urls.length = 0;
        };
    }, []);

    const status = merchant?.verificationStatus || 'pending';
    const copy = STATUS_KEYS[status] || STATUS_KEYS.pending;
    const cert = merchant?.halalCertification && typeof merchant.halalCertification === 'object'
        ? merchant.halalCertification
        : null;
    const issued = isCertificateIssued(cert, merchant);
    const canEdit = ['pending', 'under_review', 'rejected'].includes(status);
    const reviewerMessage = merchant?.rejectionReason || merchant?.verificationNotes || '';

    const trackUrl = (url) => {
        objectUrlsRef.current.push(url);
        return url;
    };
    // Revoke only after the browser has had a chance to start using the
    // URL — revoking synchronously can abort the download/view.
    const scheduleRevoke = (url, delayMs = 15000) => {
        window.setTimeout(() => {
            try { window.URL.revokeObjectURL(url); } catch { /* noop */ }
            objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== url);
        }, delayMs);
    };

    // The PDF endpoint returns errors as a Blob (responseType: 'blob'),
    // so axios exposes no .message — parse the real server message out,
    // then localize it (known backend strings map to catalog keys).
    const readServerError = async (err, fallbackKey) => {
        const localize = (raw) => mapBackendMessage(t, raw) || t(fallbackKey);
        try {
            const data = err?.response?.data;
            let text = '';
            if (typeof Blob !== 'undefined' && data instanceof Blob) {
                if (typeof data.text === 'function') {
                    text = await data.text();
                } else {
                    text = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(String(reader.result || ''));
                        reader.onerror = () => resolve('');
                        reader.readAsText(data);
                    });
                }
                try {
                    const parsed = JSON.parse(text);
                    if (parsed?.message) return localize(parsed.message);
                } catch { /* not JSON */ }
                if (text) return text.slice(0, 500);
            }
            if (typeof data === 'string' && data) return data.slice(0, 500);
            if (data?.message) return localize(data.message);
        } catch { /* fall through */ }
        return t(fallbackKey);
    };

    const handleDownloadPdf = async () => {
        if (viewState === 'working' || downloadState === 'working') return;
        setDownloadState('working');
        setPdfError('');
        setPdfNotice('');
        try {
            const blob = await mejilisService.downloadCertificatePdf();
            const url = trackUrl(window.URL.createObjectURL(blob));
            const a = document.createElement('a');
            a.href = url;
            a.download = `halal-certificate-${cert.certificateNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            scheduleRevoke(url);
            setDownloadState('idle');
            setPdfNotice(t('appst_dl_started'));
        } catch (err) {
            setDownloadState('error');
            setPdfError(await readServerError(err, 'appst_dl_failed'));
        }
    };

    const handleViewCertificate = async () => {
        if (viewState === 'working' || downloadState === 'working') return;
        // Open synchronously inside the click gesture so popup protection
        // keeps the tab; load the PDF into it once the request resolves.
        const tab = window.open('', '_blank', 'noopener,noreferrer');
        if (!tab) {
            setViewState('error');
            setPdfError(t('appst_tab_blocked'));
            return;
        }
        setViewState('working');
        setPdfError('');
        setPdfNotice('');
        try {
            const blob = await mejilisService.downloadCertificatePdf();
            const url = trackUrl(window.URL.createObjectURL(blob));
            tab.location.href = url;
            scheduleRevoke(url);
            setViewState('idle');
            setPdfNotice(t('appst_opened'));
        } catch (err) {
            try { tab.close(); } catch { /* noop */ }
            setViewState('error');
            setPdfError(await readServerError(err, 'appst_open_failed'));
        }
    };

    const renderCertificateSection = () => {
        if (issued) {
            return (
                <div data-testid="certificate-card" style={{
                    marginTop: 24,
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(212, 160, 23, 0.1), rgba(13, 124, 61, 0.05))',
                    border: '1px solid rgba(212, 160, 23, 0.3)',
                    textAlign: 'left',
                    width: '100%',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <div style={{ background: '#D4A017', color: 'white', padding: 8, borderRadius: 8, display: 'flex' }}>
                            <FiAward size={24} />
                        </div>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#0D7C3D' }}>
                                {t('appst_cert_title')}
                            </h4>
                                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                                    {t('appst_cert_auto')}
                                </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ flex: 1, minWidth: '140px' }}>
                            <strong style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'block' }}>{t('appst_cert_no')}</strong>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem' }}>
                                {cert.certificateNumber}
                            </span>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px' }}>
                            <strong style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'block' }}>{t('appst_issuer')}</strong>
                            <span style={{ fontWeight: 600 }}>{cert.issuingAuthority}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px' }}>
                            <strong style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'block' }}>{t('appst_issued')}</strong>
                            <span style={{ fontWeight: 600 }}>
                                {cert.issueDate ? formatDate(cert.issueDate) : '—'}
                            </span>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px' }}>
                            <strong style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'block' }}>{t('appst_valid_until')}</strong>
                            <span style={{ fontWeight: 600 }}>
                                {cert.expiryDate ? formatDate(cert.expiryDate) : '—'}
                            </span>
                        </div>
                        <div style={{ flex: 1, minWidth: '140px' }}>
                            <strong style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', display: 'block' }}>{t('appst_validity')}</strong>
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>{t('appst_valid')}</span>
                        </div>
                    </div>
                    {cert.scope && (
                        <p style={{ marginTop: 12, fontSize: '0.875rem' }}>
                            <strong>{t('appst_scope')}</strong> {cert.scope}
                        </p>
                    )}
                    <div className="myapp-cert-actions">
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleViewCertificate}
                            disabled={viewState === 'working' || downloadState === 'working'}
                            aria-label={t('appst_view_aria')}
                        >
                            <FiEye size={16} /> {viewState === 'working' ? t('appst_opening') : t('appst_view')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={handleDownloadPdf}
                            disabled={viewState === 'working' || downloadState === 'working'}
                            aria-label={t('appst_download_aria')}
                        >
                            <FiDownload size={16} /> {downloadState === 'working' ? t('appst_preparing') : t('appst_download')}
                        </button>
                        <Link to={`/verify-certificate/${cert.certificateNumber}`} target="_blank" rel="noreferrer">
                            {t('appst_verify_public')} <FiArrowRight size={14} />
                        </Link>
                    </div>
                    {pdfNotice && !pdfError && (
                        <p role="status" className="myapp-cert-note myapp-cert-note-success">{pdfNotice}</p>
                    )}
                    {(viewState === 'error' || downloadState === 'error') && pdfError && (
                        <div role="alert" className="myapp-cert-error">
                            <p>{pdfError}</p>
                            <div className="myapp-cert-actions">
                                {viewState === 'error' && (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleViewCertificate}>
                                        {t('appst_retry_view')}
                                    </button>
                                )}
                                {downloadState === 'error' && (
                                    <button type="button" className="btn btn-ghost btn-sm" onClick={handleDownloadPdf}>
                                        {t('appst_retry_download')}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            );
        }

        if (status === 'approved') {
            // No background job creates this record: if it is missing, the
            // merchant's approval predates automatic issuance (or the seed)
            // and the record needs a repair run — say so plainly.
            return (
                <div data-testid="certificate-missing" className="myapp-cert-missing" role="alert">
                    <h4>{t('appst_cert_missing')}</h4>
                    <p>
                        {t('appst_cert_missing_desc')}
                    </p>
                </div>
            );
        }

        return null;
    };

    return (
        <div className="mejilis-status-card" data-testid="application-status">
            <div className={`mejilis-status-icon ${status}`}>
                {status === 'approved' ? (
                    <FiCheckCircle size={36} />
                ) : status === 'rejected' ? (
                    <FiX size={36} />
                ) : (
                    <FiClock size={36} />
                )}
            </div>
            <h3>{t(copy.title)}</h3>
            <p>{t(copy.body, { name: merchant?.businessName || '' })}</p>
            <span className={`status-badge ${status}`}>
                <FiClock size={12} />
                {t(APP_STATUS_KEYS[status] || 'appst_st_pending')}
            </span>

            <dl style={{ marginTop: 16, fontSize: '0.875rem', textAlign: 'left', width: '100%' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <dt style={{ color: 'var(--text-tertiary)', minWidth: 140 }}>{t('appst_submitted')}</dt>
                    <dd style={{ margin: 0, fontWeight: 600 }}>
                        {merchant?.createdAt ? formatDate(merchant.createdAt) : '—'}
                    </dd>
                </div>
                {merchant?.verifiedAt && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        <dt style={{ color: 'var(--text-tertiary)', minWidth: 140 }}>{t('appst_decided')}</dt>
                        <dd style={{ margin: 0, fontWeight: 600 }}>
                            {formatDate(merchant.verifiedAt)}
                        </dd>
                    </div>
                )}
            </dl>

            {reviewerMessage && (
                <p data-testid="reviewer-message" style={{ marginTop: 12, fontSize: '0.875rem', color: 'var(--text-tertiary)', textAlign: 'left', width: '100%' }}>
                    <strong>{t('appst_reviewer')}</strong> {reviewerMessage}
                </p>
            )}

            <p style={{ marginTop: 12, fontSize: '0.875rem', textAlign: 'left', width: '100%' }}>
                <strong>{t('appst_next')}</strong> {t(copy.next)}
            </p>

            {renderCertificateSection()}

            {canEdit && onUpdateRequest && (
                <div style={{ marginTop: 20 }}>
                    <button type="button" className="btn btn-primary btn-lg" onClick={onUpdateRequest}>
                        {status === 'rejected' ? t('appst_fix_resubmit') : t('appst_update')} <FiArrowRight size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default MerchantApplicationStatus;
