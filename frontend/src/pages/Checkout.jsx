import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FiMapPin, FiCreditCard, FiCheck } from 'react-icons/fi';
import { selectCartItems, selectCartTotal, clearCart } from '../redux/slices/cartSlice';
import orderService from '../services/orderService';
import cartService from '../services/cartService';
import toast from 'react-hot-toast';
import { getThumbnailFallbackImage } from '../lib/utils';
import { useLanguage } from '../i18n/LanguageContext';
import { backendError } from '../utils/backendErrors';
import './Checkout.css';

const PAYMENT_METHODS = [
    { id: 'telebirr', nameKey: 'checkout_telebirr', icon: 'Mobile', descKey: 'pay_telebirr_desc' },
    { id: 'cbe_birr', nameKey: 'checkout_cbe', icon: 'Bank', descKey: 'pay_cbe_desc' },
    { id: 'amole', nameKey: 'checkout_amole', icon: 'Wallet', descKey: 'pay_amole_desc' },
    { id: 'bank_transfer', nameKey: 'checkout_bank', icon: 'Transfer', descKey: 'pay_bank_desc' },
    { id: 'cash_on_delivery', nameKey: 'checkout_cod', icon: 'Cash', descKey: 'pay_cod_desc' },
];

const REGIONS = ['Addis Ababa', 'Afar', 'Amhara', 'Benishangul-Gumuz', 'Dire Dawa', 'Gambella', 'Harari', 'Oromia', 'Sidama', 'Somali', 'South West Ethiopia', 'Southern Nations', 'Tigray'];

