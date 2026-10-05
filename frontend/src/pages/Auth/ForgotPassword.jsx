import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowRight, FiShield } from 'react-icons/fi';
import authService from '../../services/authService';
import { useLanguage } from '../../i18n/LanguageContext';
import { backendError } from '../../utils/backendErrors';
import toast from 'react-hot-toast';
import './Auth.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const { t } = useLanguage();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error(t('fp_need_email'));
            return;
        }
        setIsLoading(true);
        try {
            await authService.forgotPassword(email);
            setSent(true);
            toast.success(t('fp_sent_ok'));
        } catch (error) {
            toast.error(backendError(t, error, 'fp_failed'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-left">
                <div className="auth-left-content">
                    <div className="auth-left-pattern pattern-overlay" />
                    <div className="auth-left-inner">
                        <Link to="/" className="auth-logo">
                            <div className="auth-logo-icon"><FiShield /></div>
                            <span>Halal<span className="logo-accent">Market</span></span>
                        </Link>
                        <h2>{t('fp_hero_title')}</h2>
                        <p>{t('fp_hero_desc')}</p>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-form-container">
                    <div className="auth-form-header">
                        <h1 className="heading-section">{t('fp_title')}</h1>
                        <p className="text-body">{t('fp_subtitle')}</p>
                    </div>

                    {sent ? (
                        <div>
                            <p className="text-body" style={{ marginBottom: '1.5rem' }}>
                                {t('fp_sent')}
                            </p>
                            <p className="auth-switch">
                                <Link to="/login">{t('fp_back_signin')}</Link>
                            </p>
                        </div>
                    ) : (
                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label className="input-label" htmlFor="forgot-email">{t('auth_email')}</label>
                                <div className="input-with-icon">
                                    <FiMail className="input-icon" />
                                    <input
                                        type="email"
                                        id="forgot-email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input"
                                        placeholder={t('auth_email_placeholder')}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isLoading}>
                                {isLoading ? <span className="spinner spinner-sm" /> : <>{t('fp_submit')} <FiArrowRight /></>}
                            </button>
                        </form>
                    )}

                    <p className="auth-switch">
                        {t('fp_remembered')} <Link to="/login">{t('auth_sign_in')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
