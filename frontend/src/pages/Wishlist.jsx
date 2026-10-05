import React from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiHeart,
  FiArrowRight,
  FiTrash2,
  FiShoppingCart,
} from "react-icons/fi";
import {
  selectWishlistItems,
  removeFromWishlist,
} from "../redux/slices/wishlistSlice";
import { addToCart, openCart } from "../redux/slices/cartSlice";
import toast from "react-hot-toast";
import { getProductFallbackImage } from "../lib/utils";
import { useLanguage } from "../i18n/LanguageContext";

const Wishlist = () => {
  const dispatch = useDispatch();
  const { t, formatETB } = useLanguage();
  const wishlistItems = useSelector(selectWishlistItems);

  const handleRemove = (id) => {
    dispatch(removeFromWishlist(id));
    toast.success(t("wishlist_removed_toast"));
  };

  const handleAddToCart = (product) => {
    dispatch(addToCart({ product, quantity: 1 }));
    dispatch(openCart());
    toast.success(t("product_added", { name: product.name }));
  };

  return (
    <div className="wishlist-page">
      <div className="container" style={{ padding: "4rem 0" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          {/* <FiHeart size={56} style={{ color: '#0D7C3D', marginBottom: '1rem' }} /> */}
          <h1 style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
            {t("wishlist_title")}
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              margin: "0.75rem auto 0",
              lineHeight: "1.8",
              maxWidth: "720px",
            }}
          >
            {t("wishlist_desc")}
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          <div
            style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto" }}
          >
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              {t("wishlist_empty")}
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <Link to="/shop" className="btn btn-primary">
                {t("wishlist_continue")} <FiArrowRight size={16} />
              </Link>
              <Link to="/cart" className="btn btn-outline">
                {t("wishlist_view_cart")}
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="wishlist-grid"
            style={{ display: "grid", gap: "1.5rem" }}
          >
            {wishlistItems.map((product) => {
              const imageUrl =
                product.images?.[0]?.url ||
                getProductFallbackImage(product.name);
              const effectivePrice = product.discountPrice || product.price;

              return (
                <div
                  key={product._id}
                  className="wishlist-card"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr auto",
                    gap: "1rem",
                    alignItems: "center",
                    padding: "1rem",
                    borderRadius: "1rem",
                    boxShadow: "0 10px 22px rgba(0,0,0,0.05)",
                    background: "var(--bg-secondary)",
                  }}
                >
                  <Link
                    to={`/product/${product._id}`}
                    style={{
                      display: "block",
                      width: "140px",
                      height: "140px",
                      overflow: "hidden",
                      borderRadius: "1rem",
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={product.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </Link>

                  <div>
                    <Link
                      to={`/product/${product._id}`}
                      style={{
                        color: "var(--text-primary)",
                        textDecoration: "none",
                      }}
                    >
                      <h2 style={{ margin: "0 0 0.4rem", fontSize: "1.15rem" }}>
                        {product.name}
                      </h2>
                    </Link>
                    <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                      {product.merchant?.businessName || "Halal Market"}
                    </p>
                    <p style={{ margin: "0.75rem 0 0", fontWeight: 700 }}>
                      {formatETB(effectivePrice)}
                      {product.discountPrice && (
                        <span
                          style={{
                            marginLeft: "0.75rem",
                            color: "var(--text-secondary)",
                            textDecoration: "line-through",
                            fontWeight: 400,
                          }}
                        >
                          {formatETB(product.price)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      justifyContent: "space-between",
                    }}
                  >
                    <button
                      className="btn btn-outline"
                      onClick={() => handleAddToCart(product)}
                      type="button"
                    >
                      <FiShoppingCart
                        size={16}
                        style={{ marginRight: "0.5rem" }}
                      />{" "}
                      {t("wishlist_add_cart")}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => handleRemove(product._id)}
                      type="button"
                    >
                      <FiTrash2 size={16} style={{ marginRight: "0.5rem" }} />{" "}
                      {t("wishlist_remove")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
