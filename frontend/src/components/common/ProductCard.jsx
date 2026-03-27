import React from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { FiShoppingCart, FiStar, FiHeart, FiEye, FiCheckCircle } from 'react-icons/fi';
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
        toast.success(`${name} added to cart!`, {
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
                
                {/* Floating Badges */}
                <div className="product-badges">
                    {discountPercent > 0 && <span className="badge-promo">Save {discountPercent}%</span>}
                    {halalCertified && (
                        <span className="badge-halal-premium">
                            <FiCheckCircle size={12}/> Halal
                        </span>
                    )}
                </div>
                
                {/* Quick Action Overlay */}
                <div className="product-quick-actions">
                    <button className="action-btn" title="Add to Wishlist" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toast.success('Added to wishlist'); }}>
                        <FiHeart size={18}/>
                    </button>
                    <Link to={`/product/${_id}`} className="action-btn" title="Quick View">
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
                        {discountPrice && <span className="price-old-premium">{price?.toLocaleString()} ETB</span>}
                        <span className="price-current-premium">
                            <span className="currency">ETB</span>
                            {effectivePrice?.toLocaleString()}
                        </span>
                    </div>

                    <button
                        className={`add-cart-btn-premium ${!isInStock ? 'out-of-stock' : ''}`}
                        onClick={handleAddToCart}
                        disabled={!isInStock}
                        title={isInStock ? 'Add to Cart' : 'Out of Stock'}
                    >
                        <FiShoppingCart size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
