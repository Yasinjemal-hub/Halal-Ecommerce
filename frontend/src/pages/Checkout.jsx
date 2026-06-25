import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FiMapPin, FiCreditCard, FiCheck } from 'react-icons/fi';
import { selectCartItems, selectCartTotal, clearCart } from '../redux/slices/cartSlice';
import orderService from '../services/orderService';
import cartService from '../services/cartService';
import toast from 'react-hot-toast';
import { getThumbnailFallbackImage } from '../lib/utils';
import './Checkout.css';

const PAYMENT_METHODS = [
    { id: 'telebirr', name: 'TeleBirr', icon: '📱', description: 'Pay via TeleBirr mobile money' },
    { id: 'cbe_birr', name: 'CBE Birr', icon: '🏦', description: 'Commercial Bank of Ethiopia' },
    { id: 'amole', name: 'Amole', icon: '💳', description: 'Dashen Bank digital wallet' },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏛️', description: 'Direct bank transfer' },
    { id: 'cash_on_delivery', name: 'Cash on Delivery', icon: '💵', description: 'Pay when you receive' },
];

const REGIONS = ['Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 'Gambella', 'Harari', 'Oromia', 'Sidama', 'Somali', 'South West Ethiopia', 'Southern Nations', 'Tigray'];

const Checkout = () => {
    const dispatch = useDispatch();
    const items = useSelector(selectCartItems);
    const total = useSelector(selectCartTotal);
    const deliveryFee = total > 5000 ? 0 : 150;
    const tax = Math.round(total * 0.15);
    const grandTotal = total + deliveryFee + tax;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [step, setStep] = useState(1);
    const [shippingData, setShippingData] = useState({
        fullName: '', phone: '', street: '', subcity: '', woreda: '', city: 'Addis Ababa', region: 'Addis Ababa', instructions: '',
    });
    const [selectedPayment, setSelectedPayment] = useState('');

    const handleShippingChange = (e) => {
        setShippingData({ ...shippingData, [e.target.name]: e.target.value });
    };

    const handleShippingSubmit = (e) => {
        e.preventDefault();
        if (!shippingData.fullName || !shippingData.phone) {
            toast.error('Please fill required fields');
            return;
        }
        setStep(2);
    };

    const handlePlaceOrder = async () => {
        if (!selectedPayment) {
            toast.error('Please select a payment method');
            return;
        }
        setIsSubmitting(true);
            try {
                // Step 1: Sync local cart items to server cart
                // Clear server cart first to avoid duplicates
                try {
                    await cartService.clearCart();
                } catch (e) {
                    // Ignore if cart doesn't exist yet
                }

            // Validate that cart is not empty
            // Backend will validate product IDs and availability
            if (items.length === 0) {
                toast.error('Your cart is empty. Please add items before placing an order.');
                setIsSubmitting(false);
                return;
            }

            // Add items to the server cart
            for (const item of items) {
                await cartService.addToCart(item._id, item.quantity);
            }

            // Step 2: Place order (backend reads from server cart)
            const orderData = {
                shippingAddress: {
                    fullName: shippingData.fullName,
                    phone: shippingData.phone,
                    street: shippingData.street,
                    subcity: shippingData.subcity,
                    woreda: shippingData.woreda,
                    city: shippingData.city,
                    region: shippingData.region,
                    deliveryInstructions: shippingData.instructions,
                },
                paymentMethod: selectedPayment,
                deliveryFee: deliveryFee,
            };
            await orderService.create(orderData);
            dispatch(clearCart());
            toast.success('Order placed successfully! 🎉', { duration: 4000 });
            setStep(3);
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to place order. Please try again.';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="checkout-page">
            <div className="container">
                <h1 className="heading-section" style={{ marginBottom: 'var(--space-8)' }}>Checkout</h1>

                {/* Progress Steps */}
                <div className="checkout-steps">
                    {['Shipping', 'Payment', 'Confirmation'].map((label, i) => (
                        <div key={i} className={`checkout-step ${step > i ? 'step-completed' : ''} ${step === i + 1 ? 'step-active' : ''}`}>
                            <div className="step-circle">{step > i + 1 ? <FiCheck /> : i + 1}</div>
                            <span className="step-label">{label}</span>
                        </div>
                    ))}
                </div>

                <div className="checkout-layout">
                    <div className="checkout-main">
                        {/* Step 1: Shipping */}
                        {step === 1 && (
                            <div className="checkout-section animate-fade-in-up">
                                <h2><FiMapPin /> Shipping Address</h2>
                                <form onSubmit={handleShippingSubmit} className="checkout-form" id="shipping-form">
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label className="input-label">Full Name *</label>
                                            <input name="fullName" value={shippingData.fullName} onChange={handleShippingChange} className="input" placeholder="Full name" required />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Phone *</label>
                                            <input name="phone" value={shippingData.phone} onChange={handleShippingChange} className="input" placeholder="+251 9XX XXX XXX" required />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Street Address</label>
                                        <input name="street" value={shippingData.street} onChange={handleShippingChange} className="input" placeholder="Street address" />
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label className="input-label">Sub City</label>
                                            <input name="subcity" value={shippingData.subcity} onChange={handleShippingChange} className="input" placeholder="Sub city" />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Woreda</label>
                                            <input name="woreda" value={shippingData.woreda} onChange={handleShippingChange} className="input" placeholder="Woreda" />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label className="input-label">City</label>
                                            <input name="city" value={shippingData.city} onChange={handleShippingChange} className="input" />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">Region</label>
                                            <select name="region" value={shippingData.region} onChange={handleShippingChange} className="input">
                                                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">Delivery Instructions (optional)</label>
                                        <textarea name="instructions" value={shippingData.instructions} onChange={handleShippingChange} className="input" rows={3} placeholder="Any special instructions..." />
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>Continue to Payment</button>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Payment */}
                        {step === 2 && (
                            <div className="checkout-section animate-fade-in-up">
                                <h2><FiCreditCard /> Payment Method</h2>
                                <div className="payment-methods">
                                    {PAYMENT_METHODS.map((pm) => (
                                        <button
                                            key={pm.id}
                                            className={`payment-method-card ${selectedPayment === pm.id ? 'payment-selected' : ''}`}
                                            onClick={() => setSelectedPayment(pm.id)}
                                        >
                                            <span className="payment-method-icon">{pm.icon}</span>
                                            <div>
                                                <p className="payment-method-name">{pm.name}</p>
                                                <p className="payment-method-desc">{pm.description}</p>
                                            </div>
                                            {selectedPayment === pm.id && <FiCheck className="payment-check" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="checkout-nav">
                                    <button className="btn btn-ghost" onClick={() => setStep(1)}>Back to Shipping</button>
                                    <button className="btn btn-primary btn-lg" onClick={handlePlaceOrder} disabled={isSubmitting}>
                                        {isSubmitting ? <span className="spinner spinner-sm" /> : `Place Order — ${grandTotal.toLocaleString()} ETB`}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Confirmation */}
                        {step === 3 && (
                            <div className="checkout-section checkout-confirmation animate-scale-in">
                                <div className="confirmation-icon">✅</div>
                                <h2>Order Placed Successfully!</h2>
                                <p>Thank you for shopping with Halal Market Ethiopia! Your order has been received and is being processed.</p>
                                <p className="text-ethiopic" style={{ fontSize: '1.25rem', color: 'var(--primary-500)' }}>አመሰግናለሁ!</p>
                                <div className="confirmation-actions">
                                    <a href="/shop" className="btn btn-primary btn-lg">Continue Shopping</a>
                                    <a href="/orders" className="btn btn-outline btn-lg">View Orders</a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="checkout-summary">
                        <div className="cart-summary-card">
                            <h3>Order Summary</h3>
                            <div className="checkout-items-list">
                            {items.map((item) => (
                                <div key={item._id} className="checkout-item">
                                    <img src={item.images?.[0]?.url || getThumbnailFallbackImage(item.name?.charAt(0) || 'H')} alt={item.name} />
                                    <div>
                                            <p className="checkout-item-name">{item.name}</p>
                                            <p className="checkout-item-qty">Qty: {item.quantity}</p>
                                        </div>
                                        <span>{((item.discountPrice || item.price) * item.quantity).toLocaleString()} ETB</span>
                                    </div>
                                ))}
                            </div>
                            <div className="summary-divider" />
                            <div className="summary-row"><span>Subtotal</span><span>{total.toLocaleString()} ETB</span></div>
                            <div className="summary-row"><span>Delivery</span><span>{deliveryFee === 0 ? 'FREE' : `${deliveryFee} ETB`}</span></div>
                            <div className="summary-row"><span>VAT (15%)</span><span>{tax.toLocaleString()} ETB</span></div>
                            <div className="summary-divider" />
                            <div className="summary-row summary-total"><span>Total</span><span>{grandTotal.toLocaleString()} ETB</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
