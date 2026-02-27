import React from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin, FiArrowRight } from 'react-icons/fi';
import { FaTelegram, FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa';
import { useLanguage } from '../../i18n/LanguageContext';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    const { t } = useLanguage();

    return (
        <footer className="footer" id="footer">
            {/* Newsletter Section */}
            <div className="footer-newsletter">
                <div className="container">
                    <div className="newsletter-content">
                        <div className="newsletter-text">
                            <h3 className="newsletter-title">{t('footer_newsletter_title')}</h3>
                            <p className="newsletter-subtitle">{t('footer_newsletter_desc')}</p>
                        </div>
                        <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                            <input type="email" placeholder={t('footer_newsletter_placeholder')} className="newsletter-input" id="newsletter-email-input" />
                            <button type="submit" className="btn btn-accent" id="newsletter-submit">
                                {t('footer_newsletter_btn')} <FiArrowRight />
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Main Footer */}
            <div className="footer-main">
                <div className="container">
                    <div className="footer-grid">
                        {/* Brand Column */}
                        <div className="footer-col footer-brand">
                            <div className="footer-logo">
                                <div className="footer-logo-icon">
                                    <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="20" cy="20" r="18" fill="url(#footer-logo-gradient)" />
                                        <path d="M20 8L22.5 14H28L23.5 18L25.5 24L20 20.5L14.5 24L16.5 18L12 14H17.5L20 8Z" fill="white" />
                                        <path d="M20 26C20 26 14 30 14 32H26C26 30 20 26 20 26Z" fill="white" opacity="0.8" />
                                        <defs>
                                            <linearGradient id="footer-logo-gradient" x1="0" y1="0" x2="40" y2="40">
                                                <stop stopColor="#0D7C3D" />
                                                <stop offset="1" stopColor="#065f2d" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                </div>
                                <div>
                                    <span className="footer-logo-name">Halal<span className="logo-accent">Market</span></span>
                                    <span className="footer-logo-tagline">Ethiopia</span>
                                </div>
                            </div>
                            <p className="footer-description">{t('trust_halal_desc')}. {t('hero_badge')}.</p>
                            <div className="footer-social">
                                <a href="#" className="social-link" aria-label="Telegram"><FaTelegram /></a>
                                <a href="#" className="social-link" aria-label="Facebook"><FaFacebook /></a>
                                <a href="#" className="social-link" aria-label="Instagram"><FaInstagram /></a>
                                <a href="#" className="social-link" aria-label="TikTok"><FaTiktok /></a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="footer-col">
                            <h4 className="footer-col-title">{t('footer_quick_links')}</h4>
                            <ul className="footer-links">
                                <li><Link to="/shop">{t('footer_shop_all')}</Link></li>
                                <li><Link to="/merchants">{t('footer_verified_merchants')}</Link></li>
                                <li><Link to="/shop?category=meat">{t('footer_halal_meat')}</Link></li>
                                <li><Link to="/shop?category=spices">{t('footer_ethiopian_spices')}</Link></li>
                                <li><Link to="/shop?isFeatured=true">{t('footer_featured')}</Link></li>
                            </ul>
                        </div>

                        {/* For Merchants */}
                        <div className="footer-col">
                            <h4 className="footer-col-title">{t('footer_for_merchants')}</h4>
                            <ul className="footer-links">
                                <li><Link to="/register">{t('footer_register_merchant')}</Link></li>
                                <li><Link to="/merchant/dashboard">{t('footer_merchant_dashboard')}</Link></li>
                                <li><Link to="/certification">{t('footer_halal_certification')}</Link></li>
                                <li><Link to="/merchant/guide">{t('footer_seller_guide')}</Link></li>
                                <li><Link to="/pricing">{t('footer_pricing')}</Link></li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div className="footer-col">
                            <h4 className="footer-col-title">{t('footer_contact')}</h4>
                            <ul className="footer-contact">
                                <li><FiMapPin className="contact-icon" /><span>Bole Sub City, Addis Ababa, Ethiopia</span></li>
                                <li><FiPhone className="contact-icon" /><span>+251 911 123 456</span></li>
                                <li><FiMail className="contact-icon" /><span>info@halalmarket.et</span></li>
                            </ul>
                            <div className="footer-payment-methods">
                                <p className="payment-title">{t('footer_we_accept')}</p>
                                <div className="payment-badges">
                                    <span className="payment-badge">TeleBirr</span>
                                    <span className="payment-badge">CBE Birr</span>
                                    <span className="payment-badge">Amole</span>
                                    <span className="payment-badge">Bank</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="footer-bottom">
                <div className="container footer-bottom-inner">
                    <p className="footer-copyright">{t('footer_copyright', { year: currentYear })}</p>
                    <div className="footer-bottom-links">
                        <Link to="/privacy">{t('footer_privacy')}</Link>
                        <Link to="/terms">{t('footer_terms')}</Link>
                        <Link to="/faq">{t('footer_faq')}</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
