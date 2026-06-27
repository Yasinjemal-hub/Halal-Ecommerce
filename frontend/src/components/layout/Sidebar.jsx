import React from 'react';
import { NavLink } from 'react-router-dom';
import { FiGrid, FiPackage, FiShoppingBag, FiStar, FiSettings, FiBarChart2, FiUsers, FiShield, FiLogOut, FiCheckCircle } from 'react-icons/fi';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const isMerchant = user?.role === 'merchant';
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    const merchantLinks = [
        { path: '/dashboard', label: 'Overview', icon: <FiGrid /> },
        { path: '/dashboard/products', label: 'Products', icon: <FiPackage /> },
        { path: '/dashboard/orders', label: 'Orders', icon: <FiShoppingBag /> },
        { path: '/dashboard/reviews', label: 'Reviews', icon: <FiStar /> },
        { path: '/dashboard/analytics', label: 'Analytics', icon: <FiBarChart2 /> },
        { path: '/dashboard/settings', label: 'Settings', icon: <FiSettings /> },
    ];

    const adminLinks = [
        { path: '/admin', label: 'Overview', icon: <FiGrid /> },
        { path: '/admin/consumers', label: 'Consumers', icon: <FiUsers /> },
        { path: '/admin/merchants', label: 'Merchants', icon: <FiShoppingBag /> },
        { path: '/admin/profile-approvals', label: 'Approvals', icon: <FiCheckCircle /> },
        { path: '/admin/certifications', label: 'Certifications', icon: <FiShield /> },
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
                                {isAdmin ? (user?.role === 'superadmin' ? 'Super Admin' : 'Admin') : 'Merchant'}
                            </span>
                        </div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-nav-section">
                        <span className="sidebar-nav-label">Main Menu</span>
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
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
        </>
    );
};

export default Sidebar;
