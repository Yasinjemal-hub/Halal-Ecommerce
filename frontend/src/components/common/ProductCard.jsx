import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiShoppingCart, FiStar, FiHeart, FiEye, FiCheckCircle } from 'react-icons/fi';
import { addToCart } from '../../redux/slices/cartSlice';
import { addToWishlist, removeFromWishlist, selectWishlistItems } from '../../redux/slices/wishlistSlice';
import toast from 'react-hot-toast';
import { getProductFallbackImage } from '../../lib/utils';
import { isMerchantHalalVerified } from '../../utils/certification';
import { useLanguage } from '../../i18n/LanguageContext';
import './ProductCard.css';

const ProductCard = ({ product }) => {
    const dispatch = useDispatch();
    const { t, formatETB, formatNumber } = useLanguage();

    const {
        _id,
        name,
        nameAmharic,
        price,
        discountPrice,
        images,
        image,
        category,
        ratingsAverage,
        ratingsCount,
        halalCertified,
        isFeatured,
        isInStock,
        merchant,
    } = product;

    const wishlistItems = useSelector(selectWishlistItems);
    const isWishlisted = wishlistItems.some((item) => item._id === _id);

    const effectivePrice = discountPrice || price;
    const discountPercent = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : 0;
    const imageUrl = images?.[0]?.url || image || getProductFallbackImage(name);
    const { user } = useSelector((state) => state.auth);
    const isMerchantUser = user?.role === 'merchant';
    // Halal Verified badge: same approved status + certificate record.
    // When merchant status is present, require approval; otherwise fall
    // back to the product flag (legacy/test shapes without merchant status).
    const hasMerchantStatus = merchant && merchant.verificationStatus !== undefined;
    const showHalalVerified = hasMerchantStatus
        ? merchant.verificationStatus === 'approved' && (isMerchantHalalVerified(merchant) || !!halalCertified)
        : !!halalCertified;

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isMerchantUser) {
            toast.error(t('err_merchant_cannot_cart'));
            return;
        }
        if (!isInStock) return;
        dispatch(addToCart({ product, quantity: 1 }));
        toast.success(t('product_added', { name }), {
            style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
            },
        });
    };

    return (
        <div className="product-card-premium" id={`product-${_id}`}>
            <div className="product-image-container">
                <Link to={`/product/${_id}`}>
                    <img src={imageUrl} alt={name} className="product-image" loading="lazy" />
                </Link>
                
                {/* Floating Badges — Halal Verified only for approved + certified stores */}
                <div className="product-badges">
                    {discountPercent > 0 && <span className="badge-promo">{t('product_save_percent', { percent: discountPercent })}</span>}
                    {showHalalVerified && (
                        <span className="badge-halal-premium">
                            <FiCheckCircle size={12}/> {t('product_halal_verified')}
                        </span>
                    )}
                </div>
                
                {/* Quick Action Overlay */}
                <div className="product-quick-actions">
                    {!isMerchantUser && (
                        <button
                            className={`action-btn wishlist-btn ${isWishlisted ? 'wishlisted' : ''}`}
                            title={isWishlisted ? t('product_remove_wishlist') : t('product_add_wishlist')}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isWishlisted) {
                                    dispatch(removeFromWishlist(_id));
                                    toast.success(t('wishlist_removed', { name }), {
                                        style: {
                                            borderRadius: '10px',
                                            background: '#333',
                                            color: '#fff',
                                        },
                                    });
                                } else {
                                    dispatch(addToWishlist(product));
                                    toast.success(t('wishlist_added', { name }), {
                                        style: {
                                            borderRadius: '10px',
                                            background: '#333',
                                            color: '#fff',
                                        },
                                    });
                                }
                            }}
                        >
                            <FiHeart size={18} />
                        </button>
                    )}
                    <Link to={`/product/${_id}`} className="action-btn" title={t('product_quick_view')}>
                        <FiEye size={18}/>
                    </Link>
                </div>
            </div>

            <div className="product-content">
                <div className="product-meta">
                    <span className="product-brand">{merchant?.businessName || 'Halal Market'}</span>
                    <div className="product-rating-premium">
                        <FiStar className="star-icon filled" size={14} fill="currentColor"/>
                        <span>{ratingsAverage?.toFixed(1) || '0.0'}</span>
                    </div>
                </div>

                <Link to={`/product/${_id}`} className="product-title-link">
                    <h3 className="product-title-premium">{name}</h3>
                </Link>
                {nameAmharic && <p className="product-amharic">{nameAmharic}</p>}

                <div className="product-footer-premium">
                    <div className="product-pricing-premium">
                        {discountPrice && <span className="price-old-premium">{formatETB(price)}</span>}
                        <span className="price-current-premium">
                            <span className="currency">{t('etb')}</span>
                            {formatNumber(effectivePrice)}
                        </span>
                    </div>

                    <button
                        className={`add-cart-btn-premium ${!isInStock ? 'out-of-stock' : ''}`}
                        onClick={handleAddToCart}
                        disabled={!isInStock || isMerchantUser}
                        title={isMerchantUser ? t('product_merchant_cannot_add') : isInStock ? t('product_add_to_cart') : t('product_out_of_stock')}
                    >
                        <FiShoppingCart size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
