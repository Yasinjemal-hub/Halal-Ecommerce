import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiArrowRight, FiShield, FiTruck, FiCreditCard, FiHeadphones, FiStar, FiCheckCircle } from 'react-icons/fi';
import { fetchFeaturedProducts } from '../redux/slices/productSlice';
import ProductCard from '../components/common/ProductCard';
import { useLanguage } from '../i18n/LanguageContext';
import './Home.css';

const Home = () => {
    const dispatch = useDispatch();
    const { featuredItems } = useSelector((state) => state.products);
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const { t } = useLanguage();

    useEffect(() => {
        dispatch(fetchFeaturedProducts());
    }, [dispatch]);

    const CATEGORIES = [
        { slug: 'meat', key: 'cat_meat', nameAm: 'ስጋ', emoji: '🥩', color: '#dc2626' },
        { slug: 'dairy', key: 'cat_dairy', nameAm: 'ወተት', emoji: '🥛', color: '#2563eb' },
        { slug: 'spices', key: 'cat_spices', nameAm: 'ቅመም', emoji: '🌶️', color: '#d97706' },
        { slug: 'bakery', key: 'cat_bakery', nameAm: 'ዳቦ', emoji: '🍞', color: '#c2410c' },
        { slug: 'honey', key: 'cat_honey', nameAm: 'ማር', emoji: '🍯', color: '#ca8a04' },
        { slug: 'grains', key: 'cat_grains', nameAm: 'ጤፍ', emoji: '🌾', color: '#65a30d' },
        { slug: 'clothing', key: 'cat_clothing', nameAm: 'ልብስ', emoji: '👗', color: '#7c3aed' },
        { slug: 'cosmetics', key: 'cat_cosmetics', nameAm: 'ሰው ቅባት', emoji: '✨', color: '#db2777' },
        { slug: 'perfume', key: 'cat_perfume', nameAm: 'ሽቱ', emoji: '🌸', color: '#be185d' },
        { slug: 'books', key: 'cat_books', nameAm: 'መጻሕፍት', emoji: '📚', color: '#0d9488' },
        { slug: 'home_decor', key: 'cat_home_decor', nameAm: 'ቤት ማስዋብ', emoji: '🏠', color: '#4f46e5' },
        { slug: 'beverages', key: 'cat_beverages', nameAm: 'መጠጥ', emoji: '☕', color: '#78350f' },
    ];

    const STATS = [
        { value: '5,000+', labelKey: 'hero_stat_products' },
        { value: '500+', labelKey: 'hero_stat_merchants' },
        { value: '50K+', labelKey: 'hero_stat_customers' },
        { value: '13', labelKey: 'hero_stat_regions' },
    ];

    const testimonials = [
        { name: 'Amina Mohammed', role: 'Consumer, Addis Ababa', text: 'Finally a platform where I can trust every product is genuinely halal certified. The verification process gives me complete peace of mind.', rating: 5 },
        { name: 'Hassan Ibrahim', role: 'Merchant, Dire Dawa', text: 'As a halal butcher, this platform helped me reach thousands of new customers. The Majlis verification badge builds instant trust.', rating: 5 },
        { name: 'Fatima Ahmed', role: 'Consumer, Harar', text: 'I love the Ethiopian spice collection! Ordering online and getting halal-certified products delivered to my door is amazing.', rating: 5 },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [testimonials.length]);

    const demoProducts = [
        { _id: 'demo1', name: 'Premium Halal Beef', nameAmharic: 'ፕሪሚየም ሐላል ስጋ', price: 850, discountPrice: 720, category: 'meat', ratingsAverage: 4.8, ratingsCount: 124, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/0D7C3D/ffffff?text=Halal+Beef' }], merchant: { businessName: 'Addis Halal Meats', verificationStatus: 'approved' } },
        { _id: 'demo2', name: 'Ethiopian Berbere Spice', nameAmharic: 'በርበሬ ቅመም', price: 180, category: 'spices', ratingsAverage: 4.9, ratingsCount: 256, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/D4A017/ffffff?text=Berbere+Spice' }], merchant: { businessName: 'Harar Spice Market', verificationStatus: 'approved' } },
        { _id: 'demo3', name: 'Natural Teff Flour', nameAmharic: 'ተፈጥሮአዊ ጤፍ ዱቄት', price: 320, category: 'grains', ratingsAverage: 4.7, ratingsCount: 89, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/065f2d/ffffff?text=Teff+Flour' }], merchant: { businessName: 'Oromia Grains Co.', verificationStatus: 'approved' } },
        { _id: 'demo4', name: 'Pure Raw Honey', nameAmharic: 'ንጹህ ማር', price: 450, discountPrice: 380, category: 'honey', ratingsAverage: 4.9, ratingsCount: 312, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/ca8a04/ffffff?text=Ethiopian+Honey' }], merchant: { businessName: 'Tigray Honey Farm', verificationStatus: 'approved' } },
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
                            <span>{t('hero_badge')}</span>
                        </div>
                        <h1 className="heading-hero">
                            {t('hero_title_1')}<br />
                            <span className="text-gradient">{t('hero_title_2')}</span>
                        </h1>
                        <p className="hero-description">{t('hero_description')}</p>
                        <div className="hero-actions">
                            <Link to="/shop" className="btn btn-primary btn-lg" id="hero-shop-btn">
                                {t('hero_cta_shop')} <FiArrowRight />
                            </Link>
                            <Link to="/register" className="btn btn-glass btn-lg" id="hero-merchant-btn">
                                {t('hero_cta_merchant')}
                            </Link>
                        </div>
                        <div className="hero-stats">
                            {STATS.map((stat) => (
                                <div key={stat.labelKey} className="hero-stat">
                                    <span className="hero-stat-value">{stat.value}</span>
                                    <span className="hero-stat-label">{t(stat.labelKey)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="hero-visual animate-fade-in">
                        <div className="hero-card hero-card-1">
                            <div className="hero-card-emoji">🥩</div>
                            <div><p className="hero-card-title">{t('cat_meat')}</p><p className="hero-card-detail">From 650 ETB</p></div>
                            <span className="badge badge-halal" style={{ marginLeft: 'auto' }}>{t('product_halal')}</span>
                        </div>
                        <div className="hero-card hero-card-2">
                            <div className="hero-card-emoji">🌶️</div>
                            <div><p className="hero-card-title">{t('cat_spices')}</p><p className="hero-card-detail">Berbere, Mitmita & more</p></div>
                            <span className="badge badge-verified" style={{ marginLeft: 'auto' }}>✓ {t('verified')}</span>
                        </div>
                        <div className="hero-card hero-card-3">
                            <div className="hero-card-emoji">🍯</div>
                            <div><p className="hero-card-title">{t('cat_honey')}</p><p className="hero-card-detail">100% Natural</p></div>
                            <span className="badge badge-new" style={{ marginLeft: 'auto' }}>New</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ TRUST BAR ══════════════════ */}
            <section className="trust-bar">
                <div className="container">
                    <div className="trust-items">
                        <div className="trust-item"><div className="trust-icon"><FiShield /></div><div><h4>{t('trust_halal')}</h4><p>{t('trust_halal_desc')}</p></div></div>
                        <div className="trust-item"><div className="trust-icon"><FiTruck /></div><div><h4>{t('trust_delivery')}</h4><p>{t('trust_delivery_desc')}</p></div></div>
                        <div className="trust-item"><div className="trust-icon"><FiCreditCard /></div><div><h4>{t('trust_payment')}</h4><p>{t('trust_payment_desc')}</p></div></div>
                        <div className="trust-item"><div className="trust-icon"><FiHeadphones /></div><div><h4>{t('trust_support')}</h4><p>{t('trust_support_desc')}</p></div></div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ CATEGORIES ══════════════════ */}
            <section className="section categories-section" id="categories-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-subtitle">{t('cat_browse')}</span>
                        <h2 className="heading-section section-title">{t('cat_title')}</h2>
                        <p className="section-description">{t('cat_description')}</p>
                    </div>
                    <div className="categories-grid stagger-children">
                        {CATEGORIES.map((cat) => (
                            <Link key={cat.slug} to={`/shop?category=${cat.slug}`} className="category-card animate-fade-in-up" id={`category-${cat.slug}`}>
                                <div className="category-card-icon" style={{ background: `${cat.color}15` }}><span>{cat.emoji}</span></div>
                                <h3 className="category-card-name">{t(cat.key)}</h3>
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
                        <span className="section-subtitle">{t('featured_subtitle')}</span>
                        <h2 className="heading-section section-title">{t('featured_title')}</h2>
                        <p className="section-description">{t('featured_description')}</p>
                    </div>
                    <div className="grid grid-products stagger-children">
                        {products.map((product) => (<ProductCard key={product._id} product={product} />))}
                    </div>
                    <div className="section-action">
                        <Link to="/shop" className="btn btn-outline btn-lg" id="view-all-products">{t('featured_view_all')} <FiArrowRight /></Link>
                    </div>
                </div>
            </section>

            {/* ══════════════════ WHY CHOOSE US ══════════════════ */}
            <section className="section why-section" id="why-section">
                <div className="container">
                    <div className="why-grid">
                        <div className="why-content">
                            <span className="section-subtitle">{t('why_subtitle')}</span>
                            <h2 className="heading-section">{t('why_title_1')}<br />{t('why_title_2')} <span className="text-gradient">{t('why_title_3')}</span></h2>
                            <p className="text-body" style={{ marginBottom: 'var(--space-6)' }}>{t('why_description')}</p>
                            <div className="why-features">
                                <div className="why-feature"><div className="why-feature-icon"><FiCheckCircle /></div><div><h4>{t('why_majlis')}</h4><p>{t('why_majlis_desc')}</p></div></div>
                                <div className="why-feature"><div className="why-feature-icon"><FiCheckCircle /></div><div><h4>{t('why_certificate')}</h4><p>{t('why_certificate_desc')}</p></div></div>
                                <div className="why-feature"><div className="why-feature-icon"><FiCheckCircle /></div><div><h4>{t('why_payment')}</h4><p>{t('why_payment_desc')}</p></div></div>
                                <div className="why-feature"><div className="why-feature-icon"><FiCheckCircle /></div><div><h4>{t('why_language')}</h4><p>{t('why_language_desc')}</p></div></div>
                            </div>
                        </div>
                        <div className="why-visual">
                            <div className="why-visual-card">
                                <div className="why-visual-pattern pattern-overlay" />
                                <div className="why-stats-grid">
                                    <div className="why-stat-card"><span className="why-stat-icon">🕌</span><span className="why-stat-value">100%</span><span className="why-stat-label">{t('why_halal_verified')}</span></div>
                                    <div className="why-stat-card"><span className="why-stat-icon">🇪🇹</span><span className="why-stat-value">13</span><span className="why-stat-label">{t('why_regions')}</span></div>
                                    <div className="why-stat-card"><span className="why-stat-icon">⭐</span><span className="why-stat-value">4.8</span><span className="why-stat-label">{t('why_avg_rating')}</span></div>
                                    <div className="why-stat-card"><span className="why-stat-icon">🛡️</span><span className="why-stat-value">24/7</span><span className="why-stat-label">{t('why_support')}</span></div>
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
                        <span className="section-subtitle">{t('testimonials_subtitle')}</span>
                        <h2 className="heading-section section-title">{t('testimonials_title')}</h2>
                    </div>
                    <div className="testimonials-slider">
                        {testimonials.map((tm, index) => (
                            <div key={index} className={`testimonial-card ${index === activeTestimonial ? 'testimonial-active' : ''}`}>
                                <div className="testimonial-rating">
                                    {[...Array(tm.rating)].map((_, i) => (<FiStar key={i} size={16} fill="var(--accent-500)" color="var(--accent-500)" />))}
                                </div>
                                <p className="testimonial-text">"{tm.text}"</p>
                                <div className="testimonial-author">
                                    <div className="testimonial-avatar">{tm.name[0]}</div>
                                    <div><p className="testimonial-name">{tm.name}</p><p className="testimonial-role">{tm.role}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="testimonial-dots">
                        {testimonials.map((_, i) => (
                            <button key={i} className={`testimonial-dot ${i === activeTestimonial ? 'dot-active' : ''}`} onClick={() => setActiveTestimonial(i)} aria-label={`Testimonial ${i + 1}`} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════ CTA SECTION ══════════════════ */}
            <section className="cta-section" id="cta-section">
                <div className="cta-bg"><div className="pattern-overlay" /></div>
                <div className="container cta-content">
                    <h2 className="heading-section" style={{ color: 'white' }}>{t('cta_title_1')}<br />{t('cta_title_2')}</h2>
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.0625rem', maxWidth: '500px', margin: '0 auto var(--space-8)' }}>{t('cta_description')}</p>
                    <div className="cta-actions">
                        <Link to="/shop" className="btn btn-accent btn-lg">{t('cta_shop')} <FiArrowRight /></Link>
                        <Link to="/register" className="btn btn-glass btn-lg" style={{ color: 'white' }}>{t('cta_register')}</Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
