import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiX, FiPlus, FiMinus, FiTrash2, FiShoppingBag } from 'react-icons/fi';
import { removeFromCart, updateQuantity, closeCart, selectCartItems, selectCartTotal } from '../../redux/slices/cartSlice';
import { getThumbnailFallbackImage } from '../../lib/utils';
import './CartDrawer.css';

const CartDrawer = () => {
    const dispatch = useDispatch();
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
                        <FiShoppingBag /> Shopping Cart
                        <span className="cart-drawer-count">({items.length})</span>
                    </h3>
                    <button className="cart-drawer-close" onClick={() => dispatch(closeCart())} aria-label="Close cart">
                        <FiX size={22} />
                    </button>
                </div>

                {/* Items */}
                <div className="cart-drawer-items">
                    {items.length === 0 ? (
                        <div className="cart-empty">
                            <div className="cart-empty-icon">🛒</div>
                            <h4>Your cart is empty</h4>
                            <p>Browse our halal-certified products and start shopping!</p>
                            <Link to="/shop" className="btn btn-primary" onClick={() => dispatch(closeCart())}>
                                Start Shopping
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
                                        <p className="cart-item-price">{itemPrice?.toLocaleString()} ETB</p>
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
                                                aria-label="Remove item"
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
                            <span>Subtotal</span>
                            <span className="cart-total-amount">{total?.toLocaleString()} ETB</span>
                        </div>
                        <p className="cart-tax-note">Taxes & shipping calculated at checkout</p>
                        <Link to="/checkout" className="btn btn-primary btn-lg cart-checkout-btn" onClick={() => dispatch(closeCart())}>
                            Proceed to Checkout
                        </Link>
                        <Link to="/cart" className="btn btn-ghost cart-view-btn" onClick={() => dispatch(closeCart())}>
                            View Full Cart
                        </Link>
                    </div>
                )}
            </div>
        </>
    );
};

export default CartDrawer;
