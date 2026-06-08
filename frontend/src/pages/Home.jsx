import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiArrowRight, FiShield, FiTruck, FiCreditCard, FiHeadphones, FiStar, FiAward, FiGlobe } from 'react-icons/fi';
import { fetchFeaturedProducts } from '../redux/slices/productSlice';
import ProductCard from '../components/common/ProductCard';
import { useLanguage } from '../i18n/LanguageContext';
import './Home.css';

// Intersection Observer hook for scroll animations
const useIntersectionObserver = (options = {}) => {
    const [entries, setEntries] = useState([]);
    const [observers] = useState(new Map());

    const observe = useCallback((element) => {
        if (!element) return;
        const observer = new IntersectionObserver(
            (observerEntries) => {
                observerEntries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                        observer.unobserve(entry.target);
                    }
                });
                setEntries(observerEntries);
            },
            { threshold: 0.1, rootMargin: '0px 0px -60px 0px', ...options }
        );
        observer.observe(element);
        observers.set(element, observer);
    }, [observers, options]);

    return { observe, entries };
};

// Animated counter component
const AnimatedCounter = ({ end, duration = 2000, suffix = '' }) => {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const hasAnimated = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasAnimated.current) {
                    hasAnimated.current = true;
                    const numericEnd = parseInt(end.replace(/[^0-9]/g, ''));
                    const startTime = Date.now();
                    const animate = () => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.floor(eased * numericEnd));
                        if (progress < 1) requestAnimationFrame(animate);
                    };
                    requestAnimationFrame(animate);
                }
            },
            { threshold: 0.3 }
        );
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [end, duration]);

    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const Home = () => {
    const dispatch = useDispatch();
    const { featuredItems } = useSelector((state) => state.products);
    const [activeTestimonial, setActiveTestimonial] = useState(0);
    const { t } = useLanguage();
    const { observe } = useIntersectionObserver();

    // Refs for scroll-triggered animations
    const sectionRefs = useRef([]);
    const addRef = (el) => {
        if (el && !sectionRefs.current.includes(el)) {
            sectionRefs.current.push(el);
            observe(el);
        }
    };

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
        { value: '5000', suffix: '+', labelKey: 'hero_stat_products', icon: '📦' },
        { value: '500', suffix: '+', labelKey: 'hero_stat_merchants', icon: '🏪' },
        { value: '50000', suffix: '+', labelKey: 'hero_stat_customers', icon: '👥' },
        { value: '13', suffix: '', labelKey: 'hero_stat_regions', icon: '🇪🇹' },
    ];

    const testimonials = [
        { name: 'Amina Mohammed', role: 'Consumer, Addis Ababa', text: 'Finally a platform where I can trust every product is genuinely halal certified. The verification process gives me complete peace of mind.', rating: 5, initial: 'A' },
        { name: 'Hassan Ibrahim', role: 'Merchant, Dire Dawa', text: 'As a halal butcher, this platform helped me reach thousands of new customers. The Majlis verification badge builds instant trust.', rating: 5, initial: 'H' },
        { name: 'Fatima Ahmed', role: 'Consumer, Harar', text: 'I love the Ethiopian spice collection! Ordering online and getting halal-certified products delivered to my door is amazing.', rating: 5, initial: 'F' },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [testimonials.length]);

    const products = featuredItems; // always prefer server-provided featured items; empty => empty state
    const ethiopianEssentials = products.filter((p) => {
        const name = (p.name || '').toLowerCase();
        return ['berbere', 'mitmita', 'shiro', 'niter kibbeh', 'teff', 'buna', 'coffee'].some((k) => name.includes(k));
    }).slice(0, 6);

    const whyFeatures = [
        { icon: <FiShield />, titleKey: 'why_majlis', descKey: 'why_majlis_desc' },
        { icon: <FiAward />, titleKey: 'why_certificate', descKey: 'why_certificate_desc' },
        { icon: <FiCreditCard />, titleKey: 'why_payment', descKey: 'why_payment_desc' },
        { icon: <FiGlobe />, titleKey: 'why_language', descKey: 'why_language_desc' },
    ];

    return (
        <div className="home-page">
            {/* ══════════════════ HERO SECTION ══════════════════ */}
            <section className="hero" id="hero-section">
                <div className="hero-bg">
                    <div className="hero-gradient" />
                    <div className="hero-mesh" />
                    <div className="pattern-overlay" />
                    <div className="hero-orbs">
                        <div className="hero-orb hero-orb-1" />
                        <div className="hero-orb hero-orb-2" />
                        <div className="hero-orb hero-orb-3" />
                    </div>
                </div>
                <div className="container hero-content">
                    <div className="hero-text">
                        <div className="hero-badge animate-fade-in">
                            <span className="hero-badge-dot" />
                            <FiShield size={14} />
                            <span>{t('hero_badge')}</span>
                        </div>
                        <h1 className="heading-hero animate-fade-in-up">
                            {t('hero_title_1')}<br />
                            <span className="text-gradient">{t('hero_title_2')}</span>
                        </h1>
                        <p className="hero-description animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                            {t('hero_description')}
                        </p>
                        <div className="hero-actions animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                            <Link to="/shop" className="btn btn-primary btn-lg hero-cta" id="hero-shop-btn">
                                {t('hero_cta_shop')} <FiArrowRight />
                            </Link>
                            <Link to="/register" className="btn btn-glass btn-lg" id="hero-merchant-btn">
                                {t('hero_cta_merchant')}
                            </Link>
                        </div>
                        <div className="hero-stats animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                            {STATS.map((stat) => (
                                <div key={stat.labelKey} className="hero-stat">
                                    <span className="hero-stat-value">
                                        <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                                    </span>
                                    <span className="hero-stat-label">{t(stat.labelKey)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="hero-visual animate-fade-in" style={{ animationDelay: '400ms' }}>
                        <div className="hero-visual-glow" />
                        <div className="hero-card hero-card-1">
                            <div className="hero-card-emoji">🥩</div>
                            <div className="hero-card-info">
                                <p className="hero-card-title">{t('cat_meat')}</p>
                                <p className="hero-card-detail">From 650 ETB</p>
                            </div>
                            <span className="badge badge-halal">{t('product_halal')}</span>
                        </div>
                        <div className="hero-card hero-card-2">
                            <div className="hero-card-emoji">🌶️</div>
                            <div className="hero-card-info">
                                <p className="hero-card-title">{t('cat_spices')}</p>
                                <p className="hero-card-detail">Berbere, Mitmita & more</p>
                            </div>
                            <span className="badge badge-verified">✓ {t('verified')}</span>
                        </div>
                        <div className="hero-card hero-card-3">
                            <div className="hero-card-emoji">🍯</div>
                            <div className="hero-card-info">
                                <p className="hero-card-title">{t('cat_honey')}</p>
                                <p className="hero-card-detail">100% Natural</p>
                            </div>
                            <span className="badge badge-new">New</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ TRUST BAR ══════════════════ */}
            <section className="trust-bar" ref={addRef}>
                <div className="container">
                    <div className="trust-items reveal">
                        <div className="trust-item">
                            <div className="trust-icon"><FiShield /></div>
                            <div><h4>{t('trust_halal')}</h4><p>{t('trust_halal_desc')}</p></div>
                        </div>
                        <div className="trust-item">
                            <div className="trust-icon trust-icon-delivery"><FiTruck /></div>
                            <div><h4>{t('trust_delivery')}</h4><p>{t('trust_delivery_desc')}</p></div>
                        </div>
                        <div className="trust-item">
                            <div className="trust-icon trust-icon-payment"><FiCreditCard /></div>
                            <div><h4>{t('trust_payment')}</h4><p>{t('trust_payment_desc')}</p></div>
                        </div>
                        <div className="trust-item">
                            <div className="trust-icon trust-icon-support"><FiHeadphones /></div>
                            <div><h4>{t('trust_support')}</h4><p>{t('trust_support_desc')}</p></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════════════ CATEGORIES ══════════════════ */}
            <section className="section categories-section" id="categories-section">
                <div className="container">
                    <div className="section-header reveal" ref={addRef}>
                        <span className="section-subtitle">{t('cat_browse')}</span>
                        <h2 className="heading-section section-title">{t('cat_title')}</h2>
                        <p className="section-description">{t('cat_description')}</p>
                    </div>
                    <div className="categories-grid">
                        {CATEGORIES.map((cat, index) => (
                            <Link
                                key={cat.slug}
                                to={`/shop?category=${cat.slug}`}
                                className="category-card reveal"
                                id={`category-${cat.slug}`}
                                ref={addRef}
                                style={{ transitionDelay: `${index * 50}ms` }}
                            >
                                <div className="category-card-icon" style={{ background: `${cat.color}12`, color: cat.color }}>
                                    <span>{cat.emoji}</span>
                                </div>
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
                    <div className="section-header reveal" ref={addRef}>
                        <span className="section-subtitle">{t('featured_subtitle')}</span>
                        <h2 className="heading-section section-title">{t('featured_title')}</h2>
                        <p className="section-description">{t('featured_description')}</p>
                    </div>
                    <div className="grid grid-products">
                        {products.map((product, index) => (
                            <div key={product._id} className="reveal" ref={addRef} style={{ transitionDelay: `${index * 100}ms` }}>
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                    <div className="section-action reveal" ref={addRef}>
                        <Link to="/shop" className="btn btn-outline btn-lg" id="view-all-products">
                            {t('featured_view_all')} <FiArrowRight />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═════════════ Featured Ethiopian Essentials ═════════════ */}
            {ethiopianEssentials.length > 0 && (
                <section className="section ethiopian-section" id="ethiopian-essentials">
                    <div className="container">
                        <div className="section-header reveal" ref={addRef}>
                            <span className="section-subtitle">Ethiopian Essentials</span>
                            <h2 className="heading-section section-title">Traditional Favorites With Real Photos</h2>
                            <p className="section-description">
                                Berbere, Mitmita, Shiro, Niter Kibbeh, Teff, and Buna coffee picked from verified merchants.
                            </p>
                        </div>
                        <div className="grid grid-products">
                            {ethiopianEssentials.map((product, index) => (
                                <div key={product._id} className="reveal" ref={addRef} style={{ transitionDelay: `${index * 90}ms` }}>
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ══════════════════ WHY CHOOSE US ══════════════════ */}
            <section className="section why-section" id="why-section">
                <div className="container">
                    <div className="why-grid">
                        <div className="why-content reveal" ref={addRef}>
                            <span className="section-subtitle">{t('why_subtitle')}</span>
                            <h2 className="heading-section">
                                {t('why_title_1')}<br />
                                {t('why_title_2')} <span className="text-gradient">{t('why_title_3')}</span>
                            </h2>
                            <p className="text-body-lg" style={{ marginBottom: 'var(--space-8)' }}>
                                {t('why_description')}
                            </p>
                            <div className="why-features">
                                {whyFeatures.map((feature, i) => (
                                    <div className="why-feature" key={i}>
                                        <div className="why-feature-icon">{feature.icon}</div>
                                        <div>
                                            <h4>{t(feature.titleKey)}</h4>
                                            <p>{t(feature.descKey)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="why-visual reveal" ref={addRef} style={{ transitionDelay: '200ms' }}>
                            <div className="why-visual-card">
                                <div className="why-visual-pattern pattern-overlay" />
                                <div className="why-stats-grid">
                                    <div className="why-stat-card">
                                        <span className="why-stat-icon">🕌</span>
                                        <span className="why-stat-value">100%</span>
                                        <span className="why-stat-label">{t('why_halal_verified')}</span>
                                    </div>
                                    <div className="why-stat-card">
                                        <span className="why-stat-icon">🇪🇹</span>
                                        <span className="why-stat-value">13</span>
                                        <span className="why-stat-label">{t('why_regions')}</span>
                                    </div>
                                    <div className="why-stat-card">
                                        <span className="why-stat-icon">⭐</span>
                                        <span className="why-stat-value">4.8</span>
                                        <span className="why-stat-label">{t('why_avg_rating')}</span>
                                    </div>
                                    <div className="why-stat-card">
                                        <span className="why-stat-icon">🛡️</span>
                                        <span className="why-stat-value">24/7</span>
                                        <span className="why-stat-label">{t('why_support')}</span>
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
                    <div className="section-header reveal" ref={addRef}>
                        <span className="section-subtitle">{t('testimonials_subtitle')}</span>
                        <h2 className="heading-section section-title">{t('testimonials_title')}</h2>
                    </div>
                    <div className="testimonials-slider">
                        {testimonials.map((tm, index) => (
                            <div key={index} className={`testimonial-card ${index === activeTestimonial ? 'testimonial-active' : ''}`}>
                                <div className="testimonial-quote">"</div>
                                <div className="testimonial-rating">
                                    {[...Array(tm.rating)].map((_, i) => (
                                        <FiStar key={i} size={16} fill="var(--accent-500)" color="var(--accent-500)" />
                                    ))}
                                </div>
                                <p className="testimonial-text">"{tm.text}"</p>
                                <div className="testimonial-author">
                                    <div className="testimonial-avatar">{tm.initial}</div>
                                    <div>
                                        <p className="testimonial-name">{tm.name}</p>
                                        <p className="testimonial-role">{tm.role}</p>
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
                    <div className="cta-gradient" />
                    <div className="pattern-overlay" />
                </div>
                <div className="container cta-content reveal" ref={addRef}>
                    <h2 className="heading-section" style={{ color: 'white' }}>
                        {t('cta_title_1')}<br />{t('cta_title_2')}
                    </h2>
                    <p className="cta-description">{t('cta_description')}</p>
                    <div className="cta-actions">
                        <Link to="/shop" className="btn btn-accent btn-lg">{t('cta_shop')} <FiArrowRight /></Link>
                        <Link to="/register" className="btn btn-glass btn-lg" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}>
                            {t('cta_register')}
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
