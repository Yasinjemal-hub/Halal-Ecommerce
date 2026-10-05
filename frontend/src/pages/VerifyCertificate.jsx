import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiAward, FiCheckCircle, FiXCircle, FiArrowLeft } from 'react-icons/fi';
import mejilisService from '../services/mejilisService';
import { useLanguage } from '../i18n/LanguageContext';
import { backendError } from '../utils/backendErrors';
import './Mejilis.css';

// Public certificate verification: anyone with a certificate number can
// confirm it against official records. Shows public facts only.
const VerifyCertificate = () => {
    const { certificateNumber } = useParams();
    const { t, formatDate } = useLanguage();
    const [state, setState] = useState('loading'); // loading | found | missing | error
    const [certificate, setCertificate] = useState(null);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await mejilisService.verifyCertificate(certificateNumber);
                if (cancelled) return;
                setCertificate(res.certificate);
                setState('found');
            } catch (err) {
                if (cancelled) return;
                if (err.response?.status === 404) {
                    setState('missing');
                } else {
                    setLoadError(backendError(t, err, 'vc_unavailable_desc'));
                    setState('error');
                }
            }
        })();
        return () => { cancelled = true; };
    }, [certificateNumber, t]);

    return (
        <div className="container" style={{ paddingTop: 32, paddingBottom: 48, maxWidth: 720 }}>
            <Link to="/" className="btn btn-white-outline" style={{ marginBottom: 24, display: 'inline-flex' }}>
                <FiArrowLeft size={16} /> {t('nav_home')}
            </Link>

            {state === 'loading' && (
                <div className="mejilis-loading">
                    <div className="spinner" />
                    <p>{t('vc_loading')}</p>
                </div>
            )}

            {state === 'missing' && (
                <div className="mejilis-status-card">
                    <div className="mejilis-status-icon rejected">
                        <FiXCircle size={36} />
                    </div>
                    <h3>{t('vc_missing')}</h3>
                    <p>
                        {t('vc_missing_desc', { number: certificateNumber })}
                    </p>
                </div>
            )}

            {state === 'error' && (
                <div className="mejilis-status-card">
                    <div className="mejilis-status-icon warning">
                        <FiXCircle size={36} />
                    </div>
                    <h3>{t('vc_unavailable')}</h3>
                    <p>{loadError || t('vc_unavailable_desc')}</p>
                    <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
                        {t('ord_retry')}
                    </button>
                </div>
            )}

            {state === 'found' && certificate && (
                <div className="mejilis-status-card" style={{ textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                        <div style={{ background: '#D4A017', color: 'white', padding: 8, borderRadius: 8, display: 'flex' }}>
                            <FiAward size={28} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0 }}>{t('vc_title')}</h3>
                            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {t('vc_official')}
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        {certificate.issued ? (
                            <><FiCheckCircle size={20} color="var(--success)" /> <strong style={{ color: 'var(--success)' }}>{t('vc_valid')}</strong></>
                        ) : (
                            <><FiXCircle size={20} color="var(--error)" /> <strong style={{ color: 'var(--error)' }}>{t('vc_invalid', { status: certificate.status || '' })}</strong></>
                        )}
                    </div>

                    <dl style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '8px 12px', fontSize: '0.9375rem' }}>
                        <dt style={{ color: 'var(--text-tertiary)' }}>{t('vc_business')}</dt>
                        <dd style={{ margin: 0, fontWeight: 700 }}>{certificate.businessName || '—'}</dd>
                        <dt style={{ color: 'var(--text-tertiary)' }}>{t('appst_cert_no')}</dt>
                        <dd style={{ margin: 0, fontFamily: 'monospace', fontWeight: 700 }}>{certificate.certificateNumber}</dd>
                        <dt style={{ color: 'var(--text-tertiary)' }}>{t('vc_type')}</dt>
                        <dd style={{ margin: 0, textTransform: 'capitalize' }}>{String(certificate.certificateType || '').replace(/_/g, ' ')}</dd>
                        <dt style={{ color: 'var(--text-tertiary)' }}>{t('appst_issuer')}</dt>
                        <dd style={{ margin: 0 }}>{certificate.issuingAuthority}</dd>
                        <dt style={{ color: 'var(--text-tertiary)' }}>{t('appst_issued')}</dt>
                        <dd style={{ margin: 0 }}>{certificate.issueDate ? formatDate(certificate.issueDate) : '—'}</dd>
                        <dt style={{ color: 'var(--text-tertiary)' }}>{t('appst_valid_until')}</dt>
                        <dd style={{ margin: 0 }}>{certificate.expiryDate ? formatDate(certificate.expiryDate) : '—'}</dd>
                        {certificate.scope && (
                            <><dt style={{ color: 'var(--text-tertiary)' }}>{t('vc_scope')}</dt><dd style={{ margin: 0 }}>{certificate.scope}</dd></>
                        )}
                    </dl>
                </div>
            )}
        </div>
    );
};

export default VerifyCertificate;
