import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiStar,
  FiTrendingUp,
  FiPlus,
  FiEye,
  FiFileText,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import merchantService from "../../services/merchantService";
import orderService from "../../services/orderService";
import { isCertificateIssued, isMerchantHalalVerified } from "../../utils/certification";
import { useLanguage } from "../../i18n/LanguageContext";
import { backendError } from "../../utils/backendErrors";
import { selectCartCount } from "../../redux/slices/cartSlice";
import { selectWishlistCount } from "../../redux/slices/wishlistSlice";
import "./Dashboard.css";

const DASH_STATUS_KEYS = {
  pending: "ord_st_pending",
  confirmed: "ord_st_confirmed",
  processing: "ord_st_processing",
  shipped: "ord_st_shipped",
  out_for_delivery: "ord_st_out_for_delivery",
  delivered: "ord_st_delivered",
  return_requested: "ord_st_return_requested",
  returned: "ord_st_returned",
  refunded: "ord_st_refunded",
  cancelled: "ord_st_cancelled",
};

const APP_STATUS_KEYS = {
  pending: "appst_st_pending",
  under_review: "appst_st_under_review",
  approved: "appst_st_approved",
  rejected: "appst_st_rejected",
  suspended: "appst_st_suspended",
};

// NOTE: This dashboard renders only real data belonging to the signed-in
// merchant. There are intentionally no hard-coded statistics, trend labels,
// or sample orders anywhere in this file. The backend supplies no
// time-period trend data, so stat cards render no trend line at all.
const RECENT_ORDERS_LIMIT = 5;

const MerchantDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const { t, tp, formatETB, formatNumber, formatDate } = useLanguage();
  const cartCount = useSelector(selectCartCount);
  const wishlistCount = useSelector(selectWishlistCount);
  const navigate = useNavigate();
  const formatOrderStatus = (status) => t(DASH_STATUS_KEYS[status] || "ord_unknown");

  const isMerchant = user?.role === "merchant";
  const userId = user?._id;

  // ── Merchant profile slice (independent from orders slice) ──
  const [merchantProfile, setMerchantProfile] = useState(null);
  const [profileState, setProfileState] = useState("loading"); // loading | success | error

  // ── Merchant recent-orders slice (independent from profile slice) ──
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersState, setOrdersState] = useState("loading"); // loading | success | error

  // ── Consumer orders (non-merchant view) ──
  const [consumerOrders, setConsumerOrders] = useState([]);
  const [consumerOrdersState, setConsumerOrdersState] = useState("loading");

  // Guards against stale responses after the signed-in user changes.
  const activeUserRef = useRef(userId);
  useEffect(() => {
    activeUserRef.current = userId;
  }, [userId]);

  const loadProfile = useCallback(async () => {
    const uid = activeUserRef.current;
    if (!uid) return;
    setProfileState("loading");
    try {
      const profileData = await merchantService.getMyProfile();
      if (activeUserRef.current !== uid) return; // stale: user changed
      setMerchantProfile(profileData.merchant || profileData);
      setProfileState("success");
    } catch (error) {
      if (activeUserRef.current !== uid) return; // stale: user changed
      setProfileState("error");
    }
  }, []);

  const loadMerchantOrders = useCallback(async () => {
    const uid = activeUserRef.current;
    if (!uid) return;
    setOrdersState("loading");
    try {
      const ordersData = await orderService.getMerchantOrders({
        limit: RECENT_ORDERS_LIMIT,
      });
      if (activeUserRef.current !== uid) return; // stale: user changed
      setRecentOrders(ordersData.orders || []);
      setOrdersState("success");
    } catch (error) {
      if (activeUserRef.current !== uid) return; // stale: user changed
      setOrdersState("error");
    }
  }, []);

  const loadConsumerOrders = useCallback(async () => {
    const uid = activeUserRef.current;
    if (!uid) return;
    setConsumerOrdersState("loading");
    try {
      const ordersData = await orderService.getMyOrders({
        limit: RECENT_ORDERS_LIMIT,
      });
      if (activeUserRef.current !== uid) return; // stale: user changed
      setConsumerOrders(ordersData.orders || []);
      setConsumerOrdersState("success");
    } catch (error) {
      if (activeUserRef.current !== uid) return; // stale: user changed
      setConsumerOrdersState("error");
    }
  }, []);

  // Profile and orders load independently: a failure in one never blocks
  // the other.
  useEffect(() => {
    if (!userId) return;
    if (isMerchant) {
      loadProfile();
      loadMerchantOrders();
    } else {
      loadConsumerOrders();
    }
  }, [userId, isMerchant, loadProfile, loadMerchantOrders, loadConsumerOrders]);

  const formatCount = (value) => formatNumber(value ?? 0);

  // Stat cards carry the (ETB) unit in their label, so values stay plain
  // locale-grouped numbers (matching the established dashboard design).
  const formatMoney = (value) => formatNumber(value ?? 0);

  const ratingsCount = merchantProfile?.ratingsCount ?? 0;
  const merchantStats = [
    {
      label: t("dash_stat_products"),
      value: formatCount(merchantProfile?.totalProducts),
      icon: <FiPackage />,
      color: "#0D7C3D",
    },
    {
      label: t("dash_stat_orders"),
      value: formatCount(merchantProfile?.totalOrders),
      icon: <FiShoppingBag />,
      color: "#2563eb",
    },
    {
      label: t("dash_stat_revenue"),
      value: formatMoney(merchantProfile?.totalRevenue),
      icon: <FiDollarSign />,
      color: "#D4A017",
    },
    {
      label: t("dash_stat_rating"),
      value:
        ratingsCount > 0 && merchantProfile?.ratingsAverage !== undefined
          ? Number(merchantProfile.ratingsAverage).toFixed(1)
          : "—",
      sub: tp("dash_stat_reviews", ratingsCount),
      icon: <FiStar />,
      color: "#7c3aed",
    },
  ];

  // Consumer view uses only real data too (no invented trend labels).
  const totalSpend = consumerOrders.reduce(
    (sum, order) => sum + Number(order.totalPrice || 0),
    0,
  );

  const consumerStats = [
    {
      label: t("dash_stat_placed"),
      value: formatCount(consumerOrders.length),
      icon: <FiShoppingBag />,
      color: "#2563eb",
    },
    {
      label: t("dash_stat_saved"),
      value: formatCount(wishlistCount),
      icon: <FiStar />,
      color: "#7c3aed",
    },
    {
      label: t("dash_stat_cart"),
      value: formatCount(cartCount),
      icon: <FiPackage />,
      color: "#0D7C3D",
    },
    {
      label: t("dash_stat_spend"),
      value: formatMoney(totalSpend),
      icon: <FiDollarSign />,
      color: "#D4A017",
    },
  ];

  const stats = isMerchant ? merchantStats : consumerStats;
  const statsState = isMerchant ? profileState : consumerOrdersState;
  const retryStats = isMerchant ? loadProfile : loadConsumerOrders;

  const statusColors = {
    pending: "#d97706",
    confirmed: "#2563eb",
    processing: "#2563eb",
    shipped: "#7c3aed",
    out_for_delivery: "#7c3aed",
    delivered: "#059669",
    cancelled: "#dc2626",
    return_requested: "#eab308",
    returned: "#8b5cf6",
    refunded: "#8b5cf6",
  };

  // Merchant fulfilment chain — mirrors backend/utils/orderTransitions.js
  // (MERCHANT_ADVANCE_CHAIN). Merchants advance only their own orders;
  // cancellation / returns / refunds are handled via consumer/admin flows.
  const getNextOrderStatus = (status) => {
    const chain = {
      pending: "confirmed",
      confirmed: "processing",
      processing: "shipped",
      shipped: "out_for_delivery",
      out_for_delivery: "delivered",
    };
    return chain[status] || null;
  };

  const handleUpdateOrderStatus = async (order) => {
    const orderApiId = order._id;
    if (!orderApiId) {
      toast.error(t("dash_missing_id"));
      return;
    }
    const nextStatus = getNextOrderStatus(order.status);
    if (!nextStatus) {
      toast(t("dash_no_updates"));
      return;
    }

    try {
      await orderService.updateStatus(orderApiId, nextStatus);
      setRecentOrders((prev) =>
        prev.map((o) =>
          o._id === orderApiId ? { ...o, status: nextStatus } : o,
        ),
      );
      toast.success(t("dash_status_updated", { status: formatOrderStatus(nextStatus) }));
    } catch (err) {
      toast.error(backendError(t, err, "dash_status_failed"));
    }
  };

  const formatCustomerName = (orderUser) => {
    if (!orderUser) return t("dash_customer");
    const full = `${orderUser.firstName || ""} ${orderUser.lastName || ""}`.trim();
    return full || t("dash_customer");
  };

  const orderSubtotal = (order) => {
    if (order.merchantSubtotal !== undefined && order.merchantSubtotal !== null) {
      return formatNumber(Number(order.merchantSubtotal));
    }
    return formatNumber((order.items || [])
      .reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0));
  };

  const orderItemCount = (order) => {
    if (order.merchantItemCount !== undefined && order.merchantItemCount !== null) {
      return order.merchantItemCount;
    }
    return (order.items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">
            {t("dash_welcome", { name: user?.firstName || t("dash_merchant_fallback") })}
          </h1>
          <p className="text-body">
            {isMerchant ? t("dash_merchant_sub") : t("dash_consumer_sub")}
          </p>
        </div>
        {isMerchant && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {profileState === "success" && merchantProfile?.verificationStatus === "approved" ? (
              <Link to="/dashboard/products" className="btn btn-primary">
                <FiPlus /> {t("dash_add_product")}
              </Link>
            ) : (
              <Link to="/merchant/register" className="btn btn-primary">
                <FiFileText /> {t("dash_my_app")}
              </Link>
            )}
            <Link to="/shop" className="btn btn-ghost">
              <FiEye /> {t("dash_view_shop")}
            </Link>
          </div>
        )}
      </div>

      {/* Stats Grid — real values only, no trend lines */}
      {statsState === "loading" && (
        <div className="dashboard-stats" data-testid="stats-loading" aria-busy="true">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <div
                className="stat-icon"
                style={{ background: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div className="stat-info">
                <span className="stat-value">…</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
          <p className="text-body">{t("dash_loading_stats")}</p>
        </div>
      )}

      {statsState === "error" && (
        <div className="dashboard-section" data-testid="stats-error">
          <h2>{t("dash_stats_unavailable")}</h2>
          <p className="text-body">
            {t("dash_stats_retry_desc")}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-testid="retry-stats"
            onClick={retryStats}
          >
            {t("ord_retry")}
          </button>
        </div>
      )}

      {statsState !== "loading" && statsState !== "error" && (
        <div className="dashboard-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card" data-testid="stat-card">
              <div
                className="stat-icon"
                style={{ background: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div className="stat-info">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
                {stat.sub && <span className="stat-change">{stat.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Consumer quick links + recent orders */}
      {!isMerchant && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>{t("dash_quick_links")}</h2>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link to="/dashboard/settings" className="btn btn-ghost btn-sm">
              {t("dash_profile_settings")}
            </Link>
            <Link to="/orders" className="btn btn-ghost btn-sm">
              {t("nav_my_orders")}
            </Link>
            <Link to="/wishlist" className="btn btn-ghost btn-sm">
              {t("nav_wishlist")}
            </Link>
            <Link to="/cart" className="btn btn-ghost btn-sm">
              {t("dash_cart")}
            </Link>
            <Link to="/shop" className="btn btn-ghost btn-sm">
              {t("wishlist_continue")}
            </Link>
          </div>
        </div>
      )}

      {!isMerchant && consumerOrdersState === 'loading' && (
        <div className="dashboard-section" data-testid="consumer-orders-loading">
          <p className="text-body">{t("dash_loading_orders")}</p>
        </div>
      )}

      {!isMerchant && consumerOrdersState === 'error' && (
        <div className="dashboard-section" data-testid="consumer-orders-error">
          <h2>{t("dash_orders_unavailable")}</h2>
          <p className="text-body">{t("dash_orders_retry_desc")}</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-testid="retry-consumer-orders"
            onClick={loadConsumerOrders}
          >
            {t("ord_retry")}
          </button>
        </div>
      )}

      {!isMerchant && consumerOrdersState === 'success' && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>{t("dash_recent_orders")}</h2>
            <Link to="/orders" className="btn btn-ghost btn-sm">
              {t("dash_view_all")}
            </Link>
          </div>
          {consumerOrders.length === 0 ? (
            <div data-testid="consumer-orders-empty">
              <p className="text-body">{t("dash_no_orders")}</p>
              <p className="text-body">
                <Link to="/shop">{t("dash_browse_cta")}</Link>
              </p>
            </div>
          ) : (
            <div className="dashboard-table-wrapper" data-testid="consumer-orders-table">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>{t("dash_th_order")}</th>
                    <th>{t("dash_th_date")}</th>
                    <th>{t("dash_th_status")}</th>
                    <th>{t("dash_th_total")}</th>
                    <th>{t("dash_th_action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {consumerOrders.slice(0, RECENT_ORDERS_LIMIT).map((order) => (
                    <tr key={order._id}>
                      <td className="order-id">{order.orderNumber || String(order._id).slice(-8).toUpperCase()}</td>
                      <td>{order.createdAt ? formatDate(order.createdAt) : '—'}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background: `${statusColors[order.status] || '#6b7280'}15`,
                            color: statusColors[order.status] || '#6b7280',
                          }}
                        >
                          {formatOrderStatus(order.status)}
                        </span>
                      </td>
                      <td className="order-total">{formatETB(order.totalPrice || 0)}</td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/orders/${order._id}`)}
                        >
                          <FiEye size={14} /> {t("dash_view")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Application & certificate status (merchant only) */}
      {isMerchant && profileState === "success" && merchantProfile && (
        <div className="dashboard-section" data-testid="application-status-card">
          <div className="dashboard-section-header">
            <h2>
              <FiFileText /> {t("dash_app_cert")}
            </h2>
            <Link to="/merchant/register" className="btn btn-ghost btn-sm">
              {t("dash_open_app")}
            </Link>
          </div>
          <p className="text-body">
            {t("dash_business")}{' '}
            <strong style={{ textTransform: "capitalize" }}>
              {t(APP_STATUS_KEYS[merchantProfile.verificationStatus] || "appst_st_pending")}
            </strong>
            {' '}• {t("dash_cert")}{' '}
            {isCertificateIssued(merchantProfile.halalCertification, merchantProfile) ? (
              <strong>
                {t("dash_cert_issued", { number: merchantProfile.halalCertification.certificateNumber })}
              </strong>
            ) : merchantProfile.verificationStatus === "approved" ? (
              <strong>{t("dash_cert_preparing")}</strong>
            ) : (
              <strong>{t("dash_cert_auto")}</strong>
            )}
          </p>
          {isMerchantHalalVerified(merchantProfile) && (
            <p className="text-body" style={{ color: 'var(--success)', fontWeight: 600 }}>
              {t("dash_congrats")}
            </p>
          )}
        </div>
      )}

      {/* Recent Orders (merchant only) */}
      {isMerchant && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>{t("dash_recent_orders")}</h2>
            <Link to="/dashboard/orders" className="btn btn-ghost btn-sm">
              {t("dash_view_all")}
            </Link>
          </div>

          {ordersState === "loading" && (
            <p className="text-body" data-testid="orders-loading">
              {t("dash_loading_orders")}
            </p>
          )}

          {ordersState === "error" && (
            <div data-testid="orders-error">
              <p className="text-body">
                {t("dash_orders_retry_desc")}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                data-testid="retry-orders"
                onClick={loadMerchantOrders}
              >
                {t("ord_retry")}
              </button>
            </div>
          )}

          {ordersState === "success" && recentOrders.length === 0 && (
            <div data-testid="orders-empty">
              <p className="text-body">{t("dash_no_recent")}</p>
              <p className="text-body">
                {t("dash_no_recent_desc")}
              </p>
            </div>
          )}

          {ordersState === "success" && recentOrders.length > 0 && (
            <div className="dashboard-table-wrapper" data-testid="orders-table">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>{t("dash_th_order")}</th>
                    <th>{t("dash_th_customer")}</th>
                    <th>{t("dash_th_items")}</th>
                    <th>{t("dash_th_total")}</th>
                    <th>{t("dash_th_status")}</th>
                    <th>{t("dash_th_action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order._id}>
                      <td className="order-id">{order.orderNumber || order._id}</td>
                      <td>{formatCustomerName(order.user)}</td>
                      <td>{orderItemCount(order)}</td>
                      <td className="order-total">{orderSubtotal(order)} {t('etb')}</td>
                      <td>
                        <span
                          className="status-badge"
                          style={{
                            background: `${statusColors[order.status] || "#6b7280"}15`,
                            color: statusColors[order.status] || "#6b7280",
                          }}
                        >
                          {formatOrderStatus(order.status)}
                        </span>
                      </td>
                      <td style={{ display: "flex", gap: "8px" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => navigate(`/orders/${order._id}`)}
                        >
                          <FiEye size={14} /> {t("dash_view")}
                        </button>

                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleUpdateOrderStatus(order)}
                          disabled={!getNextOrderStatus(order.status)}
                        >
                          <FiTrendingUp size={14} /> {t("dash_advance")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MerchantDashboard;
