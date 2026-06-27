import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight, FiShield } from 'react-icons/fi';
import { login, clearError } from '../../redux/slices/authSlice';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const dispatch = useDispatch();
    const navigate = useNavigate();
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
            toast.error(error);
            dispatch(clearError());
        }
    }, [error, dispatch]);

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
                        <h2>Welcome Back!</h2>
                        <p className="text-ethiopic" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>እንኳን ደህና መጡ!</p>
                        <p>Sign in to access your account, track orders, and discover authentic halal products from verified Ethiopian merchants.</p>
                        <div className="auth-left-features">
                            <div className="auth-feature">Majlis Verified Merchants</div>
                            <div className="auth-feature">Secure Ethiopian Payments</div>
                            <div className="auth-feature">Order Tracking & History</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-right">
                <div className="auth-form-container">
                    <div className="auth-form-header">
                        <h1 className="heading-section">Sign In</h1>
                        <p className="text-body">Enter your credentials to continue</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit} id="login-form">
                        <div className="input-group">
                            <label className="input-label" htmlFor="email">Email Address</label>
                            <div className="input-with-icon">
                                <FiMail className="input-icon" />
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="input"
                                    placeholder="your.email@example.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <div className="input-label-row">
                                <label className="input-label" htmlFor="password">Password</label>
                                <Link to="/forgot-password" className="input-label-link">Forgot password?</Link>
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
                                    placeholder="Enter your password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="input-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label="Toggle password"
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isLoading} id="login-submit">
                            {isLoading ? (
                                <span className="spinner spinner-sm" />
                            ) : (
                                <>Sign In <FiArrowRight /></>
                            )}
                        </button>
                    </form>

                    <p className="auth-switch">
                        Don't have an account? <Link to="/register">Create Account</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
