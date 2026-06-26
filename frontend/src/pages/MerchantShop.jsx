import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiMapPin, FiPhone, FiStar, FiShoppingBag, FiPackage, FiCheckCircle, FiClock, FiArrowLeft, FiMail, FiShield } from 'react-icons/fi';
import { Utensils, ShoppingBag, Drumstick, Croissant, Package, Sparkle, Shirt, Flame, Store, Tag } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import merchantService from '../services/merchantService';
import ProductCard from '../components/common/ProductCard';
import Loader from '../components/common/Loader';
import './MerchantShop.css';

// Demo merchants used as fallback
const DEMO_MERCHANTS = {
    dm1: {
        _id: 'dm1',
        businessName: 'Addis Halal Meats',
        businessNameAmharic: 'አዲስ ሐላል ስጋ',
        description: 'Premium halal-certified meat & poultry sourced from trusted Ethiopian farms. Fresh, hand-slaughtered, Majlis-verified cuts delivered daily throughout Addis Ababa.',
        businessType: 'butcher',
        businessPhone: '+251911223344',
        businessEmail: 'info@addishalalmeats.et',
        businessAddress: { city: 'Addis Ababa', region: 'Addis Ababa', subcity: 'Addis Ketema', street: 'Meskel Square Area, Building 42' },
        verificationStatus: 'approved',
        ratingsAverage: 4.8,
        ratingsCount: 245,
        totalProducts: 12,
        totalOrders: 1580,
        isFeatured: true,
        operatingHours: { weekdays: '8:00 AM - 8:00 PM', saturday: '8:00 AM - 6:00 PM', sunday: 'Closed' },
    },
    dm2: {
        _id: 'dm2',
        businessName: 'Harar Spice Market',
        businessNameAmharic: 'ሐረር ቅመም ገበያ',
        description: 'Authentic Ethiopian spice blends passed down through generations. Berbere, Mitmita, Shiro, and specialty blends crafted in the ancient city of Harar.',
        businessType: 'spice_shop',
        businessPhone: '+251922334455',
        businessEmail: 'orders@hararspices.et',
        businessAddress: { city: 'Harar', region: 'Harari', street: 'Old Town Spice Bazaar' },
        verificationStatus: 'approved',
        ratingsAverage: 4.9,
        ratingsCount: 512,
        totalProducts: 28,
        totalOrders: 3200,
        isFeatured: true,
        operatingHours: { weekdays: '7:00 AM - 7:00 PM', saturday: '7:00 AM - 5:00 PM', sunday: '9:00 AM - 2:00 PM' },
    },
    dm3: {
        _id: 'dm3',
        businessName: 'Oromia Grains & Teff',
        businessNameAmharic: 'ኦሮሚያ ጤፍና ሰብል',
        description: "Direct from Oromia's fertile highlands — premium organic teff, wheat, barley, and grain products. Farm-to-table philosophy with sustainable practices.",
        businessType: 'grocery',
        businessPhone: '+251933445566',
        businessEmail: 'hello@oromiagrains.et',
        businessAddress: { city: 'Addis Ababa', region: 'Addis Ababa', subcity: 'Bole', street: 'Bole Road, Friendship Mall Area' },
        verificationStatus: 'approved',
        ratingsAverage: 4.7,
        ratingsCount: 189,
        totalProducts: 15,
        totalOrders: 2100,
        isFeatured: true,
        operatingHours: { weekdays: '8:00 AM - 9:00 PM', saturday: '8:00 AM - 7:00 PM', sunday: '10:00 AM - 4:00 PM' },
    },
    dm4: {
        _id: 'dm4',
        businessName: 'Tigray Honey Farm',
        businessNameAmharic: 'ትግራይ ማር ፋርም',
        description: 'Pure, raw wildflower honey and beeswax products from the highlands of Tigray. Unprocessed, sustainably harvested, and delivered with care.',
        businessType: 'grocery',
        businessPhone: '+251944556677',
        businessEmail: 'info@tigrayhoney.et',
        businessAddress: { city: 'Mekelle', region: 'Tigray', street: 'Main Street, Near Central Market' },
        verificationStatus: 'approved',
        ratingsAverage: 4.9,
        ratingsCount: 378,
        totalProducts: 8,
        totalOrders: 1850,
        isFeatured: true,
        operatingHours: { weekdays: '9:00 AM - 6:00 PM', saturday: '9:00 AM - 4:00 PM', sunday: 'Closed' },
    },
    dm5: {
        _id: 'dm5',
        businessName: 'Halal Fashion House',
        businessNameAmharic: 'ሐላል ፋሽን ሃውስ',
        description: 'Modest, elegant fashion for Muslim men and women. Traditional Ethiopian clothing, hijabs, thobes, and modern Islamic fashion for every occasion.',
        businessType: 'clothing',
        businessPhone: '+251955667788',
        businessEmail: 'shop@halalfashion.et',
        businessAddress: { city: 'Addis Ababa', region: 'Addis Ababa', subcity: 'Arada', street: 'Piazza Area, Near Anwar Mosque' },
        verificationStatus: 'approved',
        ratingsAverage: 4.6,
        ratingsCount: 98,
        totalProducts: 45,
        totalOrders: 920,
        isFeatured: true,
        operatingHours: { weekdays: '9:00 AM - 8:00 PM', saturday: '9:00 AM - 9:00 PM', sunday: '2:00 PM - 7:00 PM' },
    },
    dm6: {
        _id: 'dm6',
        businessName: 'Dire Dawa Bakery',
        businessNameAmharic: 'ድሬ ዳዋ ዳቦ',
        description: 'Artisanal halal bakery specializing in Ethiopian breads, pastries, and confections. Everything baked fresh daily with the finest ingredients.',
        businessType: 'bakery',
        businessPhone: '+251966778899',
        businessEmail: 'order@diredawabakery.et',
        businessAddress: { city: 'Dire Dawa', region: 'Dire Dawa', street: 'Kezira Market Area' },
        verificationStatus: 'approved',
        ratingsAverage: 4.5,
        ratingsCount: 156,
        totalProducts: 20,
        totalOrders: 1100,
        isFeatured: true,
        operatingHours: { weekdays: '6:00 AM - 8:00 PM', saturday: '6:00 AM - 6:00 PM', sunday: '7:00 AM - 12:00 PM' },
    },
};

