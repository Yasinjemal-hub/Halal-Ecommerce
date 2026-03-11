import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiSearch, FiShoppingCart, FiMenu, FiX, FiSun, FiMoon, FiChevronDown, FiLogOut, FiGrid, FiHeart } from 'react-icons/fi';
import { selectCartCount, toggleCart } from '../../redux/slices/cartSlice';
import { logout } from '../../redux/slices/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import './Navbar.css';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isDark, setIsDark] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchRef = useRef(null);
    const userMenuRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t } = useLanguage();

    const cartCount = useSelector(selectCartCount);
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsMobileMenuOpen(false);
        setIsSearchOpen(false);
    }, [location]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
            setIsSearchOpen(false);
            setSearchQuery('');
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        setIsUserMenuOpen(false);
        navigate('/');
    };

    const navLinks = [
        { path: '/', label: t('nav_home') },
        { path: '/shop', label: t('nav_shop') },
        { path: '/merchants', label: t('nav_merchants') },
        { path: '/mejilis', label: '🕌 Mejilis' },
        { path: '/about', label: t('nav_about') },
    ];

    const categories = [
        { slug: 'meat', label: `🥩 ${t('cat_meat')}`, icon: '🥩' },
        { slug: 'dairy', label: `🥛 ${t('cat_dairy')}`, icon: '🥛' },
        { slug: 'spices', label: `🌶️ ${t('cat_spices')}`, icon: '🌶️' },
        { slug: 'bakery', label: `🍞 ${t('cat_bakery')}`, icon: '🍞' },
        { slug: 'honey', label: `🍯 ${t('cat_honey')}`, icon: '🍯' },
        { slug: 'clothing', label: `👗 ${t('cat_clothing')}`, icon: '👗' },
        { slug: 'cosmetics', label: `✨ ${t('cat_cosmetics')}`, icon: '✨' },
        { slug: 'books', label: `📚 ${t('cat_books')}`, icon: '📚' },
    ];

    return (
        <>
            {/* Top Bar */}
            <div className="top-bar">
                <div className="container top-bar-inner">
                    <div className="top-bar-left">
                        <span className="top-bar-text">{t('top_bar_text')}</span>
                    </div>
                    <div className="top-bar-right">
                        <LanguageSwitcher />
                        <span className="top-bar-divider">|</span>
                        <button className="top-bar-btn" onClick={toggleTheme} aria-label="Toggle theme">
                            {isDark ? <FiSun size={14} /> : <FiMoon size={14} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Navbar */}
            <nav className={`navbar ${isScrolled ? 'navbar-scrolled' : ''}`} id="main-navbar">
                <div className="container navbar-inner">
                    {/* Logo */}
                    <Link to="/" className="navbar-logo" id="navbar-logo">
                        <div className="logo-icon">
                            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="20" cy="20" r="18" fill="url(#logo-gradient)" />
                                <path d="M20 8L22.5 14H28L23.5 18L25.5 24L20 20.5L14.5 24L16.5 18L12 14H17.5L20 8Z" fill="white" />
                                <path d="M20 26C20 26 14 30 14 32H26C26 30 20 26 20 26Z" fill="white" opacity="0.8" />
                                <defs>
                                    <linearGradient id="logo-gradient" x1="0" y1="0" x2="40" y2="40">
                                        <stop stopColor="#0D7C3D" />
                                        <stop offset="1" stopColor="#065f2d" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        <div className="logo-text">
                            <span className="logo-name">Halal<span className="logo-accent">Market</span></span>
                            <span className="logo-tagline">Ethiopia</span>
                        </div>
                    </Link>

                    {/* Desktop Search */}
                    <form className="navbar-search" onSubmit={handleSearch} id="navbar-search">
                        <FiSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder={t('nav_search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-input"
                            id="search-input"
                        />
                        <button type="submit" className="search-submit" id="search-submit">{t('nav_search')}</button>
                    </form>

                    {/* Desktop Nav Links */}
                    <div className="navbar-links">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`nav-link ${location.pathname === link.path ? 'nav-link-active' : ''}`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="navbar-actions">
                        <button className="nav-action-btn mobile-search-btn" onClick={() => setIsSearchOpen(!isSearchOpen)} aria-label="Search">
                            <FiSearch size={20} />
                        </button>

                        <button
                            className="nav-action-btn cart-btn"
                            onClick={() => dispatch(toggleCart())}
                            id="cart-toggle-btn"
                            aria-label="Cart"
                        >
                            <FiShoppingCart size={20} />
                            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                        </button>

                        {isAuthenticated ? (
                            <div className="user-menu-wrapper" ref={userMenuRef}>
                                <button
                                    className="nav-action-btn user-btn"
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    id="user-menu-btn"
                                >
                                    <div className="user-avatar">
                                        {user?.avatar?.url ? (
                                            <img src={user.avatar.url} alt={user.firstName} />
                                        ) : (
                                            <span>{user?.firstName?.[0] || 'U'}</span>
                                        )}
                                    </div>
                                    <FiChevronDown size={14} className={`chevron ${isUserMenuOpen ? 'chevron-open' : ''}`} />
                                </button>

                                {isUserMenuOpen && (
                                    <div className="user-dropdown animate-scale-in" id="user-dropdown">
                                        <div className="user-dropdown-header">
                                            <p className="user-dropdown-name">{user?.firstName} {user?.lastName}</p>
                                            <p className="user-dropdown-email">{user?.email}</p>
                                        </div>
                                        <div className="user-dropdown-divider" />
                                        <Link to="/dashboard" className="user-dropdown-item" onClick={() => setIsUserMenuOpen(false)}>
                                            <FiGrid size={16} /> {t('nav_dashboard')}
                                        </Link>
                                        <Link to="/orders" className="user-dropdown-item" onClick={() => setIsUserMenuOpen(false)}>
                                            <FiShoppingCart size={16} /> {t('nav_my_orders')}
                                        </Link>
                                        <Link to="/wishlist" className="user-dropdown-item" onClick={() => setIsUserMenuOpen(false)}>
                                            <FiHeart size={16} /> {t('nav_wishlist')}
                                        </Link>
                                        <div className="user-dropdown-divider" />
                                        <button className="user-dropdown-item user-dropdown-logout" onClick={handleLogout}>
                                            <FiLogOut size={16} /> {t('nav_logout')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="auth-buttons">
                                <Link to="/login" className="btn btn-ghost btn-sm" id="login-btn">{t('nav_login')}</Link>
                                <Link to="/register" className="btn btn-primary btn-sm" id="register-btn">{t('nav_register')}</Link>
                            </div>
                        )}

                        <button
                            className="mobile-menu-btn"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label="Menu"
                        >
                            {isMobileMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Category Bar */}
                <div className="category-bar">
                    <div className="container category-bar-inner">
                        {categories.map((cat) => (
                            <Link key={cat.slug} to={`/shop?category=${cat.slug}`} className="category-chip">
                                {cat.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Mobile Search Overlay */}
            {isSearchOpen && (
                <div className="mobile-search-overlay animate-fade-in">
                    <form className="mobile-search-form" onSubmit={handleSearch}>
                        <FiSearch size={20} />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder={t('nav_search_placeholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        <button type="button" onClick={() => setIsSearchOpen(false)}>
                            <FiX size={20} />
                        </button>
                    </form>
                </div>
            )}

            {/* Mobile Menu */}
            <div className={`mobile-menu ${isMobileMenuOpen ? 'mobile-menu-open' : ''}`}>
                <div className="mobile-menu-content">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`mobile-nav-link ${location.pathname === link.path ? 'mobile-nav-active' : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}
                    <div className="mobile-menu-divider" />
                    <p className="mobile-menu-subtitle">{t('nav_categories')}</p>
                    <div className="mobile-categories">
                        {categories.map((cat) => (
                            <Link key={cat.slug} to={`/shop?category=${cat.slug}`} className="mobile-category-link">
                                <span>{cat.icon}</span> {cat.label.split(' ').slice(1).join(' ')}
                            </Link>
                        ))}
                    </div>
                    {!isAuthenticated && (
                        <>
                            <div className="mobile-menu-divider" />
                            <div className="mobile-auth-buttons">
                                <Link to="/login" className="btn btn-outline" style={{ flex: 1 }}>{t('nav_login')}</Link>
                                <Link to="/register" className="btn btn-primary" style={{ flex: 1 }}>{t('nav_register')}</Link>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Overlay */}
            {isMobileMenuOpen && <div className="mobile-overlay" onClick={() => setIsMobileMenuOpen(false)} />}
        </>
    );
};

export default Navbar;
