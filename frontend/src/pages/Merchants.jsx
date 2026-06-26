import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiMapPin, FiPhone, FiStar, FiShoppingBag, FiPackage, FiArrowRight, FiCheckCircle } from 'react-icons/fi';
import { Utensils, ShoppingBag, Drumstick, Croissant, Package, Sparkle, Shirt, Flame, Store, Tag } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import merchantService from '../services/merchantService';
import './Merchants.css';

const BUSINESS_TYPES = [
    { value: '', key: 'merchants_filter_all' },
    { value: 'restaurant', key: 'merchants_filter_restaurant' },
    { value: 'grocery', key: 'merchants_filter_grocery' },
    { value: 'butcher', key: 'merchants_filter_butcher' },
    { value: 'bakery', key: 'merchants_filter_bakery' },
    { value: 'spice_shop', key: 'merchants_filter_spice_shop' },
    { value: 'clothing', key: 'merchants_filter_clothing' },
    { value: 'cosmetics', key: 'merchants_filter_cosmetics' },
];

const TYPE_EMOJIS = {
    restaurant: <Utensils size={14} />,
    grocery: <ShoppingBag size={14} />,
    butcher: <Drumstick size={14} />,
    bakery: <Croissant size={14} />,
    wholesale: <Package size={14} />,
    cosmetics: <Sparkle size={14} />,
    clothing: <Shirt size={14} />,
    spice_shop: <Flame size={14} />,
    supermarket: <Store size={14} />,
    other: <Tag size={14} />,
};

// Demo merchants for display when backend is not connected
const DEMO_MERCHANTS = [
    {
        _id: 'dm1',
        businessName: 'Addis Halal Meats',
        businessNameAmharic: 'አዲስ ሐላል ስጋ',
        description: 'Premium halal-certified meat & poultry sourced from trusted Ethiopian farms. Fresh, hand-slaughtered, Majlis-verified cuts.',
        businessType: 'butcher',
        businessPhone: '+251911223344',
        businessAddress: { city: 'Addis Ababa', region: 'Addis Ababa', subcity: 'Addis Ketema' },
        verificationStatus: 'approved',
        ratingsAverage: 4.8,
        ratingsCount: 245,
        totalProducts: 12,
        totalOrders: 1580,
        isFeatured: true,
    },
    {
        _id: 'dm2',
        businessName: 'Harar Spice Market',
        businessNameAmharic: 'ሐረር ቅመም ገበያ',
        description: 'Authentic Ethiopian spice blends passed down through generations. Berbere, Mitmita, Shiro, and specialty blends.',
        businessType: 'spice_shop',
        businessPhone: '+251922334455',
        businessAddress: { city: 'Harar', region: 'Harari' },
        verificationStatus: 'approved',
        ratingsAverage: 4.9,
        ratingsCount: 512,
        totalProducts: 28,
        totalOrders: 3200,
        isFeatured: true,
    },
    {
        _id: 'dm3',
        businessName: 'Oromia Grains & Teff',
        businessNameAmharic: 'ኦሮሚያ ጤፍና ሰብል',
        description: 'Direct from Oromia\'s fertile highlands — premium organic teff, wheat, barley, and grain products.',
        businessType: 'grocery',
        businessPhone: '+251933445566',
        businessAddress: { city: 'Addis Ababa', region: 'Addis Ababa', subcity: 'Bole' },
        verificationStatus: 'approved',
        ratingsAverage: 4.7,
        ratingsCount: 189,
        totalProducts: 15,
        totalOrders: 2100,
        isFeatured: true,
    },
    {
        _id: 'dm4',
        businessName: 'Tigray Honey Farm',
        businessNameAmharic: 'ትግራይ ማር ፋርም',
        description: 'Pure, raw wildflower honey and beeswax products from the highlands of Tigray. Unprocessed and sustainably harvested.',
        businessType: 'grocery',
        businessPhone: '+251944556677',
        businessAddress: { city: 'Mekelle', region: 'Tigray' },
        verificationStatus: 'approved',
        ratingsAverage: 4.9,
        ratingsCount: 378,
        totalProducts: 8,
        totalOrders: 1850,
        isFeatured: true,
    },
    {
        _id: 'dm5',
        businessName: 'Halal Fashion House',
        businessNameAmharic: 'ሐላል ፋሽን ሃውስ',
        description: 'Modest, elegant fashion for Muslim men and women. Traditional Ethiopian clothing, hijabs, thobes, and modern Islamic fashion.',
        businessType: 'clothing',
        businessPhone: '+251955667788',
        businessAddress: { city: 'Addis Ababa', region: 'Addis Ababa', subcity: 'Arada' },
        verificationStatus: 'approved',
        ratingsAverage: 4.6,
        ratingsCount: 98,
        totalProducts: 45,
        totalOrders: 920,
        isFeatured: true,
    },
    {
        _id: 'dm6',
        businessName: 'Dire Dawa Bakery',
        businessNameAmharic: 'ድሬ ዳዋ ዳቦ',
        description: 'Artisanal halal bakery specializing in Ethiopian breads, pastries, and confections. Fresh-baked daily.',
        businessType: 'bakery',
        businessPhone: '+251966778899',
        businessAddress: { city: 'Dire Dawa', region: 'Dire Dawa' },
        verificationStatus: 'approved',
        ratingsAverage: 4.5,
        ratingsCount: 156,
        totalProducts: 20,
        totalOrders: 1100,
        isFeatured: true,
    },
];

