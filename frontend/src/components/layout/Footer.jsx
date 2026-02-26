import React from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin, FiArrowRight } from 'react-icons/fi';
import { FaTelegram, FaFacebook, FaInstagram, FaTiktok } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="footer" id="footer">
            {/* Newsletter Section */}
            <div className="footer-newsletter">
                <div className="container">
                    <div className="newsletter-content">
                        <div className="newsletter-text">
                            <h3 className="newsletter-title">Stay Connected with Halal Market</h3>
                            <p className="newsletter-subtitle">
                                Get the latest halal products, deals, and verified merchant updates delivered to your inbox.
                            </p>
                        </div>
                        <form className="newsletter-form" onSubmit={(e) => e.preventDefault()}>
                            <input
                                type="email"
                                placeholder="Enter your email address"
                                className="newsletter-input"
                                id="newsletter-email-input"
                            />
                            <button type="submit" className="btn btn-accent" id="newsletter-submit">
                                Subscribe <FiArrowRight />
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
                            <p className="footer-description">
                                Ethiopia's trusted digital marketplace for halal-certified products.
                                Verified by Majlis — Ethiopian Islamic Affairs Supreme Council.
                            </p>
                            <div className="footer-social">
                                <a href="#" className="social-link" aria-label="Telegram"><FaTelegram /></a>
                                <a href="#" className="social-link" aria-label="Facebook"><FaFacebook /></a>
                                <a href="#" className="social-link" aria-label="Instagram"><FaInstagram /></a>
                                <a href="#" className="social-link" aria-label="TikTok"><FaTiktok /></a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="footer-col">
                            <h4 className="footer-col-title">Quick Links</h4>
                            <ul className="footer-links">
                                <li><Link to="/shop">Shop All Products</Link></li>
                                <li><Link to="/merchants">Verified Merchants</Link></li>
                                <li><Link to="/shop?category=meat">Halal Meat</Link></li>
                                <li><Link to="/shop?category=spices">Ethiopian Spices</Link></li>
                                <li><Link to="/shop?isFeatured=true">Featured Products</Link></li>
                            </ul>
                        </div>

                        {/* For Merchants */}
                        <div className="footer-col">
                            <h4 className="footer-col-title">For Merchants</h4>
                            <ul className="footer-links">
                                <li><Link to="/register">Register as Merchant</Link></li>
                                <li><Link to="/merchant/dashboard">Merchant Dashboard</Link></li>
                                <li><Link to="/certification">Halal Certification</Link></li>
                                <li><Link to="/merchant/guide">Seller Guide</Link></li>
                                <li><Link to="/pricing">Pricing Plans</Link></li>
                            </ul>
                        </div>

                        {/* Contact */}
                        <div className="footer-col">
                            <h4 className="footer-col-title">Contact Us</h4>
                            <ul className="footer-contact">
                                <li>
                                    <FiMapPin className="contact-icon" />
                                    <span>Bole Sub City, Addis Ababa, Ethiopia</span>
                                </li>
                                <li>
                                    <FiPhone className="contact-icon" />
                                    <span>+251 911 123 456</span>
                                </li>
                                <li>
                                    <FiMail className="contact-icon" />
                                    <span>info@halalmarket.et</span>
                                </li>
                            </ul>
                            <div className="footer-payment-methods">
                                <p className="payment-title">We Accept</p>
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
                    <p className="footer-copyright">
                        © {currentYear} Halal Market Ethiopia. All rights reserved. ❤️ Built for Ethiopia's Halal Community
                    </p>
                    <div className="footer-bottom-links">
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/terms">Terms of Service</Link>
                        <Link to="/faq">FAQ</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
