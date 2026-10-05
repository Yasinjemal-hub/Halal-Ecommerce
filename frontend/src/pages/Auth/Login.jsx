import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield } from 'react-icons/fi';
import { login, clearError } from '../../redux/slices/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';
import { mapBackendMessage } from '../../utils/backendErrors';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { isLoading, error, isAuthenticated, user } = useSelector((state) => state.auth);

    useEffect(() => {
        if (isAuthenticated) {
            if (user?.role === 'admin' || user?.role === 'superadmin') {
                navigate('/admin');
            } else {
                navigate('/');
            }
        }
    }, [isAuthenticated, user, navigate]);

    useEffect(() => {
        if (error) {
            toast.error(mapBackendMessage(t, error) || t('err_login_failed'));
            dispatch(clearError());
        }
    }, [error, dispatch, t]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        dispatch(login(formData));
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
                        <h2>{t('auth_welcome')}</h2>
                        <p className="text-ethiopic" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{t('auth_greeting_login')}</p>
                        <p>{t('auth_login_desc')}</p>
                        <div className="auth-left-features">
                            <div className="auth-feature">{t('auth_feature_1')}</div>
                            <div className="auth-feature">{t('auth_feature_2')}</div>
                            <div className="auth-feature">{t('auth_feature_3')}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-form-container">
                    <div className="auth-form-header">
                        <h1 className="heading-section">{t('auth_sign_in')}</h1>
                        <p className="text-body">{t('auth_sign_in_desc')}</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit} id="login-form">
                        <div className="input-group">
                            <label className="input-label" htmlFor="email">{t('auth_email')}</label>
                            <div className="input-with-icon">
                                <FiMail className="input-icon" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder={t('auth_email_placeholder')}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <div className="input-label-row">
                                <label className="input-label" htmlFor="password">{t('auth_password')}</label>
                                <Link to="/forgot-password" className="input-label-link">{t('auth_forgot')}</Link>
                            </div>
                            <div className="input-with-icon">
                                <FiLock className="input-icon" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder={t('auth_password_placeholder')}
                                    required
                                />
                                <button
                                    type="button"
                                    className="input-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={t('a11y_toggle_password')}
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isLoading} id="login-submit">
                            {isLoading ? (
                                <span className="spinner spinner-sm" />
                            ) : (
                                <>{t('auth_submit_login')} <FiArrowRight /></>
                            )}
                        </button>
                    </form>

                    <p className="auth-switch">
                        {t('auth_no_account')} <Link to="/register">{t('auth_create_account')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
