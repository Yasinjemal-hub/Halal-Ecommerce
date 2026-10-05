import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid, FiPackage, FiShoppingBag, FiStar, FiSettings, FiBarChart2, FiUsers, FiShield, FiLogOut, FiCheckCircle, FiFileText } from 'react-icons/fi';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import { useLanguage } from '../../i18n/LanguageContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useSelector((state) => state.auth);
    const { t } = useLanguage();
    const dispatch = useDispatch();
    const isMerchant = user?.role === 'merchant';
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const merchantLinks = [
        { path: '/dashboard', label: t('sidebar_overview'), icon: <FiGrid /> },
        { path: '/merchant/register', label: t('sidebar_my_application'), icon: <FiFileText /> },
        { path: '/dashboard/products', label: t('sidebar_products'), icon: <FiPackage /> },
        { path: '/dashboard/orders', label: t('sidebar_orders'), icon: <FiShoppingBag /> },
        { path: '/dashboard/reviews', label: t('sidebar_reviews'), icon: <FiStar /> },
        { path: '/dashboard/analytics', label: t('sidebar_analytics'), icon: <FiBarChart2 /> },
        { path: '/dashboard/settings', label: t('sidebar_settings'), icon: <FiSettings /> },
    ];

    const adminLinks = [
        { path: '/admin', label: t('sidebar_overview'), icon: <FiGrid /> },
        { path: '/admin/consumers', label: t('sidebar_consumers'), icon: <FiUsers /> },
        { path: '/admin/merchants', label: t('sidebar_merchants'), icon: <FiShoppingBag /> },
        { path: '/admin/profile-approvals', label: t('sidebar_approvals'), icon: <FiCheckCircle /> },
        { path: '/admin/certifications', label: t('sidebar_certifications'), icon: <FiShield /> },
    ];

    const links = isAdmin ? adminLinks : merchantLinks;

    return (
        <>
            <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`} id="dashboard-sidebar">
                <div className="sidebar-header">
                    <div className="sidebar-user">
                        <div className="sidebar-avatar">
                            {user?.avatar?.url ? (
                                <img src={user.avatar.url} alt={user.firstName} />
                            ) : (
                                <span>{user?.firstName?.[0] || 'U'}</span>
                            )}
                        </div>
                        <div className="sidebar-user-info">
                            <p className="sidebar-user-name">{user?.firstName} {user?.lastName}</p>
                            <span className={`sidebar-role-badge ${isAdmin ? (user?.role === 'superadmin' ? 'role-superadmin' : 'role-admin') : 'role-merchant'}`}>
                                {isAdmin ? (user?.role === 'superadmin' ? t('sidebar_role_superadmin') : t('sidebar_role_admin')) : t('sidebar_role_merchant')}
                            </span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-nav-section">
                        <span className="sidebar-nav-label">{t('sidebar_main_menu')}</span>
                        {links.map((link) => (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                end={link.path === '/dashboard' || link.path === '/admin'}
                                className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                                onClick={onClose}
                            >
                                <span className="sidebar-link-icon">{link.icon}</span>
                                <span>{link.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button className="sidebar-link sidebar-logout" onClick={() => dispatch(logout())}>
                        <span className="sidebar-link-icon"><FiLogOut /></span>
                        <span>{t('nav_logout')}</span>
                    </button>
                </div>
            </aside>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
        </>
    );
};

export default Sidebar;
