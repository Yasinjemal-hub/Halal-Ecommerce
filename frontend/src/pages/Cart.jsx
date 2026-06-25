import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiTrash2, FiMinus, FiPlus, FiArrowLeft, FiShoppingBag, FiArrowRight } from 'react-icons/fi';
import { removeFromCart, updateQuantity, clearCart, selectCartItems, selectCartTotal } from '../redux/slices/cartSlice';
import { getThumbnailFallbackImage } from '../lib/utils';
import './Cart.css';

const Cart = () => {
    const dispatch = useDispatch();
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
                        <div className="cart-empty-illustration">🛒</div>
                        <h2>Your cart is empty</h2>
                        <p>Looks like you haven't added any halal products yet!</p>
                        <Link to="/shop" className="btn btn-primary btn-lg">
                            <FiShoppingBag /> Browse Products
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
                    <h1 className="heading-section">Shopping Cart</h1>
                    <p className="text-body">{items.length} item{items.length !== 1 ? 's' : ''} in your cart</p>
                </div>

                <div className="cart-layout">
                    {/* Cart Items */}
                    <div className="cart-items-section">
                        {items.map((item) => {
                            const itemPrice = item.discountPrice || item.price;
                            const imageUrl = item.images?.[0]?.url || getThumbnailFallbackImage(item.name?.charAt(0) || 'H');
                            return (
                                <div key={item._id} className="cart-page-item">
                                    <img src={imageUrl} alt={item.name} className="cart-page-item-image" />
                                    <div className="cart-page-item-info">
                                        <h3>{item.name}</h3>
                                        {item.halalCertified && <span className="badge badge-halal" style={{ fontSize: '0.65rem' }}>☪ Halal</span>}
                                        <p className="cart-page-item-merchant">{item.merchant?.businessName}</p>
                                    </div>
                                    <div className="cart-page-item-qty">
                                        <button className="qty-btn" onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity - 1 }))} disabled={item.quantity <= 1}><FiMinus size={14} /></button>
                                        <span className="qty-value">{item.quantity}</span>
                                        <button className="qty-btn" onClick={() => dispatch(updateQuantity({ id: item._id, quantity: item.quantity + 1 }))}><FiPlus size={14} /></button>
                                    </div>
                                    <div className="cart-page-item-price">
                                        <span className="price-current">{(itemPrice * item.quantity).toLocaleString()} ETB</span>
                                        {item.quantity > 1 && <span className="price-unit">{itemPrice.toLocaleString()} each</span>}
                                    </div>
                                    <button className="cart-page-item-remove" onClick={() => dispatch(removeFromCart(item._id))}>
                                        <FiTrash2 size={18} />
                                    </button>
                                </div>
                            );
                        })}

                        <div className="cart-page-actions">
                            <Link to="/shop" className="btn btn-ghost"><FiArrowLeft /> Continue Shopping</Link>
                            <button className="btn btn-ghost" style={{ color: 'var(--error)' }} onClick={() => dispatch(clearCart())}>
                                <FiTrash2 /> Clear Cart
                            </button>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="cart-summary">
                        <div className="cart-summary-card">
                            <h3>Order Summary</h3>
                            <div className="summary-row">
                                <span>Subtotal</span>
                                <span>{total.toLocaleString()} ETB</span>
                            </div>
                            <div className="summary-row">
                                <span>Delivery Fee</span>
                                <span>{deliveryFee === 0 ? <span className="free-shipping">FREE</span> : `${deliveryFee} ETB`}</span>
                            </div>
                            <div className="summary-row">
                                <span>VAT (15%)</span>
                                <span>{tax.toLocaleString()} ETB</span>
                            </div>
                            {deliveryFee > 0 && (
                                <p className="summary-note">🚛 Free delivery on orders above 5,000 ETB</p>
                            )}
                            <div className="summary-divider" />
                            <div className="summary-row summary-total">
                                <span>Total</span>
                                <span>{grandTotal.toLocaleString()} ETB</span>
                            </div>
                            <Link to="/checkout" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 'var(--space-4)' }}>
                                Proceed to Checkout <FiArrowRight />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Cart;
