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
import "./Orders.css";

const Orders = () => {
  const { user } = useSelector((state) => state.auth);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await orderService.getMyOrders();
      setOrders(response.orders || response.data || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders. Please try again.");
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
        return "#6366f1";
      case "delivered":
        return "#10b981";
      case "cancelled":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const formatStatus = (status) => {
    const safeStatus = String(status || "unknown");
    return safeStatus
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

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
            <h2>Sign In Required</h2>
            <p>Please log in to view your orders</p>
            <Link to="/login" className="btn btn-primary">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loader size="page" text="Loading your orders..." />;
  }

  const handleCancelOrder = async (orderId) => {
    try {
      await orderService.cancel(orderId);
      toast.success("Order cancelled successfully");
      fetchOrders();
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast.error("Failed to cancel order. Please try again.");
    }
  };

  return (
    <div className="orders-page">
      <div className="container">
        {/* Header */}
        <div className="orders-header">
          <h1>My Orders</h1>
          <p className="subtitle">
            Track and manage all your Halal Market purchases
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="orders-filters">
          {[
            "all",
            "pending",
            "confirmed",
            "processing",
            "shipped",
            "delivered",
            "cancelled",
          ].map((status) => (
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
            <h2>No Orders Found</h2>
            <p>
              {filter === "all"
                ? "You haven't placed any orders yet. Start shopping to see them here."
                : `No ${formatStatus(filter).toLowerCase()} orders at this time.`}
            </p>
            <Link to="/shop" className="btn btn-primary">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-header-row">
                  <div className="order-number-section">
                    <h3 className="order-number">
                      Order #{order._id.slice(-8).toUpperCase()}
                    </h3>
                    <p className="order-date">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
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
                  <h4 className="items-heading">Items Ordered</h4>
                  <div className="items-list">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="order-item-row">
                          <div className="item-info">
                            <p className="item-name">
                              {item.product?.name ||
                                item.productName ||
                                "Product"}
                            </p>
                            <p className="item-qty">
                              Qty: <strong>{item.quantity}</strong>
                            </p>
                          </div>
                          <p className="item-price">
                            {(
                              (item.price || 0) * (item.quantity || 1)
                            ).toLocaleString()}{" "}
                            ETB
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="no-items">No items in this order</p>
                    )}
                  </div>
                </div>

                {/* Shipping Details */}
                <div className="order-details">
                  <div className="detail-group">
                    <label>Shipping Address</label>
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
                    <label>Payment Method</label>
                    <p>{formatStatus(order.paymentMethod || "unknown")}</p>
                  </div>
                  <div className="detail-group">
                    <label>Order Total</label>
                    <p className="total-amount">
                      {(order.totalPrice || 0).toLocaleString()} ETB
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
                      <FiStar size={16} /> Rate & Review
                    </Link>
                  )}
                  {order.status === "pending" && (
                    <button
                      className="cancel-btn"
                      onClick={() => handleCancelOrder(order._id)}
                    >
                      Cancel Order
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