const Merchants = () => {
    const { t } = useLanguage();
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeType, setActiveType] = useState('');

    useEffect(() => {
        const loadMerchants = async () => {
            try {
                const data = await merchantService.getAll({ verified: 'true', limit: 50 });
                if (data.merchants && data.merchants.length > 0) {
                    setMerchants(data.merchants);
                } else {
                    setMerchants(DEMO_MERCHANTS);
                }
            } catch (error) {
                // Fallback to demo data if backend is not available
                setMerchants(DEMO_MERCHANTS);
            } finally {
                setLoading(false);
            }
        };
        loadMerchants();
    }, []);

    const filteredMerchants = merchants.filter((m) => {
        const matchesSearch = m.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.businessNameAmharic && m.businessNameAmharic.includes(searchTerm)) ||
            (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesType = !activeType || m.businessType === activeType;
        return matchesSearch && matchesType;
    });

    return (
        <div className="merchants-page">
            {/* Hero Header */}
            <section className="merchants-hero">
                <div className="merchants-hero-bg">
                    <div className="merchants-hero-gradient" />
                    <div className="pattern-overlay" />
                </div>
                <div className="container merchants-hero-content">
                    <span className="section-subtitle">{t('merchants_featured')}</span>
                    <h1 className="heading-hero">{t('merchants_title')}</h1>
                    <p className="merchants-hero-desc">{t('merchants_description')}</p>

                    {/* Search Bar */}
                    <div className="merchants-search-wrapper">
                        <FiSearch size={20} />
                        <input
                            type="text"
                            className="merchants-search-input"
                            placeholder={t('merchants_search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            id="merchants-search"
                        />
                    </div>
                </div>
            </section>

            {/* Filters */}
            <div className="container">
                <div className="merchants-type-filters" id="merchant-type-filters">
                    {BUSINESS_TYPES.map((type) => (
                        <button
                            key={type.value}
                            className={`merchants-type-btn ${activeType === type.value ? 'type-active' : ''}`}
                            onClick={() => setActiveType(type.value)}
                            id={`filter-${type.value || 'all'}`}
                        >
                            {type.value && <span className="type-emoji">{TYPE_EMOJIS[type.value]}</span>}
                            {t(type.key)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Merchants Grid */}
            <section className="container merchants-grid-section">
                {loading ? (
                    <div className="merchants-loading">
                        <div className="loader" />
                        <p>{t('loading')}</p>
                    </div>
                ) : filteredMerchants.length === 0 ? (
                    <div className="merchants-empty">
                        <div className="merchants-empty-icon"><FiSearch size={48} /></div>
                        <h3>{t('merchants_no_results')}</h3>
                    </div>
                ) : (
                    <div className="merchants-grid stagger-children">
                        {filteredMerchants.map((merchant) => (
                            <div key={merchant._id} className="merchant-card animate-fade-in-up" id={`merchant-${merchant._id}`}>
                                {/* Card Header */}
                                <div className="merchant-card-header" style={{ background: `linear-gradient(135deg, var(--primary-600), var(--primary-800))` }}>
                                    <div className="merchant-card-avatar">
                                        {merchant.logo?.url ? (
                                            <img src={merchant.logo.url} alt={merchant.businessName} />
                                        ) : (
                                            <span className="merchant-card-initial">{merchant.businessName[0]}</span>
                                        )}
                                    </div>
                                    {merchant.verificationStatus === 'approved' && (
                                        <span className="merchant-verified-badge">
                                            <FiCheckCircle size={12} /> {t('merchants_verified')}
                                        </span>
                                    )}
                                    <span className="merchant-type-badge">
                                        {TYPE_EMOJIS[merchant.businessType] || 'Other'} {merchant.businessType?.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Card Body */}
                                <div className="merchant-card-body">
                                    <h3 className="merchant-card-name">{merchant.businessName}</h3>
                                    {merchant.businessNameAmharic && (
                                        <p className="merchant-card-name-am text-ethiopic">{merchant.businessNameAmharic}</p>
                                    )}
                                    <p className="merchant-card-desc">{merchant.description}</p>

                                    {/* Stats */}
                                    <div className="merchant-card-stats">
                                        <div className="merchant-stat">
                                            <FiStar size={14} color="var(--accent-500)" />
                                            <span>{merchant.ratingsAverage}</span>
                                            <small>({merchant.ratingsCount})</small>
                                        </div>
                                        <div className="merchant-stat">
                                            <FiShoppingBag size={14} />
                                            <span>{merchant.totalProducts}</span>
                                            <small>{t('merchants_products', { count: '' }).trim()}</small>
                                        </div>
                                        <div className="merchant-stat">
                                            <FiPackage size={14} />
                                            <span>{merchant.totalOrders?.toLocaleString()}</span>
                                            <small>{t('merchants_orders', { count: '' }).trim()}</small>
                                        </div>
                                    </div>

                                    {/* Location */}
                                    <div className="merchant-card-info">
                                        <FiMapPin size={14} />
                                        <span>{merchant.businessAddress?.city}{merchant.businessAddress?.region && merchant.businessAddress.region !== merchant.businessAddress?.city ? `, ${merchant.businessAddress.region}` : ''}</span>
                                    </div>
                                    {merchant.businessPhone && (
                                        <div className="merchant-card-info">
                                            <FiPhone size={14} />
                                            <span>{merchant.businessPhone}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Card Footer */}
                                <div className="merchant-card-footer">
                                    <Link to={`/merchant/${merchant._id}`} className="btn btn-primary btn-sm merchant-view-btn" id={`view-shop-${merchant._id}`}>
                                        {t('merchants_view_shop')} <FiArrowRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* CTA Section */}
            <section className="merchants-cta">
                <div className="container merchants-cta-content">
                    <h2 className="heading-section">{t('merchants_become')}</h2>
                    <p>{t('merchants_become_desc')}</p>
                    <Link to="/register" className="btn btn-primary btn-lg" id="become-merchant-btn">
                        {t('hero_cta_merchant')} <FiArrowRight />
                    </Link>
                </div>
            </section>
        </div>
    );
};

export default Merchants;
