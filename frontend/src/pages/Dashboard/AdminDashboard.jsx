import React from "react";
import {
  FiUsers,
  FiShoppingBag,
  FiShield,
  FiPackage,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import "./Dashboard.css";

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);

  const stats = [
    {
      label: "Total Users",
      value: "12,450",
      icon: <FiUsers />,
      color: "#0D7C3D",
      change: "+120 this month",
    },
    {
      label: "Active Merchants",
      value: "534",
      icon: <FiShoppingBag />,
      color: "#2563eb",
      change: "+23 this month",
    },
    {
      label: "Certifications",
      value: "312",
      icon: <FiShield />,
      color: "#D4A017",
      change: "15 pending",
    },
    {
      label: "Total Orders",
      value: "8,920",
      icon: <FiPackage />,
      color: "#7c3aed",
      change: "+340 this week",
    },
  ];

  const pendingVerifications = [
    {
      id: 1,
      name: "Harar Spice Market",
      type: "spice_shop",
      status: "pending",
      applied: "2 days ago",
    },
    {
      id: 2,
      name: "Addis Halal Foods",
      type: "grocery",
      status: "under_review",
      applied: "5 days ago",
    },
    {
      id: 3,
      name: "Oromia Teff Farm",
      type: "wholesale",
      status: "pending",
      applied: "1 day ago",
    },
  ];

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">Admin Panel</h1>
          <p className="text-body">
            Welcome, {user?.firstName || "Admin"}. Monitor and manage the
            platform.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="dashboard-stats">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div
              className="stat-icon"
              style={{ background: `${stat.color}15`, color: stat.color }}
            >
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
              <span className="stat-change">
                <FiTrendingUp size={12} /> {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Verifications */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h2>
            <FiAlertCircle /> Pending Merchant Verifications
          </h2>
          <Link to="/admin/merchants" className="btn btn-ghost btn-sm">
            View All
          </Link>
        </div>
        <div className="verification-list">
          {pendingVerifications.map((v) => (
            <div key={v.id} className="verification-card">
              <div className="verification-info">
                <h4>{v.name}</h4>
                <p>
                  {v.type.replace("_", " ")} • Applied {v.applied}
                </p>
              </div>
              <div className="verification-status">
                {v.status === "pending" ? (
                  <FiClock color="#d97706" />
                ) : (
                  <FiCheckCircle color="#2563eb" />
                )}
                <span>{v.status.replace("_", " ")}</span>
              </div>
              <div className="verification-actions">
                <button className="btn btn-primary btn-sm">Approve</button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: "var(--error)" }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
