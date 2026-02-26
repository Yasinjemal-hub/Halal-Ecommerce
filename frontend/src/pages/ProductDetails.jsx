import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiShoppingCart, FiHeart, FiShare2, FiStar, FiShield, FiTruck, FiMinus, FiPlus, FiChevronRight } from 'react-icons/fi';
import { fetchProductById, clearCurrentProduct } from '../../redux/slices/productSlice';
import { addToCart, openCart } from '../../redux/slices/cartSlice';
import Loader from '../../components/common/Loader';
import toast from 'react-hot-toast';
import './ProductDetails.css';

const ProductDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const { currentProduct: product, isLoading } = useSelector((state) => state.products);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');

    useEffect(() => {
        dispatch(fetchProductById(id));
        return () => dispatch(clearCurrentProduct());
    }, [dispatch, id]);

    // Demo product fallback
    const displayProduct = product || {
        _id: id,
        name: 'Premium Halal Beef',
        nameAmharic: 'ፕሪሚየም ሐላል ስጋ',
        description: 'Premium quality halal-certified beef sourced from verified Ethiopian farms. Our meat undergoes strict halal slaughtering processes supervised by certified Islamic scholars. Perfect for traditional Ethiopian dishes like tibs, kitfo, and more.\n\nAll our meat products are fresh, never frozen, and delivered within 24 hours of processing. We work directly with halal-certified farms across Oromia and Addis Ababa regions.',
        price: 850,
        discountPrice: 720,
        currency: 'ETB',
        category: 'meat',
        images: [
            { url: 'https://placehold.co/600x600/0D7C3D/ffffff?text=Halal+Beef', alt: 'Halal Beef' },
            { url: 'https://placehold.co/600x600/075c2c/ffffff?text=Fresh+Cut', alt: 'Fresh Cut' },
            { url: 'https://placehold.co/600x600/054b23/ffffff?text=Packaged', alt: 'Packaged' },
        ],
        ratingsAverage: 4.8,
        ratingsCount: 124,
        halalCertified: true,
        isFeatured: true,
        isInStock: true,
        stock: 45,
        weight: { value: 1, unit: 'kg' },
        originCountry: 'Ethiopia',
        ingredients: ['100% Pure Beef'],
        merchant: { businessName: 'Addis Halal Meats', verificationStatus: 'approved', ratingsAverage: 4.7 },
    };

    const effectivePrice = displayProduct.discountPrice || displayProduct.price;
    const discountPercent = displayProduct.discountPrice
        ? Math.round(((displayProduct.price - displayProduct.discountPrice) / displayProduct.price) * 100)
        : 0;

    const handleAddToCart = () => {
        dispatch(addToCart({ product: displayProduct, quantity }));
        dispatch(openCart());
        toast.success(`${displayProduct.name} added to cart!`, { icon: '🛒' });
    };

    if (isLoading) return <Loader size="page" text="Loading product..." />;

    return (
        <div className="product-details-page">
            {/* Breadcrumb */}
            <div className="breadcrumb">
                <div className="container breadcrumb-inner">
                    <Link to="/">Home</Link>
                    <FiChevronRight size={14} />
                    <Link to="/shop">Shop</Link>
                    <FiChevronRight size={14} />
                    <Link to={`/shop?category=${displayProduct.category}`}>{displayProduct.category?.replace('_', ' ')}</Link>
                    <FiChevronRight size={14} />
                    <span>{displayProduct.name}</span>
                </div>
            </div>

            <div className="container">
                <div className="product-detail-grid">
                    {/* Image Gallery */}
                    <div className="product-gallery">
                        <div className="product-main-image">
                            <img
                                src={displayProduct.images?.[selectedImage]?.url || 'https://placehold.co/600x600/0D7C3D/ffffff?text=Product'}
                                alt={displayProduct.images?.[selectedImage]?.alt || displayProduct.name}
                            />
                            {displayProduct.halalCertified && (
                                <span className="badge badge-halal product-detail-badge">☪ Halal Certified</span>
                            )}
                            {discountPercent > 0 && (
                                <span className="badge badge-sale product-detail-sale">-{discountPercent}% OFF</span>
                            )}
                        </div>
                        {displayProduct.images?.length > 1 && (
                            <div className="product-thumbnails">
                                {displayProduct.images.map((img, index) => (
                                    <button
                                        key={index}
                                        className={`thumbnail ${index === selectedImage ? 'thumbnail-active' : ''}`}
                                        onClick={() => setSelectedImage(index)}
                                    >
                                        <img src={img.url} alt={img.alt || `View ${index + 1}`} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Info */}
                    <div className="product-info">
                        <span className="product-info-category">{displayProduct.category?.replace('_', ' ')}</span>
                        <h1 className="product-info-name">{displayProduct.name}</h1>
                        {displayProduct.nameAmharic && (
                            <p className="product-info-amharic text-ethiopic">{displayProduct.nameAmharic}</p>
                        )}

                        {/* Merchant */}
                        {displayProduct.merchant && (
                            <div className="product-merchant-badge">
                                {displayProduct.merchant.verificationStatus === 'approved' && <FiShield className="verified-icon" />}
                                <span>{displayProduct.merchant.businessName}</span>
                            </div>
                        )}

                        {/* Rating */}
                        <div className="product-info-rating">
                            <div className="rating">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <FiStar
                                        key={star}
                                        size={18}
                                        className="rating-star"
                                        fill={star <= Math.round(displayProduct.ratingsAverage || 0) ? 'var(--accent-500)' : 'none'}
                                        color={star <= Math.round(displayProduct.ratingsAverage || 0) ? 'var(--accent-500)' : 'var(--gray-300)'}
                                    />
                                ))}
                            </div>
                            <span className="rating-value">{displayProduct.ratingsAverage?.toFixed(1)}</span>
                            <span className="rating-count">({displayProduct.ratingsCount} reviews)</span>
                        </div>

                        {/* Price */}
                        <div className="product-info-price price price-lg">
                            <span className="price-current">{effectivePrice?.toLocaleString()} ETB</span>
                            {displayProduct.discountPrice && (
                                <span className="price-original">{displayProduct.price?.toLocaleString()} ETB</span>
                            )}
                        </div>

                        {/* Quick Details */}
                        <div className="product-quick-details">
                            {displayProduct.weight?.value && (
                                <div className="quick-detail">
                                    <span className="quick-detail-label">Weight</span>
                                    <span>{displayProduct.weight.value} {displayProduct.weight.unit}</span>
                                </div>
                            )}
                            <div className="quick-detail">
                                <span className="quick-detail-label">Origin</span>
                                <span>🇪🇹 {displayProduct.originCountry || 'Ethiopia'}</span>
                            </div>
                            <div className="quick-detail">
                                <span className="quick-detail-label">Stock</span>
                                <span className={displayProduct.isInStock ? 'in-stock' : 'out-stock'}>
                                    {displayProduct.isInStock ? `✓ In Stock (${displayProduct.stock})` : '✕ Out of Stock'}
                                </span>
                            </div>
                        </div>

                        {/* Quantity & Add to Cart */}
                        <div className="product-actions">
                            <div className="qty-selector">
                                <button className="qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
                                    <FiMinus size={16} />
                                </button>
                                <span className="qty-value">{quantity}</span>
                                <button className="qty-btn" onClick={() => setQuantity(quantity + 1)}>
                                    <FiPlus size={16} />
                                </button>
                            </div>

                            <button
                                className="btn btn-primary btn-lg product-add-cart"
                                onClick={handleAddToCart}
                                disabled={!displayProduct.isInStock}
                                id="add-to-cart-btn"
                            >
                                <FiShoppingCart size={20} />
                                Add to Cart — {(effectivePrice * quantity)?.toLocaleString()} ETB
                            </button>
                        </div>

                        <div className="product-secondary-actions">
                            <button className="btn btn-ghost"><FiHeart size={18} /> Add to Wishlist</button>
                            <button className="btn btn-ghost"><FiShare2 size={18} /> Share</button>
                        </div>

                        {/* Trust Indicators */}
                        <div className="product-trust">
                            <div className="trust-mini"><FiShield /> Halal Certified by Majlis</div>
                            <div className="trust-mini"><FiTruck /> Delivery across Ethiopia</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="product-tabs">
                    <div className="tabs-nav">
                        {['description', 'reviews', 'shipping'].map((tab) => (
                            <button
                                key={tab}
                                className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="tab-content">
                        {activeTab === 'description' && (
                            <div className="tab-description">
                                <p>{displayProduct.description}</p>
                                {displayProduct.ingredients?.length > 0 && (
                                    <div style={{ marginTop: 'var(--space-6)' }}>
                                        <h4>Ingredients</h4>
                                        <ul>{displayProduct.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'reviews' && (
                            <div className="tab-reviews">
                                <p className="text-body">Reviews will be displayed here. Be the first to review this product!</p>
                            </div>
                        )}
                        {activeTab === 'shipping' && (
                            <div className="tab-shipping">
                                <h4>Shipping Information</h4>
                                <p>We deliver across all 13 regions of Ethiopia. Standard delivery takes 2-5 business days within Addis Ababa and 5-10 days for other regions.</p>
                                <h4 style={{ marginTop: 'var(--space-5)' }}>Payment Methods</h4>
                                <div className="shipping-payments">
                                    <span className="payment-badge">TeleBirr</span>
                                    <span className="payment-badge">CBE Birr</span>
                                    <span className="payment-badge">Amole</span>
                                    <span className="payment-badge">Bank Transfer</span>
                                    <span className="payment-badge">Cash on Delivery</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductDetails;
