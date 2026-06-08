import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiStar, FiCheck, FiAlertCircle } from 'react-icons/fi';
import orderService from '../services/orderService';
import reviewService from '../services/reviewService';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import './OrderDetails.css';

const StarRating = ({ rating, onRatingChange, size = 'md' }) => {
    const [hoverRating, setHoverRating] = useState(0);
    const sizes = { sm: 16, md: 24, lg: 32 };
    const starSize = sizes[size];
    const displayRating = hoverRating || rating || 0;

    return (
        <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onRatingChange(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: star <= displayRating ? '#fbbf24' : '#e5e7eb',
                        transition: 'color 0.2s',
                    }}
                >
                    <FiStar size={starSize} />
                </button>
            ))}
        </div>
    );
};

const OrderDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [productRatings, setProductRatings] = useState({});
    const [merchantRatings, setMerchantRatings] = useState({});
    const { user } = useSelector((state) => state.auth || {});

    useEffect(() => {
        const loadOrder = async () => {
            try {
                setLoading(true);
                const res = await orderService.getById(id);
                setOrder(res.order || res);
            } catch (err) {
                console.error(err);
                toast.error('Failed to load order details');
            } finally {
                setLoading(false);
            }
        };
        loadOrder();
    }, [id]);

    const getProductIdString = (product) => {
        if (!product) return '';
        if (typeof product === 'string') return product;
        if (product._id) return product._id.toString();
        if (product.toString) return product.toString();
        return '';
    };

    const handleProductRatingChange = (productId, field, value) => {
        const productKey = getProductIdString(productId);
        if (!productKey) return;
        setProductRatings((prev) => ({
            ...prev,
            [productKey]: {
                ...(prev[productKey] || {}),
                [field]: value,
            },
        }));
    };

    const handleSubmitProductReview = async (productId, merchantId) => {
        const productKey = getProductIdString(productId);
        const rating = productRatings[productKey]?.rating;
        const comment = productRatings[productKey]?.comment || '';
        
        if (!rating) {
            toast.error('Please select a rating');
            return;
        }

        setSubmitting(true);
        try {
            await reviewService.create({
                reviewType: 'product',
                product: productKey,
                rating: Number(rating),
                comment,
                orderRef: order._id,
                merchant: merchantId,
            });
            toast.success('Product review submitted successfully!');
            
            // Refresh order
            const res = await orderService.getById(id);
            setOrder(res.order || res);
            
            // Clear the form
            setProductRatings((prev) => ({
                ...prev,
                [productKey]: { rating: 0, comment: '' },
            }));
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to submit product review');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMerchantRatingChange = (merchantId, value) => {
        setMerchantRatings((prev) => ({
            ...prev,
            [merchantId]: {
                ...(prev[merchantId] || {}),
                rating: value,
            },
        }));
    };

    const handleMerchantCommentChange = (merchantId, value) => {
        setMerchantRatings((prev) => ({
            ...prev,
            [merchantId]: {
                ...(prev[merchantId] || {}),
                comment: value,
            },
        }));
    };

    const handleSubmitMerchantReview = async (merchantId) => {
        const rating = merchantRatings[merchantId]?.rating;
        const comment = merchantRatings[merchantId]?.comment || '';

        if (!rating) {
            toast.error('Please select a rating for the merchant');
            return;
        }

        setSubmitting(true);
        try {
            await reviewService.create({
                reviewType: 'merchant',
                merchant: merchantId,
                rating: Number(rating),
                comment,
                orderRef: order._id,
            });
            toast.success('Merchant review submitted successfully!');
            
            // Reset merchant form
            setMerchantRatings((prev) => ({
                ...prev,
                [merchantId]: { rating: 0, comment: '' },
            }));
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to submit merchant review');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="order-details-page">
                <div className="container">
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <p>Loading order details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="order-details-page">
                <div className="container">
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <p>Order not found</p>
                    </div>
                </div>
            </div>
        );
    }

    const getEntityId = (entity) => {
        if (!entity) return '';
        if (typeof entity === 'string') return entity;
        if (entity._id) return entity._id.toString();
        if (entity.toString) return entity.toString();
        return '';
    };

    const orderMerchants = (order?.items || []).reduce((acc, item) => {
        const merchant = item.merchant;
        const merchantId = getEntityId(merchant);
        if (!merchantId) return acc;
        if (!acc.some((m) => getEntityId(m) === merchantId)) {
            acc.push(typeof merchant === 'string' ? { _id: merchantId, businessName: `Merchant ${merchantId}` } : merchant);
        }
        return acc;
    }, []);

    const isDelivered = order.status === 'delivered';

    return (
        <div className="order-details-page">
            <div className="container">
                {/* Header */}
                <div className="order-header">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="btn btn-ghost"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}
                    >
                        <FiArrowLeft size={18} /> Back to Orders
                    </button>
                    <h1 className="order-title">Order #{order.orderNumber || order._id?.slice(-8)}</h1>
                    <p className="order-date">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>

                {/* Order Status */}
                <div className="order-status-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="status-icon" style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: isDelivered ? '#d1fae5' : '#dbeafe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isDelivered ? '#059669' : '#0284c7',
                        }}>
                            {isDelivered ? <FiCheck size={24} /> : <FiAlertCircle size={24} />}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Order Status</p>
                            <p style={{ fontSize: '1.125rem', fontWeight: '600', textTransform: 'capitalize' }}>
                                {order.status}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginTop: '24px' }}>
                    {/* Left Column - Order Items */}
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px' }}>Items Ordered</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {order.items && order.items.length > 0 ? (
                                order.items.map((item, idx) => (
                                    <div key={idx} className="order-item-card">
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <img 
                                                src={item.image || item.product?.images?.[0]?.url || 'https://placehold.co/80x80/0D7C3D/ffffff?text=No+Image'} 
                                                alt={item.name} 
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderRadius: '8px',
                                                    objectFit: 'cover',
                                                }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontWeight: '600', marginBottom: '4px' }}>{item.name}</p>
                                                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>
                                                    Qty: {item.quantity}
                                                </p>
                                                <p style={{ fontWeight: '600', color: '#0D7C3D' }}>
                                                    {(item.price * item.quantity).toLocaleString()} ETB
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p style={{ color: '#6b7280' }}>No items in this order</p>
                            )}
                        </div>

                        {/* Order Summary */}
                        <div className="order-summary-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span>Subtotal:</span>
                                <span>{(order.totalPrice || 0).toLocaleString()} ETB</span>
                            </div>
                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600', fontSize: '1.125rem', color: '#0D7C3D' }}>
                                    <span>Total:</span>
                                    <span>{(order.totalPrice || 0).toLocaleString()} ETB</span>
                                </div>
                            </div>
                        </div>

                        {/* Shipping Details */}
                        <div className="order-info-card">
                            <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Shipping Address</h3>
                            <address style={{ fontStyle: 'normal', fontSize: '0.875rem', lineHeight: '1.6' }}>
                                {order.shippingAddress?.fullName}<br />
                                {order.shippingAddress?.street}<br />
                                {order.shippingAddress?.subcity}, {order.shippingAddress?.city}<br />
                                {order.shippingAddress?.region}<br />
                                {order.shippingAddress?.phone}
                            </address>
                        </div>
                    </div>

                    {/* Right Column - Reviews Section */}
                    {isDelivered && (
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '16px' }}>Share Your Feedback</h2>
                            
                            {/* Product Reviews */}
                            {order.items && order.items.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>Product Ratings</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {order.items.map((item, idx) => (
                                            <div key={idx} className="review-form-card">
                                                <p style={{ fontWeight: '600', marginBottom: '12px', fontSize: '0.9rem' }}>
                                                    {item.name}
                                                </p>
                                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                                                    How would you rate this product?
                                                </label>
                                                {(() => {
                                                    const productKey = getProductIdString(item.product);
                                                    return (
                                                        <>
                                                            <StarRating
                                                                rating={productRatings[productKey]?.rating || 0}
                                                                onRatingChange={(rating) => handleProductRatingChange(productKey, 'rating', rating)}
                                                                size="md"
                                                            />
                                                            <textarea
                                                                placeholder="Share your experience with this product (optional)"
                                                                value={productRatings[productKey]?.comment || ''}
                                                                onChange={(e) => handleProductRatingChange(productKey, 'comment', e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    marginTop: '12px',
                                                                    padding: '10px',
                                                                    borderRadius: '6px',
                                                                    border: '1px solid #e5e7eb',
                                                                    fontFamily: 'inherit',
                                                                    fontSize: '0.875rem',
                                                                    resize: 'vertical',
                                                                    minHeight: '80px',
                                                                }}
                                                                className="textarea-focus"
                                                            />
                                                            <button
                                                                onClick={() => handleSubmitProductReview(productKey, item.merchant)}
                                                                disabled={submitting}
                                                                className="btn btn-primary"
                                                                style={{ marginTop: '12px', width: '100%' }}
                                                            >
                                                                {submitting ? 'Submitting...' : 'Submit Product Review'}
                                                            </button>
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Merchant Review */}
                            {orderMerchants.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>Merchant Ratings</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {orderMerchants.map((merchant) => {
                                            const merchantId = getEntityId(merchant);
                                            const merchantState = merchantRatings[merchantId] || { rating: 0, comment: '' };
                                            return (
                                                <div key={merchantId} className="review-form-card">
                                                    <p style={{ fontWeight: '600', marginBottom: '12px', fontSize: '0.9rem' }}>
                                                        Rate {merchant.businessName || `Merchant ${merchantId}`}
                                                    </p>
                                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
                                                        How would you rate this merchant's service?
                                                    </label>
                                                    <StarRating
                                                        rating={merchantState.rating}
                                                        onRatingChange={(rating) => handleMerchantRatingChange(merchantId, rating)}
                                                        size="md"
                                                    />
                                                    <textarea
                                                        placeholder="Tell us about the merchant's service (optional)"
                                                        value={merchantState.comment}
                                                        onChange={(e) => handleMerchantCommentChange(merchantId, e.target.value)}
                                                        style={{
                                                            width: '100%',
                                                            marginTop: '12px',
                                                            padding: '10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #e5e7eb',
                                                            fontFamily: 'inherit',
                                                            fontSize: '0.875rem',
                                                            resize: 'vertical',
                                                            minHeight: '80px',
                                                        }}
                                                        className="textarea-focus"
                                                    />
                                                    <button
                                                        onClick={() => handleSubmitMerchantReview(merchantId)}
                                                        disabled={submitting}
                                                        className="btn btn-primary"
                                                        style={{ marginTop: '12px', width: '100%' }}
                                                    >
                                                        {submitting ? 'Submitting...' : `Submit Review for ${merchant.businessName || 'Merchant'}`}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderDetails;
