import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiTrash2, FiMinus, FiPlus, FiArrowLeft, FiShoppingBag, FiArrowRight } from 'react-icons/fi';
import { removeFromCart, updateQuantity, clearCart, selectCartItems, selectCartTotal } from '../redux/slices/cartSlice';
import { getThumbnailFallbackImage } from '../lib/utils';
import { useLanguage } from '../i18n/LanguageContext';
import './Cart.css';

const Cart = () => {
    const dispatch = useDispatch();
    const { t, tp, formatETB } = useLanguage();
    const items = useSelector(selectCartItems);
    const total = useSelector(selectCartTotal);

    const deliveryFee = total > 5000 ? 0 : 150;
    const tax = Math.round(total * 0.15);
    const grandTotal = total + deliveryFee + tax;

    if (items.length === 0) {
        return (
            <div className="cart-page">
                <div className="container cart-empty-page">
                    <div className="cart-empty-content">
                        <div className="cart-empty-illustration"><FiShoppingBag size={64} /></div>
                        <h2>{t('cart_empty')}</h2>
                        <p>{t('cart_empty_desc')}</p>
                        <Link to="/shop" className="btn btn-primary btn-lg">
                            <FiShoppingBag /> {t('cart_browse')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="cart-page">
            <div className="container">
                <div className="cart-header">
                    <h1 className="heading-section">{t('cart_title')}</h1>
                    <p className="text-body">{tp('cart_items', items.length)}</p>
                </div>

                <div className="cart-layout">
                    {/* Cart Items */}
                    <div className="cart-items-section">
                        {items.map((item) => {
                            const itemPrice = item.discountPrice || item.price;
                            const imageUrl = item.images?.[0]?.url || getThumbnailFallbackImage(item.name?.charAt(0) || 'H');
                            return (
                                <div key={item._id} className="cart-page-item">
                                    <img src={imageUrl} alt={item.name} className="cart-page-item-image" loading="lazy" decoding="async" />
                                    <div className="cart-page-item-info">
                                        <h3>{item.name}</h3>
                                        {item.halalCertified && <span className="badge badge-halal" style={{ fontSize: '0.65rem' }}>{t('product_halal_verified')}</span>}
                                        <p className="cart-page-item-merchant">{item.merchant?.businessName}</p>
                                        {Number.isFinite(item.stock) && item.stock <= 5 && (
                                            <p className="text-body" style={{ fontSize: '0.8rem', color: 'var(--warning, #b45309)' }}>
                                                {t('cart_low_stock', { stock: item.stock })}
                                            </p>
                                        )}
                                    </div>
                                    <div className="cart-page-item-qty">
                                        <button className="qty-btn" onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity - 1 }))} disabled={item.quantity <= 1} aria-label={t('cart_decrease')}><FiMinus size={14} /></button>
                                        <span className="qty-value" aria-live="polite">{item.quantity}</span>
                                        <button className="qty-btn" onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity + 1 }))} disabled={Number.isFinite(item.stock) && item.stock > 0 && item.quantity >= item.stock} aria-label={t('cart_increase')}><FiPlus size={14} /></button>
                                    </div>
                                    <div className="cart-page-item-price">
                                        <span className="price-current">{formatETB(itemPrice * item.quantity)}</span>
                                        {item.quantity > 1 && <span className="price-unit">{formatETB(itemPrice)} {t('cart_each')}</span>}
                                    </div>
                                    <button className="cart-page-item-remove" onClick={() => dispatch(removeFromCart(item._id))}>
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}

                        <div className="cart-page-actions">
                            <Link to="/shop" className="btn btn-ghost"><FiArrowLeft /> {t('cart_continue')}</Link>
                            <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => dispatch(clearCart())}>
                                <FiTrash2 /> {t('cart_clear')}
                            </button>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="cart-summary">
                        <div className="cart-summary-card">
                            <h3>{t('cart_summary')}</h3>
                            <div className="summary-row">
                                <span>{t('cart_subtotal')}</span>
                                <span>{formatETB(total)}</span>
                            </div>
                            <div className="summary-row">
                                <span>{t('cart_delivery')}</span>
                                <span>{deliveryFee === 0 ? <span className="free-shipping">{t('cart_free')}</span> : formatETB(deliveryFee)}</span>
                            </div>
                            <div className="summary-row">
                                <span>{t('cart_vat')}</span>
                                <span>{formatETB(tax)}</span>
                            </div>
                            {deliveryFee > 0 && (
                                <p className="summary-note">{t('cart_free_delivery_note')}</p>
                            )}
                            <div className="summary-divider" />
                            <div className="summary-row summary-total">
                                <span>{t('cart_total')}</span>
                                <span>{formatETB(grandTotal)}</span>
                            </div>
                            <Link to="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-4)' }}>
                                {t('cart_checkout')} <FiArrowRight />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
