import React, { useCallback, useEffect, useState } from "react";
import {
  FiUsers,
  FiShoppingBag,
  FiShield,
  FiPackage,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiFileText,
} from "react-icons/fi";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import adminService from "../../services/adminService";
import { useLanguage } from "../../i18n/LanguageContext";
import "./Dashboard.css";

const QUEUE_STATUS_KEYS = {
  pending: "appst_st_pending",
  under_review: "appst_st_under_review",
  approved: "appst_st_approved",
  rejected: "appst_st_rejected",
  suspended: "appst_st_suspended",
};

const QUEUE_TYPE_KEYS = {
  restaurant: "mtype_restaurant",
  grocery: "mtype_grocery",
  butcher: "mtype_butcher",
  bakery: "mtype_bakery",
  spice_shop: "mtype_spice_shop",
  clothing: "mtype_clothing",
  cosmetics: "mtype_cosmetics",
  wholesale: "mtype_wholesale",
  supermarket: "mtype_supermarket",
  other: "mtype_other",
};

// NOTE: This dashboard renders only live data from authorized API
// endpoints. Statistics without a trustworthy server calculation are
// omitted (no trend claims), and every figure below is a database count
// defined in GET /api/admin/dashboard. Approval/rejection decisions are
// never made here — each application links to its full detail review
// workspace at /admin/merchants/:id.
const REVIEW_QUEUE_LIMIT = 5;

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { t, formatNumber, formatDate } = useLanguage();

  // ── Statistics slice (independent from the review-queue slice) ──
  const [stats, setStats] = useState(null);
  const [statsState, setStatsState] = useState("loading"); // loading | success | error

  // ── Review-queue slice (pending + under_review applications) ──
  const [queue, setQueue] = useState([]);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueState, setQueueState] = useState("loading"); // loading | success | error

  const loadStats = useCallback(async () => {
    setStatsState("loading");
    try {
      const res = await adminService.getDashboard();
      setStats(res.stats || null);
      setStatsState("success");
    } catch (err) {
      setStatsState("error");
    }
  }, []);

  const loadQueue = useCallback(async () => {
    setQueueState("loading");
    try {
      const res = await adminService.getAllMerchants({
        verificationStatus: "pending,under_review",
        limit: REVIEW_QUEUE_LIMIT,
        sort: "newest",
      });
      setQueue(res.merchants || []);
      setQueueTotal(res.total || 0);
      setQueueState("success");
    } catch (err) {
      setQueueState("error");
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadQueue();
  }, [loadStats, loadQueue]);

  const num = (v) => (v === null || v === undefined ? "—" : formatNumber(v));

  const statCards = stats
    ? [
        {
          label: t("adm_stat_users"),
          sub: t("adm_stat_users_sub"),
          value: num(stats.totalUsers),
          icon: <FiUsers />,
          color: "#0D7C3D",
        },
        {
          label: t("adm_stat_active"),
          sub: t("adm_stat_active_sub"),
          value: num(stats.activeMerchants),
          icon: <FiShoppingBag />,
          color: "#2563eb",
        },
        {
          label: t("adm_stat_needs"),
          sub: t("adm_stat_needs_sub"),
          value: num(stats.needsReviewMerchants),
          icon: <FiClock />,
          color: "#d97706",
        },
        {
          label: t("adm_stat_orders"),
          sub: t("adm_stat_orders_sub"),
          value: num(stats.totalOrders),
          icon: <FiPackage />,
          color: "#7c3aed",
        },
        {
          label: t("adm_stat_revenue"),
          sub: t("adm_stat_revenue_sub"),
          value: num(stats.totalRevenue),
          icon: <FiDollarSign />,
          color: "#059669",
        },
        {
          label: t("adm_stat_issued"),
          sub: t("adm_stat_issued_sub"),
          value: num(stats.issuedCertifications),
          icon: <FiShield />,
          color: "#D4A017",
        },
        {
          label: t("adm_stat_pending"),
          sub: t("adm_stat_pending_sub"),
          value: num(stats.pendingCertifications),
          icon: <FiAlertCircle />,
          color: "#e11d48",
        },
        {
          label: t("adm_stat_merchants"),
          sub: t("adm_stat_merchants_sub"),
          value: num(stats.totalMerchants),
          icon: <FiFileText />,
          color: "#475569",
        },
      ]
    : [];

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">{t("adm_title")}</h1>
          <p className="text-body">
            {t("adm_welcome", { name: user?.firstName || t("adm_admin_fallback") })}
          </p>
        </div>
      </div>

      {/* Stats Grid — live database counts only, no trend claims */}
      {statsState === "loading" && (
        <div className="dashboard-stats" data-testid="admin-stats-loading" aria-busy="true">
          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-value">…</span>
              <span className="stat-label">{t("adm_loading")}</span>
            </div>
          </div>
        </div>
      )}

      {statsState === "error" && (
        <div className="dashboard-section" data-testid="admin-stats-error">
          <h2>{t("adm_stats_unavailable")}</h2>
          <p className="text-body">
            {t("adm_stats_desc")}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-testid="retry-admin-stats"
            onClick={loadStats}
          >
            {t("ord_retry")}
          </button>
        </div>
      )}

      {statsState === "success" && (
        <div className="dashboard-stats" data-testid="admin-stats">
          {statCards.map((stat) => (
            <div key={stat.label} className="stat-card" data-testid="admin-stat-card">
              <div
                className="stat-icon"
                style={{ background: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div className="stat-info">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
                <span className="stat-change" style={{ color: "var(--text-tertiary)" }}>
                  {stat.sub}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review queue — real applications, decisions only in the workspace */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <h2>
            <FiAlertCircle /> {t("adm_review_title")}
          </h2>
          <Link to="/admin/merchants" className="btn btn-ghost btn-sm">
            {t("dash_view_all")}
          </Link>
        </div>

        {queueState === "loading" && (
          <p className="text-body" data-testid="admin-queue-loading">
            {t("adm_queue_loading")}
          </p>
        )}

        {queueState === "error" && (
          <div data-testid="admin-queue-error">
            <p className="text-body">
              {t("adm_queue_error")}
            </p>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              data-testid="retry-admin-queue"
              onClick={loadQueue}
            >
              {t("ord_retry")}
            </button>
          </div>
        )}

        {queueState === "success" && queue.length === 0 && (
          <div data-testid="admin-queue-empty">
            <p className="text-body">
              <FiCheckCircle color="#059669" /> {t("adm_queue_empty")}
            </p>
          </div>
        )}

        {queueState === "success" && queue.length > 0 && (
          <>
            <p className="text-body" aria-live="polite">
              {t("adm_showing", { shown: queue.length, total: queueTotal })}
            </p>
            <div className="verification-list" data-testid="admin-queue">
              {queue.map((m) => (
                <div key={m._id} className="verification-card">
                  <div className="verification-info">
                    <h4>{m.businessName}</h4>
                    <p>
                      {t(QUEUE_TYPE_KEYS[m.businessType] || "mtype_other")} • {t("adm_applied")}{" "}
                      {m.createdAt
                        ? formatDate(m.createdAt)
                        : t("adm_date_unknown")}
                    </p>
                  </div>
                  <div className="verification-status">
                    {m.verificationStatus === "pending" ? (
                      <FiClock color="#d97706" />
                    ) : (
                      <FiCheckCircle color="#2563eb" />
                    )}
                    <span>{t(QUEUE_STATUS_KEYS[m.verificationStatus] || "appst_st_pending")}</span>
                  </div>
                  {/* No direct approve/reject here by design — the full
                      application must be reviewed before any decision. */}
                  <div className="verification-actions">
                    <Link
                      to={`/admin/merchants/${m._id}`}
                      className="btn btn-primary btn-sm"
                    >
                      {t("adm_review_btn")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
