import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  FiPackage,
  FiClock,
  FiCheckCircle,
  FiTruck,
  FiX,
  FiChevronRight,
  FiStar,
} from "react-icons/fi";
import orderService from "../services/orderService";
import Loader from "../components/common/Loader";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { backendError } from "../utils/backendErrors";
import "./Orders.css";

const STATUS_KEYS = {
  all: "ord_all",
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

const PAYMENT_KEYS = {
  telebirr: "checkout_telebirr",
  cbe_birr: "checkout_cbe",
  amole: "checkout_amole",
  bank_transfer: "checkout_bank",
  cash_on_delivery: "checkout_cod",
};

const Orders = () => {
  const { user } = useSelector((state) => state.auth);
  const { t, formatETB, formatDate } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await orderService.getMyOrders();
      setOrders(response.orders || response.data || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      const message = backendError(t, error, "err_load_orders");
      setLoadError(message);
      toast.error(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <FiClock className="status-icon pending" />;
      case "confirmed":
      case "processing":
      case "shipped":
        return <FiTruck className="status-icon processing" />;
      case "delivered":
        return <FiCheckCircle className="status-icon delivered" />;
      case "cancelled":
        return <FiX className="status-icon cancelled" />;
      default:
        return <FiPackage className="status-icon" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#f97316";
      case "confirmed":
      case "processing":
        return "#3b82f6";
      case "shipped":
      case "out_for_delivery":
        return "#6366f1";
      case "delivered":
        return "#10b981";
      case "cancelled":
        return "#ef4444";
      case "return_requested":
        return "#eab308";
      case "returned":
      case "refunded":
        return "#8b5cf6";
      default:
        return "#6b7280";
    }
  };

  const formatStatus = (status) => t(STATUS_KEYS[status] || "ord_unknown");
  const formatPayment = (method) => t(PAYMENT_KEYS[method] || "ord_unknown");

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });

  if (!user) {
    return (
      <div className="orders-page">
        <div className="container">
          <div className="empty-state">
            <FiPackage size={48} />
            <h2>{t('ord_signin')}</h2>
            <p>{t('ord_signin_desc')}</p>
            <Link to="/login" className="btn btn-primary">
              {t('ord_go_login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loader size="page" text={t('ord_loading')} />;
  }

  if (loadError && orders.length === 0) {
    return (
      <div className="orders-page">
        <div className="container">
          <div className="orders-header">
            <h1>{t('ord_title')}</h1>
            <p className="subtitle">{t('ord_subtitle')}</p>
          </div>
          <div className="empty-state">
            <h2>{t('ord_load_error')}</h2>
            <p>{loadError}</p>
            <button type="button" className="btn btn-primary" onClick={fetchOrders}>
              {t('ord_retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Consumer cancellation: pending/confirmed -> cancelled (via PUT /:id/cancel)
  const handleCancelOrder = async (orderId) => {
    try {
      await orderService.cancel(orderId);
      toast.success(t('ord_cancelled_ok'));
      fetchOrders();
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast.error(backendError(t, error, "err_cancel_order"));
    }
  };

  // Consumer return request: delivered -> return_requested (via PUT /:id/return)
  const handleReturnOrder = async (orderId) => {
    try {
      await orderService.requestReturn(orderId);
      toast.success(t('ord_return_ok'));
      fetchOrders();
    } catch (error) {
      console.error("Failed to request return:", error);
      toast.error(backendError(t, error, "err_return_order"));
    }
  };

  return (
    <div className="orders-page">
      <div className="container">
        {/* Header */}
        <div className="orders-header">
          <h1>{t('ord_title')}</h1>
          <p className="subtitle">
            {t('ord_subtitle')}
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="orders-filters">
          {Object.keys(STATUS_KEYS).map((status) => (
            <button
              key={status}
              className={`filter-btn ${filter === status ? "active" : ""}`}
              onClick={() => setFilter(status)}
            >
              {formatStatus(status)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            {/* <FiPackage size={48} /> */}
            <h2>{t('ord_no_orders')}</h2>
            <p>
              {filter === "all"
                ? t('ord_no_orders_all')
                : t('ord_no_orders_status', { status: formatStatus(filter) })}
            </p>
            <Link to="/shop" className="btn btn-primary">
              {t('ord_continue')}
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header-row">
                  <div className="order-number-section">
                    <h3 className="order-number">
                      {t('ord_order')} #{order._id.slice(-8).toUpperCase()}
                    </h3>
                    <p className="order-date">
                      {formatDate(order.createdAt, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="order-status-section">
                    <div
                      className="status-badge"
                      style={{ borderColor: getStatusColor(order.status) }}
                    >
                      {getStatusIcon(order.status)}
                      <span className="status-text">
                        {formatStatus(order.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="order-items">
                  <h4 className="items-heading">{t('ord_items')}</h4>
                  <div className="items-list">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="order-item-row">
                          <div className="item-info">
                            <p className="item-name">
                              {item.product?.name ||
                                item.productName ||
                                t('ord_product')}
                            </p>
                            <p className="item-qty">
                              {t('ord_qty')} <strong>{item.quantity}</strong>
                            </p>
                          </div>
                          <p className="item-price">
                            {formatETB(
                              (item.price || 0) * (item.quantity || 1)
                            )}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="no-items">{t('ord_no_items')}</p>
                    )}
                  </div>
                </div>

                {/* Shipping Details */}
                <div className="order-details">
                  <div className="detail-group">
                    <label>{t('ord_shipping')}</label>
                    <p>
                      {order.shippingAddress?.fullName}
                      <br />
                      {order.shippingAddress?.street}
                      <br />
                      {order.shippingAddress?.subcity},{" "}
                      {order.shippingAddress?.city}
                      <br />
                      {order.shippingAddress?.region}
                      <br />
                      {order.shippingAddress?.phone}
                    </p>
                  </div>
                  <div className="detail-group">
                    <label>{t('ord_payment')}</label>
                    <p>{formatPayment(order.paymentMethod)}</p>
                  </div>
                  <div className="detail-group">
                    <label>{t('ord_total')}</label>
                    <p className="total-amount">
                      {formatETB(order.totalPrice || 0)}
                    </p>
                  </div>
                </div>

                {/* Order Footer */}
                <div className="order-footer">
                  {order.status === "delivered" && (
                    <Link
                      to={`/orders/${order._id}`}
                      className="btn btn-primary"
                    >
                      <FiStar size={16} /> {t('ord_rate')}
                    </Link>
                  )}
                  {(order.status === "pending" || order.status === "confirmed") && (
                    <button
                      className="cancel-btn"
                      onClick={() => handleCancelOrder(order._id)}
                    >
                      {t('ord_cancel')}
                    </button>
                  )}
                  {order.status === "delivered" && (
                    <button
                      className="cancel-btn"
                      onClick={() => handleReturnOrder(order._id)}
                    >
                      {t('ord_return')}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;
