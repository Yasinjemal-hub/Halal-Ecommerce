import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiArrowRight, FiShield, FiTruck, FiCreditCard, FiHeadphones, FiStar, FiCheckCircle } from 'react-icons/fi';
import { fetchFeaturedProducts } from '../../redux/slices/productSlice';
import ProductCard from '../../components/common/ProductCard';
import './Home.css';

const CATEGORIES = [
    { slug: 'meat', name: 'Meat & Poultry', nameAm: 'ስጋ', emoji: '🥩', color: '#dc2626' },
    { slug: 'dairy', name: 'Dairy', nameAm: 'ወተት', emoji: '🥛', color: '#2563eb' },
    { slug: 'spices', name: 'Ethiopian Spices', nameAm: 'ቅመም', emoji: '🌶️', color: '#d97706' },
    { slug: 'bakery', name: 'Bakery', nameAm: 'ዳቦ', emoji: '🍞', color: '#c2410c' },
    { slug: 'honey', name: 'Ethiopian Honey', nameAm: 'ማር', emoji: '🍯', color: '#ca8a04' },
    { slug: 'grains', name: 'Grains & Teff', nameAm: 'ጤፍ', emoji: '🌾', color: '#65a30d' },
    { slug: 'clothing', name: 'Clothing', nameAm: 'ልብስ', emoji: '👗', color: '#7c3aed' },
    { slug: 'cosmetics', name: 'Cosmetics', nameAm: 'ሰው ቅባት', emoji: '✨', color: '#db2777' },
    { slug: 'perfume', name: 'Perfume & Oud', nameAm: 'ሽቱ', emoji: '🌸', color: '#be185d' },
    { slug: 'books', name: 'Islamic Books', nameAm: 'መጻሕፍት', emoji: '📚', color: '#0d9488' },
    { slug: 'home_decor', name: 'Home Décor', nameAm: 'ቤት ማስዋብ', emoji: '🏠', color: '#4f46e5' },
    { slug: 'beverages', name: 'Beverages', nameAm: 'መጠጥ', emoji: '☕', color: '#78350f' },
];

const STATS = [
    { value: '5,000+', label: 'Halal Products' },
    { value: '500+', label: 'Verified Merchants' },
    { value: '50K+', label: 'Happy Customers' },
    { value: '13', label: 'Regions Covered' },
];

