import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiLock, FiArrowRight, FiShield } from 'react-icons/fi';
import authService from '../../services/authService';
import { useLanguage } from '../../i18n/LanguageContext';
import { backendError } from '../../utils/backendErrors';
import toast from 'react-hot-toast';
import './Auth.css';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useLanguage();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error(t('auth_passwords_no_match'));
            return;
        }
        if (password.length < 8) {
            toast.error(t('auth_password_min'));
            return;
        }
        setIsLoading(true);
        try {
            await authService.resetPassword(token, password);
            toast.success(t('rp_success'));
            navigate('/login');
        } catch (error) {
            toast.error(backendError(t, error, 'rp_failed'));
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
                        <h2>{t('rp_hero_title')}</h2>
                        <p>{t('rp_hero_desc')}</p>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-form-container">
                    <div className="auth-form-header">
                        <h1 className="heading-section">{t('rp_title')}</h1>
                        <p className="text-body">{t('rp_subtitle')}</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label className="input-label" htmlFor="new-password">{t('rp_new_password')}</label>
                            <div className="input-with-icon">
                                <FiLock className="input-icon" />
                                <input
                                    type="password"
                                    id="new-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    placeholder={t('auth_password_min_placeholder')}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label className="input-label" htmlFor="confirm-password">{t('auth_confirm_password')}</label>
                            <div className="input-with-icon">
                                <FiLock className="input-icon" />
                                <input
                                    type="password"
                                    id="confirm-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input"
                                    placeholder={t('auth_confirm_password_placeholder')}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isLoading}>
                            {isLoading ? <span className="spinner spinner-sm" /> : <>{t('rp_submit')} <FiArrowRight /></>}
                        </button>
                    </form>

                    <p className="auth-switch">
                        <Link to="/login">{t('fp_back_signin')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