const Checkout = () => {
    const dispatch = useDispatch();
    const { t, formatETB } = useLanguage();
    const items = useSelector(selectCartItems);
    const total = useSelector(selectCartTotal);
    const deliveryFee = total > 5000 ? 0 : 150;
    const tax = Math.round(total * 0.15);
    const grandTotal = total + deliveryFee + tax;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [step, setStep] = useState(1);
    const [placedOrder, setPlacedOrder] = useState(null);
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
            toast.error(t('co_fill_required'));
            return;
        }
        setStep(2);
    };

    const handlePlaceOrder = async () => {
        if (!selectedPayment) {
            toast.error(t('co_select_payment'));
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
                toast.error(t('err_cart_empty'));
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
            const res = await orderService.create(orderData);
            const saved = res.order || res;
            setPlacedOrder(saved);
            dispatch(clearCart());
            try {
                await cartService.clearCart();
            } catch {
                // Local cart is already cleared; server cart was emptied by ordering.
            }
            toast.success(t('co_success'), { duration: 4000 });
            setStep(3);
        } catch (error) {
            toast.error(backendError(t, error, 'err_order_failed'));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (items.length === 0 && step !== 3) {
        return (
            <div className="checkout-page">
                <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <h1 className="heading-section">{t('checkout_title')}</h1>
                    <p className="text-body" style={{ margin: '1rem 0 2rem' }}>
                        {t('co_empty')}
                    </p>
                    <a href="/shop" className="btn btn-primary btn-lg">{t('cart_browse')}</a>
                </div>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <div className="container">
                <h1 className="heading-section" style={{ marginBottom: 'var(--space-8)' }}>{t('checkout_title')}</h1>

                {/* Progress Steps */}
                <div className="checkout-steps">
                    {[t('co_step_shipping'), t('co_step_payment'), t('co_step_confirmation')].map((label, i) => (
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
                                <h2><FiMapPin /> {t('checkout_delivery_info')}</h2>
                                <form onSubmit={handleShippingSubmit} className="checkout-form" id="shipping-form">
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label className="input-label">{t('checkout_full_name')} *</label>
                                            <input name="fullName" value={shippingData.fullName} onChange={handleShippingChange} className="input" placeholder={t('co_full_name_ph')} required />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">{t('checkout_phone')} *</label>
                                            <input name="phone" value={shippingData.phone} onChange={handleShippingChange} className="input" placeholder={t('auth_phone_placeholder')} required />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">{t('checkout_address')}</label>
                                        <input name="street" value={shippingData.street} onChange={handleShippingChange} className="input" placeholder={t('co_street_ph')} />
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label className="input-label">{t('checkout_subcity')}</label>
                                            <input name="subcity" value={shippingData.subcity} onChange={handleShippingChange} className="input" placeholder={t('co_subcity_ph')} />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">{t('co_woreda')}</label>
                                            <input name="woreda" value={shippingData.woreda} onChange={handleShippingChange} className="input" placeholder={t('co_woreda')} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="input-group">
                                            <label className="input-label">{t('checkout_city')}</label>
                                            <input name="city" value={shippingData.city} onChange={handleShippingChange} className="input" />
                                        </div>
                                        <div className="input-group">
                                            <label className="input-label">{t('checkout_region')}</label>
                                            <select name="region" value={shippingData.region} onChange={handleShippingChange} className="input">
                                                {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">{t('checkout_notes')}</label>
                                        <textarea name="instructions" value={shippingData.instructions} onChange={handleShippingChange} className="input" rows={3} placeholder={t('co_instructions_ph')} />
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>{t('co_continue_payment')}</button>
                                </form>
                            </div>
                        )}

                        {/* Step 2: Payment */}
                        {step === 2 && (
                            <div className="checkout-section animate-fade-in-up">
                                <h2><FiCreditCard /> {t('checkout_payment_method')}</h2>
                                <div className="payment-methods">
                                    {PAYMENT_METHODS.map((pm) => (
                                        <button
                                            key={pm.id}
                                            className={`payment-method-card ${selectedPayment === pm.id ? 'payment-selected' : ''}`}
                                            onClick={() => setSelectedPayment(pm.id)}
                                        >
                                            <span className="payment-method-icon">{pm.icon}</span>
                                            <div>
                                                <p className="payment-method-name">{t(pm.nameKey)}</p>
                                                <p className="payment-method-desc">{t(pm.descKey)}</p>
                                            </div>
                                            {selectedPayment === pm.id && <FiCheck className="payment-check" />}
                                        </button>
                                    ))}
                                </div>
                                <div className="checkout-nav">
                                    <button className="btn btn-ghost" onClick={() => setStep(1)}>{t('co_back_shipping')}</button>
                                    <button className="btn btn-primary btn-lg" onClick={handlePlaceOrder} disabled={isSubmitting}>
                                        {isSubmitting ? <span className="spinner spinner-sm" /> : t('co_place_order_total', { total: formatETB(grandTotal) })}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Confirmation */}
                        {step === 3 && (
                            <div className="checkout-section checkout-confirmation animate-scale-in">
                                <div className="confirmation-icon"><FiCheck size={48} /></div>
                                <h2>{t('co_success')}</h2>
                                <p>{t('co_thanks')}</p>
                                {placedOrder && placedOrder.totalPrice !== undefined && (
                                    <p className="text-body">
                                        {t('co_placed', {
                                            number: placedOrder.orderNumber || String(placedOrder._id || '').slice(-8).toUpperCase(),
                                            total: formatETB(Number(placedOrder.totalPrice)),
                                        })}
                                    </p>
                                )}
                                <p className="text-ethiopic" style={{ fontSize: '1.25rem', color: 'var(--primary-500)' }}>{t('co_gratitude')}</p>
                                <div className="confirmation-actions">
                                    <a href="/shop" className="btn btn-primary btn-lg">{t('cart_continue')}</a>
                                    <a href={placedOrder?._id ? `/orders/${placedOrder._id}` : '/orders'} className="btn btn-outline btn-lg">{t('co_view_order')}</a>
                                    <a href="/orders" className="btn btn-ghost btn-lg">{t('co_history')}</a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="checkout-summary">
                        <div className="cart-summary-card">
                            <h3>{t('checkout_order_summary')}</h3>
                            <div className="checkout-items-list">
                            {items.map((item) => (
                                <div key={item._id} className="checkout-item">
                                    <img src={item.images?.[0]?.url || getThumbnailFallbackImage(item.name?.charAt(0) || 'H')} alt={item.name} loading="lazy" decoding="async" />
                                    <div>
                                            <p className="checkout-item-name">{item.name}</p>
                                            <p className="checkout-item-qty">{t('co_qty', { qty: item.quantity })}</p>
                                        </div>
                                        <span>{formatETB((item.discountPrice || item.price) * item.quantity)}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="summary-divider" />
                            <div className="summary-row"><span>{t('cart_subtotal')}</span><span>{formatETB(total)}</span></div>
                            <div className="summary-row"><span>{t('cart_delivery')}</span><span>{deliveryFee === 0 ? t('cart_free') : formatETB(deliveryFee)}</span></div>
                            <div className="summary-row"><span>{t('cart_vat')}</span><span>{formatETB(tax)}</span></div>
                            <div className="summary-divider" />
                            <div className="summary-row summary-total"><span>{t('cart_total')}</span><span>{formatETB(grandTotal)}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
