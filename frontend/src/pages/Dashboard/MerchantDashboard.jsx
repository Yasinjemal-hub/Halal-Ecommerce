import React, { useEffect, useState } from "react";
import {
  FiPackage,
  FiShoppingBag,
  FiDollarSign,
  FiStar,
  FiTrendingUp,
  FiPlus,
  FiEye,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import merchantService from "../../services/merchantService";
import orderService from "../../services/orderService";
import { selectCartCount } from "../../redux/slices/cartSlice";
import { selectWishlistCount } from "../../redux/slices/wishlistSlice";
import "./Dashboard.css";

const MerchantDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const cartCount = useSelector(selectCartCount);
  const wishlistCount = useSelector(selectWishlistCount);
  const [merchantProfile, setMerchantProfile] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [consumerOrders, setConsumerOrders] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        if (user?.role === "merchant") {
          const profileData = await merchantService.getMyProfile();
          setMerchantProfile(profileData.merchant || profileData);
          const ordersData = await orderService.getMerchantOrders({ limit: 5 });
          setRecentOrders(ordersData.orders || []);
        } else {
          const ordersData = await orderService.getMyOrders({ limit: 5 });
          setConsumerOrders(ordersData.orders || []);
        }
      } catch (error) {
        console.log("Dashboard data will use fallback values");
      }
    };
    loadDashboardData();
  }, [user?.role]);

  // Use backend data or fallback values
  const totalSpend = consumerOrders.reduce(
    (sum, order) => sum + Number(order.totalPrice || 0),
    0,
  );

  const merchantStats = [
    {
      label: "Total Products",
      value: merchantProfile?.totalProducts?.toString() || "24",
      icon: <FiPackage />,
      color: "#0D7C3D",
      change: "+3 this month",
    },
    {
      label: "Total Orders",
      value: merchantProfile?.totalOrders?.toString() || "156",
      icon: <FiShoppingBag />,
      color: "#2563eb",
      change: "+12 this week",
    },
    {
      label: "Revenue (ETB)",
      value: merchantProfile?.totalRevenue?.toLocaleString() || "45,230",
      icon: <FiDollarSign />,
      color: "#D4A017",
      change: "+8.4%",
    },
    {
      label: "Avg Rating",
      value: merchantProfile?.ratingsAverage?.toFixed(1) || "4.7",
      icon: <FiStar />,
      color: "#7c3aed",
      change: `${merchantProfile?.ratingsCount || 89} reviews`,
    },
  ];

  const consumerStats = [
    {
      label: "Orders Placed",
      value: consumerOrders.length?.toString() || "0",
      icon: <FiShoppingBag />,
      color: "#2563eb",
      change: "+2 this week",
    },
    {
      label: "Saved Items",
      value: wishlistCount.toString(),
      icon: <FiStar />,
      color: "#7c3aed",
      change:
        wishlistCount > 0
          ? `+${Math.min(wishlistCount, 5)} this month`
          : "Start saving",
    },
    {
      label: "Cart Items",
      value: cartCount.toString(),
      icon: <FiPackage />,
      color: "#0D7C3D",
      change:
        cartCount > 0
          ? `+${Math.min(cartCount, 5)} added`
          : "Add items to cart",
    },
    {
      label: "Total Spend",
      value: totalSpend ? totalSpend.toLocaleString() : "0",
      icon: <FiDollarSign />,
      color: "#D4A017",
      change: totalSpend ? "+8.4%" : "No spend yet",
    },
  ];

  const stats = user?.role === "merchant" ? merchantStats : consumerStats;

  const displayOrders =
    recentOrders.length > 0
      ? recentOrders.map((order) => ({
          orderId: order._id || order.id || "N/A",
          id: order._id?.slice(-12) || order.orderNumber || "N/A",
          customer: order.user
            ? `${order.user.firstName || ""} ${order.user.lastName?.[0] || ""}.`
            : "Customer",
          items: order.items?.length || 0,
          total: order.totalPrice?.toLocaleString() || "0",
          status: order.status || "pending",
        }))
      : [
          {
            id: "HE-260225-AB12CD",
            customer: "Amina M.",
            items: 3,
            total: "2,340",
            status: "processing",
          },
          {
            id: "HE-260224-EF34GH",
            customer: "Hassan I.",
            items: 1,
            total: "850",
            status: "shipped",
          },
          {
            id: "HE-260223-IJ56KL",
            customer: "Fatima A.",
            items: 5,
            total: "5,120",
            status: "delivered",
          },
          {
            id: "HE-260222-MN78OP",
            customer: "Ahmed K.",
            items: 2,
            total: "1,680",
            status: "pending",
          },
        ];

  const statusColors = {
    pending: "#d97706",
    processing: "#2563eb",
    shipped: "#7c3aed",
    delivered: "#059669",
    cancelled: "#dc2626",
    confirmed: "#2563eb",
    out_for_delivery: "#7c3aed",
  };

  const getNextOrderStatus = (status) => {
    if (status === "pending") return "confirmed";
    if (status === "confirmed") return "shipped";
    if (status === "shipped") return "delivered";
    return null;
  };

  const handleUpdateOrderStatus = async (order) => {
    const nextStatus = getNextOrderStatus(order.status);
    if (!nextStatus) {
      toast("This order has no further updates available.");
      return;
    }

    try {
      await orderService.updateStatus(order.orderId || order.id, nextStatus);
      setRecentOrders((prev) =>
        prev.map((o) =>
          (o._id || o.id) === (order.orderId || order.id)
            ? { ...o, status: nextStatus }
            : o,
        ),
      );
      toast.success(`Order status updated to ${nextStatus}`);
    } catch (err) {
      console.error("Failed to update order status", err);
      toast.error("Unable to update order status. Please try again.");
    }
  };

  const handleAdvanceClick = (order) => {
    const nextStatus = getNextOrderStatus(order.status);
    if (!nextStatus) {
      toast("This order has no further updates available.");
      return;
    }

    const confirmed = window.confirm(
      `Advance order ${order.id || order.orderId} to '${nextStatus}'?`,
    );
    if (!confirmed) return;

    handleUpdateOrderStatus(order);
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-welcome">
        <div>
          <h1 className="heading-section">
            Welcome back, {user?.firstName || "Merchant"}
          </h1>
          <p className="text-body">
            {user?.role === "merchant"
              ? "Here's what's happening with your store today."
              : "Here's what's happening with your shopping experience today."}
          </p>
        </div>
        {user?.role === "merchant" && (
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Link to="/dashboard/products" className="btn btn-primary">
              <FiPlus /> Add Product
            </Link>
            <Link to="/shop" className="btn btn-ghost">
              <FiEye /> View Shop
            </Link>
          </div>
        )}
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

      {/* Recent Orders (merchant only) */}
      {user?.role === "merchant" && (
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h2>Recent Orders</h2>
            <Link to="/dashboard/orders" className="btn btn-ghost btn-sm">
              View All
            </Link>
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
                {displayOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="order-id">{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{order.items}</td>
                    <td className="order-total">{order.total} ETB</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          background: `${statusColors[order.status] || "#6b7280"}15`,
                          color: statusColors[order.status] || "#6b7280",
                        }}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          navigate("/orders/" + (order.orderId || order.id))
                        }
                      >
                        <FiEye size={14} /> View
                      </button>

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleUpdateOrderStatus(order)}
                        disabled={!getNextOrderStatus(order.status)}
                      >
                        <FiTrendingUp size={14} /> Advance
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDashboard;
