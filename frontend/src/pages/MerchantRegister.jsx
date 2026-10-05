import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiUser, FiArrowRight, FiAlertTriangle } from 'react-icons/fi';
import MerchantApplicationForm from '../components/merchant/MerchantApplicationForm';
import MerchantApplicationStatus from '../components/merchant/MerchantApplicationStatus';
import mejilisService from '../services/mejilisService';
import authService from '../services/authService';
import { useLanguage } from '../i18n/LanguageContext';
import { backendError } from '../utils/backendErrors';
import './Mejilis.css';
import './MerchantRegister.css';

// Merchant "My Application" route: form for new applicants and a
// persistent status page after submission. One business registration form,
// one review decision — approval also issues the halal certificate.
const MerchantRegister = () => {
    const { t } = useLanguage();
    const isLoggedIn = authService.isAuthenticated();
    const currentUser = authService.getCurrentUser();
    const isMerchantUser = currentUser?.role === 'merchant';

    const [regStatus, setRegStatus] = useState(null);
    const [regLoading, setRegLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [editing, setEditing] = useState(false);
    const [notice, setNotice] = useState('');

    // Do not show the registration form until the server confirms that
    // no application exists. A request failure stays an error state and
    // is never interpreted as "unregistered" (only an explicit
    // { isRegistered: false } response opens the form).
    const checkStatus = useCallback(async () => {
        try {
            setRegLoading(true);
            setLoadError('');
            const data = await mejilisService.getRegistrationStatus();
            setRegStatus(data);
        } catch (err) {
            setRegStatus(null);
            setLoadError(backendError(t, err, 'mreg_load_error'));
        } finally {
            setRegLoading(false);
        }
    }, [t]);

    useEffect(() => {
        if (isLoggedIn) {
            checkStatus();
        } else {
            setRegLoading(false);
        }
    }, [isLoggedIn, checkStatus]);

    const handleSubmitted = (merchant, message) => {
        setNotice(message || t('mreg_submitted'));
        setEditing(false);
        setRegStatus({ isRegistered: true, merchant });
    };

    const renderBody = () => {
        if (!isLoggedIn) {
            return (
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
            );
        }

        if (regLoading) {
            return (
                <div className="mejilis-loading">
                    <div className="spinner" />
                    <p>{t('mreg_checking')}</p>
                </div>
            );
        }

        if (loadError && !regStatus) {
            return (
                <div className="mejilis-status-card">
                    <div className="mejilis-status-icon warning">
                        <FiAlertTriangle size={36} />
                    </div>
                    <h3>{t('mreg_load_error')}</h3>
                    <p>{loadError}</p>
                    <button type="button" className="btn btn-primary btn-lg" onClick={checkStatus}>
                        {t('ord_retry')}
                    </button>
                </div>
            );
        }

        if (!isMerchantUser) {
            return (
                <div className="mejilis-status-card">
                    <div className="mejilis-status-icon warning">
                        <FiAlertTriangle size={36} />
                    </div>
                    <h3>{t('mreg_restricted')}</h3>
                    <p>
                        {t('mreg_restricted_desc', { role: currentUser?.role || 'consumer' })}
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
            );
        }

        if (regStatus?.isRegistered && !editing) {
            return (
                <MerchantApplicationStatus
                    merchant={regStatus.merchant}
                    onUpdateRequest={() => setEditing(true)}
                />
            );
        }

        if (editing && regStatus?.isRegistered) {
            return (
                <MerchantApplicationForm
                    mode="resubmit"
                    initialValues={regStatus.merchant}
                    onSubmitted={handleSubmitted}
                    onCancel={() => setEditing(false)}
                />
            );
        }

        if (regStatus?.isRegistered === false) {
            return (
                <MerchantApplicationForm
                    mode="create"
                    onSubmitted={handleSubmitted}
                />
            );
        }

        return (
            <div className="mejilis-loading">
                <div className="spinner" />
                <p>{t('mreg_checking')}</p>
            </div>
        );
    };

    return (
        <div className="merchant-register-page">
            <section className="page-header">
                <div className="container">
                    <h1>{regStatus?.isRegistered ? t('mreg_my_app') : t('mreg_register')}</h1>
                    <p>
                        {regStatus?.isRegistered
                            ? t('mreg_my_app_desc')
                            : t('mreg_register_desc')}
                    </p>
                </div>
            </section>
            <main className="container">
                {notice && (
                    <div className="mejilis-success-message" role="status">
                        <p>{notice}</p>
                    </div>
                )}
                {renderBody()}
            </main>
        </div>
    );
};

export default MerchantRegister;
