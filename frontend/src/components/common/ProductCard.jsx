import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiShoppingCart, FiHeart, FiStar, FiEye } from 'react-icons/fi';
import { addToCart } from '../../redux/slices/cartSlice';
import toast from 'react-hot-toast';
import './ProductCard.css';

const ProductCard = ({ product }) => {
    const dispatch = useDispatch();

    const {
        _id,
        name,
        nameAmharic,
        price,
        discountPrice,
        images,
        category,
        ratingsAverage,
        ratingsCount,
        halalCertified,
        isFeatured,
        isInStock,
        merchant,
    } = product;

    const effectivePrice = discountPrice || price;
    const discountPercent = discountPrice ? Math.round(((price - discountPrice) / price) * 100) : 0;
    const imageUrl = images?.[0]?.url || 'https://placehold.co/400x400/0D7C3D/ffffff?text=Halal+Product';

    const handleAddToCart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isInStock) return;
        dispatch(addToCart({ product, quantity: 1 }));
        toast.success(`${name} added to cart!`, { icon: '🛒' });
    };

    return (
        <Link to={`/product/${_id}`} className={`product-card ${isFeatured ? 'card-featured' : ''}`} id={`product-${_id}`}>
            {/* Image Container */}
            <div className="product-card-image">
                <img src={imageUrl} alt={name} loading="lazy" />

                {/* Badges */}
                <div className="product-card-badges">
                    {halalCertified && (
                        <span className="badge badge-halal">☪ Halal</span>
                    )}
                    {discountPercent > 0 && (
                        <span className="badge badge-sale">-{discountPercent}%</span>
                    )}
                    {isFeatured && (
                        <span className="badge badge-featured">★ Featured</span>
                    )}
                    {!isInStock && (
                        <span className="badge" style={{ background: 'var(--gray-600)', color: 'white' }}>Out of Stock</span>
                    )}
                </div>

                {/* Hover Actions */}
                <div className="product-card-actions">
                    <button className="product-action-btn" aria-label="Add to wishlist">
                        <FiHeart size={18} />
                    </button>
                    <button className="product-action-btn" aria-label="Quick view">
                        <FiEye size={18} />
                    </button>
                    <button
                        className="product-action-btn product-action-cart"
                        onClick={handleAddToCart}
                        disabled={!isInStock}
                        aria-label="Add to cart"
                    >
                        <FiShoppingCart size={18} />
                    </button>
                </div>
            </div>

            {/* Info */}
            <div className="product-card-info">
                {/* Category */}
                <span className="product-card-category">{category?.replace('_', ' ')}</span>

                {/* Name */}
                <h3 className="product-card-name">{name}</h3>
                {nameAmharic && <p className="product-card-amharic text-ethiopic">{nameAmharic}</p>}

                {/* Merchant */}
                {merchant?.businessName && (
                    <p className="product-card-merchant"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/merchant/${merchant._id || 'dm1'}`; }}
                        style={{ cursor: 'pointer' }}
                        title={`Visit ${merchant.businessName}'s shop`}
                    >
                        {merchant.verificationStatus === 'approved' && '✓ '}
                        {merchant.businessName}
                    </p>
                )}

                {/* Rating */}
                <div className="product-card-rating">
                    <div className="rating">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <FiStar
                                key={star}
                                size={14}
                                className={`rating-star ${star <= Math.round(ratingsAverage || 0) ? '' : 'empty'}`}
                                fill={star <= Math.round(ratingsAverage || 0) ? 'var(--accent-500)' : 'none'}
                            />
                        ))}
                    </div>
                    <span className="rating-value">{ratingsAverage?.toFixed(1) || '0.0'}</span>
                    <span className="rating-count">({ratingsCount || 0})</span>
                </div>

                {/* Price */}
                <div className="product-card-price">
                    <span className="price-current">{effectivePrice?.toLocaleString()} ETB</span>
                    {discountPrice && (
                        <span className="price-original">{price?.toLocaleString()} ETB</span>
                    )}
                </div>
            </div>
        </Link>
    );
};

export default ProductCard;
