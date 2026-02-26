import React from 'react';
import { FiPackage, FiShoppingBag, FiDollarSign, FiStar, FiTrendingUp, FiPlus, FiEye } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import './Dashboard.css';

const MerchantDashboard = () => {
    const { user } = useSelector((state) => state.auth);

    const stats = [
        { label: 'Total Products', value: '24', icon: <FiPackage />, color: '#0D7C3D', change: '+3 this month' },
        { label: 'Total Orders', value: '156', icon: <FiShoppingBag />, color: '#2563eb', change: '+12 this week' },
        { label: 'Revenue (ETB)', value: '45,230', icon: <FiDollarSign />, color: '#D4A017', change: '+8.4%' },
        { label: 'Avg Rating', value: '4.7', icon: <FiStar />, color: '#7c3aed', change: '89 reviews' },
    ];

    const recentOrders = [
        { id: 'HE-260225-AB12CD', customer: 'Amina M.', items: 3, total: '2,340', status: 'processing' },
        { id: 'HE-260224-EF34GH', customer: 'Hassan I.', items: 1, total: '850', status: 'shipped' },
        { id: 'HE-260223-IJ56KL', customer: 'Fatima A.', items: 5, total: '5,120', status: 'delivered' },
        { id: 'HE-260222-MN78OP', customer: 'Ahmed K.', items: 2, total: '1,680', status: 'pending' },
    ];

    const statusColors = {
        pending: '#d97706', processing: '#2563eb', shipped: '#7c3aed', delivered: '#059669', cancelled: '#dc2626',
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-welcome">
                <div>
                    <h1 className="heading-section">Welcome back, {user?.firstName || 'Merchant'} 👋</h1>
                    <p className="text-body">Here's what's happening with your store today.</p>
                </div>
                <Link to="/dashboard/products/new" className="btn btn-primary">
                    <FiPlus /> Add Product
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="dashboard-stats">
                {stats.map((stat) => (
                    <div key={stat.label} className="stat-card">
                        <div className="stat-icon" style={{ background: `${stat.color}15`, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className="stat-info">
                            <span className="stat-value">{stat.value}</span>
                            <span className="stat-label">{stat.label}</span>
                            <span className="stat-change"><FiTrendingUp size={12} /> {stat.change}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Orders */}
            <div className="dashboard-section">
                <div className="dashboard-section-header">
                    <h2>Recent Orders</h2>
                    <Link to="/dashboard/orders" className="btn btn-ghost btn-sm">View All</Link>
                </div>
                <div className="dashboard-table-wrapper">
                    <table className="dashboard-table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentOrders.map((order) => (
                                <tr key={order.id}>
                                    <td className="order-id">{order.id}</td>
                                    <td>{order.customer}</td>
                                    <td>{order.items}</td>
                                    <td className="order-total">{order.total} ETB</td>
                                    <td>
                                        <span className="status-badge" style={{ background: `${statusColors[order.status]}15`, color: statusColors[order.status] }}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-sm"><FiEye size={14} /> View</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MerchantDashboard;