const Home = () => {
    const dispatch = useDispatch();
    const { featuredItems } = useSelector((state) => state.products);
    const [activeTestimonial, setActiveTestimonial] = useState(0);

    useEffect(() => {
        dispatch(fetchFeaturedProducts());
    }, [dispatch]);

    const testimonials = [
        {
            name: 'Amina Mohammed',
            role: 'Consumer, Addis Ababa',
            text: 'Finally a platform where I can trust every product is genuinely halal certified. The verification process gives me complete peace of mind.',
            rating: 5,
        },
        {
            name: 'Hassan Ibrahim',
            role: 'Merchant, Dire Dawa',
            text: 'As a halal butcher, this platform helped me reach thousands of new customers. The Majlis verification badge builds instant trust.',
            rating: 5,
        },
        {
            name: 'Fatima Ahmed',
            role: 'Consumer, Harar',
            text: 'I love the Ethiopian spice collection! Ordering online and getting halal-certified products delivered to my door is amazing.',
            rating: 5,
        },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [testimonials.length]);

    // Use demo products if none fetched from API
    const demoProducts = [
        {
            _id: 'demo1', name: 'Premium Halal Beef', nameAmharic: 'ፕሪሚየም ሐላል ስጋ', price: 850, discountPrice: 720,
            category: 'meat', ratingsAverage: 4.8, ratingsCount: 124, halalCertified: true, isFeatured: true, isInStock: true,
            images: [{ url: 'https://placehold.co/400x400/0D7C3D/ffffff?text=Halal+Beef' }],
            merchant: { businessName: 'Addis Halal Meats', verificationStatus: 'approved' }
        },
        {
            _id: 'demo2', name: 'Ethiopian Berbere Spice', nameAmharic: 'በርበሬ ቅመም', price: 180,
            category: 'spices', ratingsAverage: 4.9, ratingsCount: 256, halalCertified: true, isFeatured: true, isInStock: true,
            images: [{ url: 'https://placehold.co/400x400/D4A017/ffffff?text=Berbere+Spice' }],
            merchant: { businessName: 'Harar Spice Market', verificationStatus: 'approved' }
        },
        {
            _id: 'demo3', name: 'Natural Teff Flour', nameAmharic: 'ተፈጥሮአዊ ጤፍ ዱቄት', price: 320,
            category: 'grains', ratingsAverage: 4.7, ratingsCount: 89, halalCertified: true, isFeatured: true, isInStock: true,
            images: [{ url: 'https://placehold.co/400x400/065f2d/ffffff?text=Teff+Flour' }],
            merchant: { businessName: 'Oromia Grains Co.', verificationStatus: 'approved' }
        },
        {
            _id: 'demo4', name: 'Pure Raw Honey', nameAmharic: 'ንጹህ ማር', price: 450, discountPrice: 380,
            category: 'honey', ratingsAverage: 4.9, ratingsCount: 312, halalCertified: true, isFeatured: true, isInStock: true,
            images: [{ url: 'https://placehold.co/400x400/ca8a04/ffffff?text=Ethiopian+Honey' }],
            merchant: { businessName: 'Tigray Honey Farm', verificationStatus: 'approved' }
        },
    ];

    const products = featuredItems.length > 0 ? featuredItems : demoProducts;

    return (
        <div className="home-page">
            {/* ══════════════════ HERO SECTION ══════════════════ */}
            <section className="hero" id="hero-section">
                <div className="hero-bg">
                    <div className="hero-gradient" />
                    <div className="pattern-overlay" />
                    <div className="hero-orbs">
                        <div className="hero-orb hero-orb-1" />
                        <div className="hero-orb hero-orb-2" />
                        <div className="hero-orb hero-orb-3" />
                    </div>
                </div>

                <div className="container hero-content">
                    <div className="hero-text animate-fade-in-up">
                        <div className="hero-badge">
                            <FiShield size={16} />
                            <span>Verified by Majlis — Ethiopian Islamic Affairs Supreme Council</span>
                        </div>

                        <h1 className="heading-hero">
                            Ethiopia's Trusted
                            <br />
                            <span className="text-gradient">Halal Marketplace</span>
                        </h1>

                        <p className="hero-description">
                            Discover thousands of halal-certified products from verified Ethiopian merchants.
                            From premium meat and spices to clothing and cosmetics — all verified, all trusted.
                        </p>

                        <p className="hero-amharic text-ethiopic">
                            የኢትዮጵያ ታማኝ የሐላል ገበያ
                        </p>

                        <div className="hero-actions">
                            <Link to="/shop" className="btn btn-primary btn-lg" id="hero-shop-btn">
                                Shop Now <FiArrowRight />
                            </Link>
                            <Link to="/register" className="btn btn-glass btn-lg" id="hero-merchant-btn">
                                Become a Merchant
                            </Link>
                        </div>

                        {/* Stats */}
                        <div className="hero-stats">
                            {STATS.map((stat) => (
                                <div key={stat.label} className="hero-stat">
                                    <span className="hero-stat-value">{stat.value}</span>
                                    <span className="hero-stat-label">{stat.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="hero-visual animate-fade-in">
                        <div className="hero-card hero-card-1">
                            <div className="hero-card-emoji">🥩</div>
                            <div>
                                <p className="hero-card-title">Premium Halal Meat</p>
                                <p className="hero-card-detail">From 650 ETB</p>
                            </div>
                            <span className="badge badge-halal" style={{ marginLeft: 'auto' }}>☪ Halal</span>
                        </div>
                        <div className="hero-card hero-card-2">
                            <div className="hero-card-emoji">🌶️</div>
                            <div>
                                <p className="hero-card-title">Ethiopian Spices</p>
                                <p className="hero-card-detail">Berbere, Mitmita & more</p>
                            </div>
                            <span className="badge badge-verified" style={{ marginLeft: 'auto' }}>✓ Verified</span>
                        </div>
                        <div className="hero-card hero-card-3">
                            <div className="hero-card-emoji">🍯</div>
                            <div>
                                <p className="hero-card-title">Pure Honey</p>
                                <p className="hero-card-detail">100% Natural</p>
                            </div>
                            <span className="badge badge-new" style={{ marginLeft: 'auto' }}>New</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ TRUST BAR ══════════════════ */}
            <section className="trust-bar">
                <div className="container">
                    <div className="trust-items">
                        <div className="trust-item">
                            <div className="trust-icon"><FiShield /></div>
                            <div>
                                <h4>Halal Certified</h4>
                                <p>Verified by Majlis</p>
                            </div>
                        </div>
                        <div className="trust-item">
                            <div className="trust-icon"><FiTruck /></div>
                            <div>
                                <h4>Fast Delivery</h4>
                                <p>Across all regions</p>
                            </div>
                        </div>
                        <div className="trust-item">
                            <div className="trust-icon"><FiCreditCard /></div>
                            <div>
                                <h4>Secure Payment</h4>
                                <p>TeleBirr, CBE Birr & more</p>
                            </div>
                        </div>
                        <div className="trust-item">
                            <div className="trust-icon"><FiHeadphones /></div>
                            <div>
                                <h4>24/7 Support</h4>
                                <p>Always here to help</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ CATEGORIES ══════════════════ */}
            <section className="section categories-section" id="categories-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-subtitle">☪ Browse By Category</span>
                        <h2 className="heading-section section-title">Shop Halal Categories</h2>
                        <p className="section-description">
                            Explore our wide range of halal-certified product categories
                        </p>
                    </div>

                    <div className="categories-grid stagger-children">
                        {CATEGORIES.map((cat) => (
                            <Link
                                key={cat.slug}
                                to={`/shop?category=${cat.slug}`}
                                className="category-card animate-fade-in-up"
                                id={`category-${cat.slug}`}
                            >
                                <div className="category-card-icon" style={{ background: `${cat.color}15` }}>
                                    <span>{cat.emoji}</span>
                                </div>
                                <h3 className="category-card-name">{cat.name}</h3>
                                <p className="category-card-amharic text-ethiopic">{cat.nameAm}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ FEATURED PRODUCTS ══════════════════ */}
            <section className="section featured-section" id="featured-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-subtitle">⭐ Handpicked For You</span>
                        <h2 className="heading-section section-title">Featured Products</h2>
                        <p className="section-description">
                            Top-rated halal products from Ethiopia's most trusted merchants
                        </p>
                    </div>

                    <div className="grid grid-products stagger-children">
                        {products.map((product) => (
                            <ProductCard key={product._id} product={product} />
                        ))}
                    </div>

                    <div className="section-action">
                        <Link to="/shop" className="btn btn-outline btn-lg" id="view-all-products">
                            View All Products <FiArrowRight />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ══════════════════ WHY CHOOSE US ══════════════════ */}
            <section className="section why-section" id="why-section">
                <div className="container">
                    <div className="why-grid">
                        <div className="why-content">
                            <span className="section-subtitle">🕌 Why Halal Market Ethiopia</span>
                            <h2 className="heading-section">Built on Trust,<br />Powered by <span className="text-gradient">Transparency</span></h2>
                            <p className="text-body" style={{ marginBottom: 'var(--space-6)' }}>
                                We're more than a marketplace. We're a movement to formalize Ethiopia's halal economy
                                and bring transparency to every transaction.
                            </p>

                            <div className="why-features">
                                <div className="why-feature">
                                    <div className="why-feature-icon"><FiCheckCircle /></div>
                                    <div>
                                        <h4>Majlis Verification</h4>
                                        <p>Every merchant is verified by the Ethiopian Islamic Affairs Supreme Council</p>
                                    </div>
                                </div>
                                <div className="why-feature">
                                    <div className="why-feature-icon"><FiCheckCircle /></div>
                                    <div>
                                        <h4>Certificate Tracking</h4>
                                        <p>Real-time halal certificate status with expiry notifications</p>
                                    </div>
                                </div>
                                <div className="why-feature">
                                    <div className="why-feature-icon"><FiCheckCircle /></div>
                                    <div>
                                        <h4>Ethiopian Payment Methods</h4>
                                        <p>Pay with TeleBirr, CBE Birr, Amole, or bank transfer</p>
                                    </div>
                                </div>
                                <div className="why-feature">
                                    <div className="why-feature-icon"><FiCheckCircle /></div>
                                    <div>
                                        <h4>Multi-Language Support</h4>
                                        <p>Available in English, Amharic, Afaan Oromoo, and Somali</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="why-visual">
                            <div className="why-visual-card">
                                <div className="why-visual-pattern pattern-overlay" />
                                <div className="why-stats-grid">
                                    <div className="why-stat-card">
                                        <span className="why-stat-icon">🕌</span>
                                        <span className="why-stat-value">100%</span>
                                        <span className="why-stat-label">Halal Verified</span>
                                    </div>
                                    <div className="why-stat-card">
                                        <span className="why-stat-icon">🇪🇹</span>
                                        <span className="why-stat-value">13</span>
                                        <span className="why-stat-label">Regions</span>
                                    </div>
                                    <div className="why-stat-card">
                                        <span className="why-stat-icon">⭐</span>
                                        <span className="why-stat-value">4.8</span>
                                        <span className="why-stat-label">Avg Rating</span>
                                    </div>
                                    <div className="why-stat-card">
                                        <span className="why-stat-icon">🛡️</span>
                                        <span className="why-stat-value">24/7</span>
                                        <span className="why-stat-label">Support</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ TESTIMONIALS ══════════════════ */}
            <section className="section testimonials-section" id="testimonials-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-subtitle">💬 What Our Community Says</span>
                        <h2 className="heading-section section-title">Trusted by Thousands</h2>
                    </div>

                    <div className="testimonials-slider">
                        {testimonials.map((t, index) => (
                            <div
                                key={index}
                                className={`testimonial-card ${index === activeTestimonial ? 'testimonial-active' : ''}`}
                            >
                                <div className="testimonial-rating">
                                    {[...Array(t.rating)].map((_, i) => (
                                        <FiStar key={i} size={16} fill="var(--accent-500)" color="var(--accent-500)" />
                                    ))}
                                </div>
                                <p className="testimonial-text">"{t.text}"</p>
                                <div className="testimonial-author">
                                    <div className="testimonial-avatar">
                                        {t.name[0]}
                                    </div>
                                    <div>
                                        <p className="testimonial-name">{t.name}</p>
                                        <p className="testimonial-role">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="testimonial-dots">
                        {testimonials.map((_, i) => (
                            <button
                                key={i}
                                className={`testimonial-dot ${i === activeTestimonial ? 'dot-active' : ''}`}
                                onClick={() => setActiveTestimonial(i)}
                                aria-label={`Testimonial ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ CTA SECTION ══════════════════ */}
            <section className="cta-section" id="cta-section">
                <div className="cta-bg">
                    <div className="pattern-overlay" />
                </div>
                <div className="container cta-content">
                    <h2 className="heading-section" style={{ color: 'white' }}>
                        Ready to Join Ethiopia's
                        <br />Halal Digital Economy?
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.0625rem', maxWidth: '500px', margin: '0 auto var(--space-8)' }}>
                        Whether you're a consumer looking for trusted products or a merchant ready to grow — we've got you covered.
                    </p>
                    <div className="cta-actions">
                        <Link to="/shop" className="btn btn-accent btn-lg">
                            Start Shopping <FiArrowRight />
                        </Link>
                        <Link to="/register" className="btn btn-glass btn-lg" style={{ color: 'white' }}>
                            Register as Merchant
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