// Demo products mapped per merchant
const DEMO_PRODUCTS = {
    dm1: [
        { _id: 'mp1', name: 'Premium Halal Beef', nameAmharic: 'ፕሪሚየም ሐላል ስጋ', price: 850, discountPrice: 720, category: 'meat', ratingsAverage: 4.8, ratingsCount: 124, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/0D7C3D/ffffff?text=Halal+Beef' }], merchant: { _id: 'dm1', businessName: 'Addis Halal Meats', verificationStatus: 'approved' } },
        { _id: 'mp2', name: 'Halal Lamb Cuts', nameAmharic: 'ሐላል ስጋ በግ', price: 950, category: 'meat', ratingsAverage: 4.7, ratingsCount: 89, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/dc2626/ffffff?text=Lamb+Cuts' }], merchant: { _id: 'dm1', businessName: 'Addis Halal Meats', verificationStatus: 'approved' } },
        { _id: 'mp3', name: 'Halal Chicken Breast', nameAmharic: 'ሐላል ዶሮ', price: 320, category: 'meat', ratingsAverage: 4.6, ratingsCount: 67, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/065f2d/ffffff?text=Chicken' }], merchant: { _id: 'dm1', businessName: 'Addis Halal Meats', verificationStatus: 'approved' } },
        { _id: 'mp4', name: 'Ground Beef Mince', nameAmharic: 'የተፈጨ ስጋ', price: 650, category: 'meat', ratingsAverage: 4.5, ratingsCount: 45, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/054b23/ffffff?text=Ground+Beef' }], merchant: { _id: 'dm1', businessName: 'Addis Halal Meats', verificationStatus: 'approved' } },
    ],
    dm2: [
        { _id: 'mp5', name: 'Ethiopian Berbere Spice', nameAmharic: 'በርበሬ ቅመም', price: 180, category: 'spices', ratingsAverage: 4.9, ratingsCount: 256, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/D4A017/ffffff?text=Berbere' }], merchant: { _id: 'dm2', businessName: 'Harar Spice Market', verificationStatus: 'approved' } },
        { _id: 'mp6', name: 'Mitmita Hot Spice', nameAmharic: 'ሚጥሚጣ', price: 150, category: 'spices', ratingsAverage: 4.8, ratingsCount: 189, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/d97706/ffffff?text=Mitmita' }], merchant: { _id: 'dm2', businessName: 'Harar Spice Market', verificationStatus: 'approved' } },
        { _id: 'mp7', name: 'Shiro Powder', nameAmharic: 'ሽሮ', price: 95, category: 'spices', ratingsAverage: 4.7, ratingsCount: 203, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/c2410c/ffffff?text=Shiro' }], merchant: { _id: 'dm2', businessName: 'Harar Spice Market', verificationStatus: 'approved' } },
        { _id: 'mp8', name: 'Turmeric Powder', nameAmharic: 'እርድ', price: 120, category: 'spices', ratingsAverage: 4.6, ratingsCount: 78, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/ca8a04/ffffff?text=Turmeric' }], merchant: { _id: 'dm2', businessName: 'Harar Spice Market', verificationStatus: 'approved' } },
    ],
    dm3: [
        { _id: 'mp9', name: 'Natural Teff Flour', nameAmharic: 'ተፈጥሮአዊ ጤፍ ዱቄት', price: 320, category: 'grains', ratingsAverage: 4.7, ratingsCount: 89, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/065f2d/ffffff?text=Teff+Flour' }], merchant: { _id: 'dm3', businessName: 'Oromia Grains & Teff', verificationStatus: 'approved' } },
        { _id: 'mp10', name: 'Organic Barley', nameAmharic: 'ገብስ', price: 200, category: 'grains', ratingsAverage: 4.5, ratingsCount: 56, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/65a30d/ffffff?text=Barley' }], merchant: { _id: 'dm3', businessName: 'Oromia Grains & Teff', verificationStatus: 'approved' } },
        { _id: 'mp11', name: 'Wheat Flour', nameAmharic: 'ዱቄት', price: 180, category: 'grains', ratingsAverage: 4.4, ratingsCount: 42, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/0d9488/ffffff?text=Wheat' }], merchant: { _id: 'dm3', businessName: 'Oromia Grains & Teff', verificationStatus: 'approved' } },
    ],
    dm4: [
        { _id: 'mp12', name: 'Pure Raw Honey', nameAmharic: 'ንጹህ ማር', price: 450, discountPrice: 380, category: 'honey', ratingsAverage: 4.9, ratingsCount: 312, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/ca8a04/ffffff?text=Raw+Honey' }], merchant: { _id: 'dm4', businessName: 'Tigray Honey Farm', verificationStatus: 'approved' } },
        { _id: 'mp13', name: 'Beeswax Candles', nameAmharic: 'የሰም ሻማ', price: 250, category: 'home_decor', ratingsAverage: 4.6, ratingsCount: 45, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/a67c00/ffffff?text=Beeswax' }], merchant: { _id: 'dm4', businessName: 'Tigray Honey Farm', verificationStatus: 'approved' } },
    ],
    dm5: [
        { _id: 'mp14', name: 'Premium Hijab Collection', nameAmharic: 'ፕሪሚየም ሂጃብ', price: 650, category: 'clothing', ratingsAverage: 4.7, ratingsCount: 67, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/7c3aed/ffffff?text=Hijab' }], merchant: { _id: 'dm5', businessName: 'Halal Fashion House', verificationStatus: 'approved' } },
        { _id: 'mp15', name: 'Ethiopian Thobe', nameAmharic: 'አባይ ልብስ', price: 1200, category: 'clothing', ratingsAverage: 4.5, ratingsCount: 34, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/4f46e5/ffffff?text=Thobe' }], merchant: { _id: 'dm5', businessName: 'Halal Fashion House', verificationStatus: 'approved' } },
        { _id: 'mp16', name: 'Modest Abaya', nameAmharic: 'ዐባያ', price: 950, discountPrice: 800, category: 'clothing', ratingsAverage: 4.8, ratingsCount: 56, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/db2777/ffffff?text=Abaya' }], merchant: { _id: 'dm5', businessName: 'Halal Fashion House', verificationStatus: 'approved' } },
    ],
    dm6: [
        { _id: 'mp17', name: 'Himbasha Bread', nameAmharic: 'ሂምባሻ', price: 80, category: 'bakery', ratingsAverage: 4.5, ratingsCount: 156, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/c2410c/ffffff?text=Himbasha' }], merchant: { _id: 'dm6', businessName: 'Dire Dawa Bakery', verificationStatus: 'approved' } },
        { _id: 'mp18', name: 'Injera Pack (5)', nameAmharic: 'እንጀራ', price: 120, category: 'bakery', ratingsAverage: 4.6, ratingsCount: 89, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/78350f/ffffff?text=Injera' }], merchant: { _id: 'dm6', businessName: 'Dire Dawa Bakery', verificationStatus: 'approved' } },
        { _id: 'mp19', name: 'Date Pastries', nameAmharic: 'የተምር ኬክ', price: 200, category: 'bakery', ratingsAverage: 4.8, ratingsCount: 67, halalCertified: true, isFeatured: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/d97706/ffffff?text=Date+Pastry' }], merchant: { _id: 'dm6', businessName: 'Dire Dawa Bakery', verificationStatus: 'approved' } },
    ],
};

const TYPE_EMOJIS = {
    restaurant: <Utensils size={14} />, grocery: <ShoppingBag size={14} />, butcher: <Drumstick size={14} />, bakery: <Croissant size={14} />,
    wholesale: <Package size={14} />, cosmetics: <Sparkle size={14} />, clothing: <Shirt size={14} />, spice_shop: <Flame size={14} />,
    supermarket: <Store size={14} />, other: <Tag size={14} />,
};

const MerchantShop = () => {
    const { id } = useParams();
    const { t } = useLanguage();
    const [merchant, setMerchant] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeCategory, setActiveCategory] = useState('');

    useEffect(() => {
        const loadMerchant = async () => {
            setLoading(true);
            setError(null);
            try {
                // Try to load from backend
                const merchantData = await merchantService.getById(id);
                const m = merchantData.merchant || merchantData.data || merchantData;
                setMerchant(m);

                // Load merchant products
                try {
                    const productsData = await merchantService.getMerchantProducts(id, { limit: 50 });
                    const prods = productsData.products || productsData.data || [];
                    setProducts(prods.length > 0 ? prods : (DEMO_PRODUCTS[id] || []));
                } catch {
                    setProducts(DEMO_PRODUCTS[id] || []);
                }
            } catch {
                // Fallback to demo data
                if (DEMO_MERCHANTS[id]) {
                    setMerchant(DEMO_MERCHANTS[id]);
                    setProducts(DEMO_PRODUCTS[id] || []);
                } else {
                    setError('Merchant not found');
                }
            } finally {
                setLoading(false);
            }
        };
        loadMerchant();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [id]);

    // Get unique categories from products
    const productCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

    // Filter products by category
    const filteredProducts = activeCategory
        ? products.filter(p => p.category === activeCategory)
        : products;

    if (loading) {
        return (
            <div className="merchant-shop-page">
                <div className="merchant-shop-loading">
                    <Loader />
                    <p>{t('loading')}</p>
                </div>
            </div>
        );
    }

    if (error || !merchant) {
        return (
            <div className="merchant-shop-page">
                <div className="merchant-shop-error">
                    <div className="merchant-shop-error-icon"><FiShoppingBag size={48} /></div>
                    <h2>{t('error')}</h2>
                    <p>{error || 'This merchant could not be found.'}</p>
                    <Link to="/merchants" className="btn btn-primary btn-lg">
                        <FiArrowLeft /> {t('merchants_title')}
                    </Link>
                </div>
            </div>
        );
    }

    const address = merchant.businessAddress || {};
    const fullAddress = [address.street, address.subcity, address.city, address.region].filter(Boolean).join(', ');

    return (
        <div className="merchant-shop-page">
            {/* ══════════ HERO ══════════ */}
            <section className="merchant-shop-hero">
                <div className="merchant-shop-hero-bg">
                    <div className="pattern-overlay" />
                    <div className="hero-orbs">
                        <div className="hero-orb hero-orb-1" />
                        <div className="hero-orb hero-orb-2" />
                    </div>
                </div>
                <div className="container merchant-shop-hero-content animate-fade-in-up">
                    <div className="merchant-shop-avatar">
                        {merchant.logo?.url ? (
                            <img src={merchant.logo.url} alt={merchant.businessName} />
                        ) : (
                            <span className="merchant-shop-initial">{merchant.businessName[0]}</span>
                        )}
                    </div>
                    <div className="merchant-shop-info">
                        <div className="merchant-shop-badges">
                            {merchant.verificationStatus === 'approved' && (
                                <span className="merchant-shop-verified">
                                    <FiCheckCircle size={14} /> {t('merchants_verified')}
                                </span>
                            )}
                            <span className="merchant-shop-type-badge">
                                {TYPE_EMOJIS[merchant.businessType] || 'Other'} {merchant.businessType?.replace('_', ' ')}
                            </span>
                        </div>
                        <h1 className="merchant-shop-name">{merchant.businessName}</h1>
                        {merchant.businessNameAmharic && (
                            <p className="merchant-shop-name-am">{merchant.businessNameAmharic}</p>
                        )}
                        <p className="merchant-shop-desc">{merchant.description}</p>
                        <div className="merchant-shop-meta">
                            {address.city && (
                                <div className="merchant-shop-meta-item">
                                    <FiMapPin size={16} /> {address.city}{address.region && address.region !== address.city ? `, ${address.region}` : ''}
                                </div>
                            )}
                            {merchant.businessPhone && (
                                <div className="merchant-shop-meta-item">
                                    <FiPhone size={16} /> {merchant.businessPhone}
                                </div>
                            )}
                            <div className="merchant-shop-meta-item">
                                <FiStar size={16} fill="var(--accent-400)" color="var(--accent-400)" /> {merchant.ratingsAverage} ({merchant.ratingsCount} reviews)
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══════════ STATS BAR ══════════ */}
            <div className="container merchant-shop-stats">
                <div className="merchant-shop-stats-grid stagger-children">
                    <div className="merchant-stat-card animate-fade-in-up">
                        <span className="merchant-stat-card-icon"><FiStar /></span>
                        <span className="merchant-stat-card-value">{merchant.ratingsAverage || '0.0'}</span>
                        <span className="merchant-stat-card-label">{t('merchants_rating', { rating: '' }).trim() || 'Rating'}</span>
                    </div>
                    <div className="merchant-stat-card animate-fade-in-up">
                        <span className="merchant-stat-card-icon"><FiPackage /></span>
                        <span className="merchant-stat-card-value">{merchant.totalProducts || products.length}</span>
                        <span className="merchant-stat-card-label">{t('merchant_shop_products') || 'Products'}</span>
                    </div>
                    <div className="merchant-stat-card animate-fade-in-up">
                        <span className="merchant-stat-card-icon"><FiShoppingBag /></span>
                        <span className="merchant-stat-card-value">{(merchant.totalOrders || 0).toLocaleString()}</span>
                        <span className="merchant-stat-card-label">{t('merchant_shop_orders') || 'Orders'}</span>
                    </div>
                    <div className="merchant-stat-card animate-fade-in-up">
                        <span className="merchant-stat-card-icon"><FiShield /></span>
                        <span className="merchant-stat-card-value">{merchant.verificationStatus === 'approved' ? '✓' : '—'}</span>
                        <span className="merchant-stat-card-label">{t('merchant_shop_halal_status') || 'Halal Verified'}</span>
                    </div>
                </div>
            </div>

            {/* ══════════ BODY ══════════ */}
            <div className="container merchant-shop-products">
                <div className="merchant-shop-body">
                    {/* Main Content — Products */}
                    <div className="merchant-shop-main">
                        <div className="merchant-shop-products-header">
                            <div className="merchant-shop-products-title">
                                <h2>{t('merchant_shop_all_products') || 'All Products'}</h2>
                                <span className="merchant-shop-products-count">{filteredProducts.length}</span>
                            </div>
                            {productCategories.length > 1 && (
                                <div className="merchant-shop-filter-bar">
                                    <button
                                        className={`merchant-shop-filter-btn ${!activeCategory ? 'filter-active' : ''}`}
                                        onClick={() => setActiveCategory('')}
                                    >
                                        {t('merchants_filter_all')}
                                    </button>
                                    {productCategories.map(cat => (
                                        <button
                                            key={cat}
                                            className={`merchant-shop-filter-btn ${activeCategory === cat ? 'filter-active' : ''}`}
                                            onClick={() => setActiveCategory(cat)}
                                        >
                                            {cat?.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {filteredProducts.length > 0 ? (
                            <div className="grid grid-products stagger-children">
                                {filteredProducts.map(product => (
                                    <ProductCard key={product._id} product={product} />
                                ))}
                            </div>
                        ) : (
                            <div className="merchant-no-products">
                                <div className="merchant-no-products-icon"><FiMail size={48} /></div>
                                <h3>{t('shop_no_products') || 'No products found'}</h3>
                                <p>{t('shop_no_products_desc') || 'Try adjusting your filters'}</p>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <aside className="merchant-shop-sidebar">
                        {/* Contact Card */}
                        <div className="merchant-sidebar-card">
                            <h3>{t('merchant_shop_contact') || 'Contact Information'}</h3>
                            {fullAddress && (
                                <div className="merchant-sidebar-info-row">
                                    <FiMapPin size={16} />
                                    <span>{fullAddress}</span>
                                </div>
                            )}
                            {merchant.businessPhone && (
                                <div className="merchant-sidebar-info-row">
                                    <FiPhone size={16} />
                                    <span>{merchant.businessPhone}</span>
                                </div>
                            )}
                            {merchant.businessEmail && (
                                <div className="merchant-sidebar-info-row">
                                    <FiMail size={16} />
                                    <span>{merchant.businessEmail}</span>
                                </div>
                            )}
                            <a href={`tel:${merchant.businessPhone}`} className="btn btn-primary merchant-sidebar-contact-btn">
                                <FiPhone size={16} /> {t('merchant_shop_call') || 'Call Now'}
                            </a>
                        </div>

                        {/* Operating Hours */}
                        {merchant.operatingHours && (
                            <div className="merchant-sidebar-card">
                                <h3><FiClock size={16} /> {t('merchant_shop_hours') || 'Operating Hours'}</h3>
                                <div className="merchant-sidebar-hours">
                                    <div className="merchant-sidebar-hours-row">
                                        <span className="merchant-sidebar-hours-day">{t('merchant_shop_weekdays') || 'Mon - Fri'}</span>
                                        <span className="merchant-sidebar-hours-time">{merchant.operatingHours.weekdays}</span>
                                    </div>
                                    <div className="merchant-sidebar-hours-row">
                                        <span className="merchant-sidebar-hours-day">{t('merchant_shop_saturday') || 'Saturday'}</span>
                                        <span className="merchant-sidebar-hours-time">{merchant.operatingHours.saturday}</span>
                                    </div>
                                    <div className="merchant-sidebar-hours-row">
                                        <span className="merchant-sidebar-hours-day">{t('merchant_shop_sunday') || 'Sunday'}</span>
                                        <span className="merchant-sidebar-hours-time">{merchant.operatingHours.sunday}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Halal Certificate */}
                        {merchant.verificationStatus === 'approved' && (
                            <div className="merchant-sidebar-card" style={{ background: 'linear-gradient(135deg, var(--primary-50), var(--accent-50))', border: '1px solid var(--primary-100)' }}>
                                <h3 style={{ color: 'var(--primary-700)' }}><FiShield size={16} /> {t('merchant_shop_halal_cert') || 'Halal Certification'}</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--primary-600)', lineHeight: 1.6 }}>
                                    {t('merchant_shop_halal_cert_desc') || 'This merchant has been verified by the Ethiopian Islamic Affairs Supreme Council (Majlis). All products meet strict halal compliance standards.'}
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default MerchantShop;
