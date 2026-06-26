import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiShoppingCart, FiHeart, FiShare2, FiStar, FiShield, FiTruck, FiMinus, FiPlus, FiChevronRight } from 'react-icons/fi';
import { fetchProductById, clearCurrentProduct } from '../redux/slices/productSlice';
import { addToCart, openCart } from '../redux/slices/cartSlice';
import { addToWishlist, removeFromWishlist, selectWishlistItems } from '../redux/slices/wishlistSlice';
import Loader from '../components/common/Loader';
import toast from 'react-hot-toast';
import { getProductFallbackImage, getPlaceholderImage } from '../lib/utils';
import './ProductDetails.css';
import reviewService from '../services/reviewService';
import orderService from '../services/orderService';

const ProductDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();
    const { currentProduct: product, isLoading } = useSelector((state) => state.products);
    const { user } = useSelector((state) => state.auth);
    const [selectedImage, setSelectedImage] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');
    const [reviews, setReviews] = useState([]);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [reviewsTotal, setReviewsTotal] = useState(0);
    const [ratingCounts, setRatingCounts] = useState({1:0,2:0,3:0,4:0,5:0});
    const [avgRatingRemote, setAvgRatingRemote] = useState(null);
    const [userOrders, setUserOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [selectedOrderRef, setSelectedOrderRef] = useState('');
    const [reviewRating, setReviewRating] = useState('');
    const [reviewTitle, setReviewTitle] = useState('');

    const getProductIdString = (product) => {
        if (!product) return '';
        if (typeof product === 'string') return product;
        if (product._id) return product._id.toString();
        if (product.toString) return product.toString();
        return '';
    };
    const [reviewComment, setReviewComment] = useState('');
    const [submittingReview, setSubmittingReview] = useState(false);

    useEffect(() => {
        dispatch(fetchProductById(id));
        return () => dispatch(clearCurrentProduct());
    }, [dispatch, id]);

    useEffect(() => {
        // load reviews when reviews tab is active or page changes
        const loadReviews = async () => {
            if (activeTab !== 'reviews') return;
            setReviewsLoading(true);
            try {
                const res = await reviewService.getByProduct(id, { page: reviewsPage, limit: 10 });
                setReviews((prev) => (reviewsPage === 1 ? res.reviews || [] : [...prev, ...(res.reviews || [])]));
                setReviewsTotal(res.total || 0);
                if (res.ratingCounts) setRatingCounts(res.ratingCounts);
                if (typeof res.avgRating === 'number') setAvgRatingRemote(res.avgRating);
            } catch (err) {
                console.error('Failed to load reviews', err);
            } finally {
                setReviewsLoading(false);
            }
        };
        loadReviews();
    }, [activeTab, reviewsPage, id]);

    useEffect(() => {
        // load user's delivered orders that include this product so they can submit verified reviews
        const loadUserOrders = async () => {
            if (!user || activeTab !== 'reviews') return;
            setOrdersLoading(true);
            try {
                const res = await orderService.getMyOrders({ status: 'delivered', limit: 50 });
                const all = res.orders || res.data || [];
                const matched = all.filter((o) => (o.items || []).some((it) => getProductIdString(it.product) === id));
                setUserOrders(matched);
                if (matched.length > 0) setSelectedOrderRef(matched[0]._id);
            } catch (err) {
                console.error('Failed to load user orders', err);
                setUserOrders([]);
            } finally {
                setOrdersLoading(false);
            }
        };
        loadUserOrders();
    }, [user, activeTab, id]);

    const handleSubmitReview = async (e) => {
        e.preventDefault();
        if (!user) return toast.error('Please sign in to submit a review');
        if (user.role === 'merchant') return toast.error('Merchants cannot submit product reviews');
        if (!reviewRating) return toast.error('Please select a rating');
        if (!selectedOrderRef) return toast.error('Select the delivered order to verify purchase');

        setSubmittingReview(true);
        try {
            await reviewService.create({
                reviewType: 'product',
                product: id,
                rating: Number(reviewRating),
                title: reviewTitle,
                comment: reviewComment,
                orderRef: selectedOrderRef,
            });
            toast.success('Review submitted');
            // reset
            setReviewRating('');
            setReviewTitle('');
            setReviewComment('');
            setReviewsPage(1);
            // reload reviews
            const res = await reviewService.getByProduct(id, { page: 1, limit: 10 });
            setReviews(res.reviews || []);
            setReviewsTotal(res.total || 0);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to submit review');
        } finally {
            setSubmittingReview(false);
        }
    };

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
            { url: getPlaceholderImage('Halal Beef', 600, 600, '0D7C3D'), alt: 'Halal Beef' },
            { url: getPlaceholderImage('Fresh Cut', 600, 600, '075c2c'), alt: 'Fresh Cut' },
            { url: getPlaceholderImage('Packaged', 600, 600, '054b23'), alt: 'Packaged' },
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

    const wishlistItems = useSelector(selectWishlistItems);
    const isWishlisted = wishlistItems.some((item) => item._id === displayProduct._id);

    const handleAddToCart = () => {
        if (user?.role === 'merchant') {
            toast.error('Merchants cannot place orders. Manage your products in the dashboard.');
            return;
        }
        dispatch(addToCart({ product: displayProduct, quantity }));
        dispatch(openCart());
        toast.success(`${displayProduct.name} added to cart!`);
    };

    const handleToggleWishlist = () => {
        if (isWishlisted) {
            dispatch(removeFromWishlist(displayProduct._id));
            toast.success(`${displayProduct.name} removed from wishlist`);
        } else {
            dispatch(addToWishlist(displayProduct));
            toast.success(`${displayProduct.name} added to wishlist`);
        }
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
                                src={displayProduct.images?.[selectedImage]?.url || displayProduct.image || getProductFallbackImage(displayProduct.name, 600, 600)}
                                alt={displayProduct.images?.[selectedImage]?.alt || displayProduct.name}
                            />
                            {displayProduct.halalCertified && (
                                <span className="badge badge-halal product-detail-badge">Halal Certified</span>
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
                            <Link to={`/merchant/${displayProduct.merchant._id || 'dm1'}`} className="product-merchant-badge" style={{ textDecoration: 'none' }}>
                                {displayProduct.merchant.verificationStatus === 'approved' && <FiShield className="verified-icon" />}
                                <span>{displayProduct.merchant.businessName}</span>
                                <FiChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                            </Link>
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
                                <span>{displayProduct.originCountry || 'Ethiopia'}</span>
                            </div>
                            <div className="quick-detail">
                                <span className="quick-detail-label">Stock</span>
                                <span className={displayProduct.isInStock ? 'in-stock' : 'out-stock'}>
                                    {displayProduct.isInStock ? `In Stock (${displayProduct.stock})` : 'Out of Stock'}
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
                                disabled={!displayProduct.isInStock || user?.role === 'merchant'}
                                id="add-to-cart-btn"
                            >
                                <FiShoppingCart size={20} />
                                Add to Cart — {(effectivePrice * quantity)?.toLocaleString()} ETB
                            </button>
                        </div>

                        <div className="product-secondary-actions">
                            {user?.role !== 'merchant' && (
                                <button
                                    className={`btn btn-ghost ${isWishlisted ? 'wishlisted' : ''}`}
                                    onClick={handleToggleWishlist}
                                    type="button"
                                >
                                    <FiHeart size={18} /> {isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                                </button>
                            )}
                            <button className="btn btn-ghost" type="button"><FiShare2 size={18} /> Share</button>
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
                                {/* Inline review form for eligible users */}
                                {user && user.role !== 'merchant' ? (
                                    <div className="review-form-section mb-4">
                                        {ordersLoading ? (
                                            <p>Checking your delivered orders...</p>
                                        ) : userOrders.length === 0 ? (
                                            <p className="text-body">You can leave a review after the product is delivered. See your <Link to="/orders">orders</Link>.</p>
                                        ) : (
                                            <form onSubmit={handleSubmitReview} className="review-form">
                                                <label className="label">Order (verified purchase)</label>
                                                <select value={selectedOrderRef} onChange={(e) => setSelectedOrderRef(e.target.value)} className="input">
                                                    {userOrders.map((o) => (
                                                        <option key={o._id} value={o._id}>{o.orderNumber || o._id.slice(-8).toUpperCase()} — {new Date(o.deliveredAt || o.createdAt).toLocaleDateString()}</option>
                                                    ))}
                                                </select>

                                                <label className="label">Rating</label>
                                                <select value={reviewRating} onChange={(e) => setReviewRating(e.target.value)} className="input" required>
                                                    <option value="">Select rating</option>
                                                    <option value="1">1</option>
                                                    <option value="2">2</option>
                                                    <option value="3">3</option>
                                                    <option value="4">4</option>
                                                    <option value="5">5</option>
                                                </select>

                                                <label className="label">Title (optional)</label>
                                                <input className="input" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} />

                                                <label className="label">Comment</label>
                                                <textarea className="input" rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} />

                                                <div className="mt-2">
                                                    <button className="btn btn-primary" type="submit" disabled={submittingReview}>{submittingReview ? 'Submitting...' : 'Submit Review'}</button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-body">Sign in as a customer to leave reviews.</p>
                                )}

                                {reviewsLoading ? (
                                    <p>Loading reviews...</p>
                                ) : reviews.length === 0 ? (
                                    <p className="text-body">No reviews yet.</p>
                                ) : (
                                    <div className="reviews-list">
                                        {/* Rating breakdown */}
                                        <div className="rating-breakdown mb-4">
                                            <div className="rating-summary" style={{display:'flex',alignItems:'center',gap:12}}>
                                                <div style={{fontSize:24,fontWeight:700}}>{(avgRatingRemote ?? displayProduct.ratingsAverage)?.toFixed(1)}</div>
                                                <div>
                                                    <div style={{fontSize:14}}>Average rating</div>
                                                    <div style={{fontSize:12,color:'var(--text-tertiary)'}}>{reviewsTotal || displayProduct.ratingsCount} reviews</div>
                                                </div>
                                            </div>
                                            <div className="rating-bars" style={{marginTop:12}}>
                                                {[5,4,3,2,1].map((star) => {
                                                    const count = ratingCounts?.[star] || 0;
                                                    const total = Math.max(1, reviewsTotal);
                                                    const pct = Math.round((count / total) * 100);
                                                    return (
                                                        <div key={star} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                                                            <div style={{width:40}}>{star}★</div>
                                                            <div style={{flex:1,background:'#edeff2',height:10,borderRadius:6,overflow:'hidden'}}>
                                                                <div style={{width:`${pct}%`,height:'100%',background:'var(--accent-500)'}} />
                                                            </div>
                                                            <div style={{width:48,textAlign:'right'}}>{count}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {reviews.map((r) => (
                                            <div key={r._id} className="review-item">
                                                <div className="review-header">
                                                    <div className="review-author">
                                                        <strong>{r.user ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() : 'Anonymous'}</strong>
                                                        {r.isVerifiedPurchase && <span className="badge badge-verified" style={{marginLeft:8}}>Verified Purchase</span>}
                                                    </div>
                                                    <div className="review-meta">
                                                        <div className="review-rating">
                                                            {[1,2,3,4,5].map((s)=> (
                                                                <FiStar key={s} size={14} color={s <= Math.round(r.rating) ? 'var(--accent-500)' : 'var(--gray-300)'} />
                                                            ))}
                                                        </div>
                                                        <div className="review-date">{new Date(r.createdAt).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                                <div className="review-body">
                                                    {r.title && <h4>{r.title}</h4>}
                                                    <p>{r.comment}</p>
                                                </div>
                                            </div>
                                        ))}

                                        {reviewsTotal > reviews.length && (
                                            <div className="reviews-load-more">
                                                <button className="btn btn-outline" onClick={() => setReviewsPage((p) => p + 1)}>Load more</button>
                                            </div>
                                        )}
                                    </div>
                                )}
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
