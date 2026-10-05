import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiX, FiPlus, FiMinus, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { removeFromCart, updateQuantity, closeCart, selectCartItems, selectCartTotal } from '../../redux/slices/cartSlice';
import { getThumbnailFallbackImage } from '../../lib/utils';
import { useLanguage } from '../../i18n/LanguageContext';
import './CartDrawer.css';

const CartDrawer = () => {
    const dispatch = useDispatch();
    const { t, formatETB } = useLanguage();
    const items = useSelector(selectCartItems);
    const total = useSelector(selectCartTotal);
    const { isCartOpen } = useSelector((state) => state.cart);

    if (!isCartOpen) return null;

    return (
        <>
            <div className="cart-overlay" onClick={() => dispatch(closeCart())} />
            <div className="cart-drawer animate-slide-in" id="cart-drawer">
                {/* Header */}
                <div className="cart-drawer-header">
                    <h3 className="cart-drawer-title">
                        <FiShoppingBag /> {t('cart_title')}
                        <span className="cart-drawer-count">({items.length})</span>
                    </h3>
                    <button className="cart-drawer-close" onClick={() => dispatch(closeCart())} aria-label={t('a11y_close_cart')}>
                        <FiX size={22} />
                    </button>
                </div>

                {/* Items */}
                <div className="cart-drawer-items">
                    {items.length === 0 ? (
                        <div className="cart-empty">
                            <div className="cart-empty-icon"><FiShoppingBag size={48} /></div>
                            <h4>{t('cart_empty')}</h4>
                            <p>{t('cart_empty_desc')}</p>
                            <Link to="/shop" className="btn btn-primary" onClick={() => dispatch(closeCart())}>
                                {t('cart_start_shopping')}
                            </Link>
                        </div>
                    ) : (
                        items.map((item) => {
                            const itemPrice = item.discountPrice || item.price;
                            const imageUrl = item.images?.[0]?.url || getThumbnailFallbackImage(item.name?.charAt(0) || 'H');
                            return (
                                <div key={item._id} className="cart-item">
                                    <img src={imageUrl} alt={item.name} className="cart-item-image" />
                                    <div className="cart-item-info">
                                        <h4 className="cart-item-name">{item.name}</h4>
                                        <p className="cart-item-price">{formatETB(itemPrice)}</p>
                                        <div className="cart-item-controls">
                                            <div className="qty-controls">
                                                <button
                                                    className="qty-btn"
                                                    onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity - 1 }))}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    <FiMinus size={14} />
                                                </button>
                                                <span className="qty-value">{item.quantity}</span>
                                                <button
                                                    className="qty-btn"
                                                    onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity + 1 }))}
                                                >
                                                    <FiPlus size={14} />
                                                </button>
                                            </div>
                                            <button
                                                className="cart-item-remove"
                                                onClick={() => dispatch(removeFromCart(item._id))}
                                                aria-label={t('a11y_remove_item')}
                                            >
                                                <FiTrash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="cart-drawer-footer">
                        <div className="cart-total">
                            <span>{t('cart_subtotal')}</span>
                            <span className="cart-total-amount">{formatETB(total)}</span>
                        </div>
                        <p className="cart-tax-note">{t('taxes_note')}</p>
                        <Link to="/checkout" className="btn btn-primary btn-lg cart-checkout-btn" onClick={() => dispatch(closeCart())}>
                            {t('cart_checkout')}
                        </Link>
                        <Link to="/cart" className="btn btn-ghost cart-view-btn" onClick={() => dispatch(closeCart())}>
                            {t('view_cart')}
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;
