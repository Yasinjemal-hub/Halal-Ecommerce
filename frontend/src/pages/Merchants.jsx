import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiMapPin, FiPhone, FiStar, FiShoppingBag, FiPackage, FiArrowRight, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { Utensils, ShoppingBag, Drumstick, Croissant, Package, Sparkle, Shirt, Flame, Store, Tag } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import merchantService from '../services/merchantService';
import { backendError } from '../utils/backendErrors';
import { isMerchantHalalVerified } from '../utils/certification';
import './Merchants.css';

const PAGE_SIZE = 12;

const TYPE_KEYS = {
    restaurant: 'mtype_restaurant',
    grocery: 'mtype_grocery',
    butcher: 'mtype_butcher',
    bakery: 'mtype_bakery',
    spice_shop: 'mtype_spice_shop',
    clothing: 'mtype_clothing',
    cosmetics: 'mtype_cosmetics',
    wholesale: 'mtype_wholesale',
    supermarket: 'mtype_supermarket',
    other: 'mtype_other',
};

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

const Merchants = () => {
    const { t, formatNumber } = useLanguage();
    const formatType = (businessType) => t(TYPE_KEYS[businessType] || 'mtype_other');
    const [merchants, setMerchants] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true); // initial load
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [activeType, setActiveType] = useState('');
    const requestRef = useRef(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim());
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const loadMerchants = useCallback(async ({ nextPage, search, businessType, append }) => {
        const requestId = requestRef.current + 1;
        requestRef.current = requestId;
        if (append) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        setError('');
        try {
            const params = { verified: 'true', page: nextPage, limit: PAGE_SIZE };
            if (search) params.search = search;
            if (businessType) params.businessType = businessType;
            const data = await merchantService.getAll(params);
            if (requestRef.current !== requestId) return; // stale response
            const list = data.merchants || [];
            const totalCount = data.total ?? list.length;
            setMerchants((prev) => (append ? [...prev, ...list] : list));
            setTotal(totalCount);
            const totalPages = data.totalPages ?? (list.length < PAGE_SIZE ? nextPage : nextPage + 1);
            setHasMore(nextPage < totalPages);
            setPage(nextPage);
        } catch (err) {
            if (requestRef.current !== requestId) return;
            if (!append) setMerchants([]);
            setError(backendError(t, err, 'error'));
        } finally {
            if (requestRef.current === requestId) {
                setLoading(false);
                setLoadingMore(false);
            }
        }
    }, [t]);

    // Fresh server query whenever search or type changes (page resets).
    useEffect(() => {
        loadMerchants({ nextPage: 1, search: debouncedSearch, businessType: activeType, append: false });
    }, [loadMerchants, debouncedSearch, activeType]);

    const handleRetry = () => {
        loadMerchants({ nextPage: 1, search: debouncedSearch, businessType: activeType, append: false });
    };

    const handleLoadMore = () => {
        if (loadingMore || !hasMore) return;
        loadMerchants({ nextPage: page + 1, search: debouncedSearch, businessType: activeType, append: true });
    };

    const hasActiveFilters = debouncedSearch !== '' || activeType !== '';
    const showEmptySearch = !loading && !error && merchants.length === 0 && hasActiveFilters;
    const showEmptyDatabase = !loading && !error && merchants.length === 0 && !hasActiveFilters;

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
                    <div className="merchants-search-wrapper" role="search">
                        <FiSearch size={20} aria-hidden="true" />
                        <input
                            type="text"
                            className="merchants-search-input"
                            placeholder={t('merchants_search_placeholder')}
                            aria-label={t('merchants_search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            id="merchants-search"
                        />
                    </div>
                </div>
            </section>

            {/* Filters */}
            <div className="container">
                <div className="merchants-type-filters" id="merchant-type-filters" role="group" aria-label={t('merchants_filter_all')}>
                    {BUSINESS_TYPES.map((type) => (
                        <button
                            key={type.value}
                            type="button"
                            className={`merchants-type-btn ${activeType === type.value ? 'type-active' : ''}`}
                            aria-pressed={activeType === type.value}
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
            <section className="container merchants-grid-section" aria-live="polite">
                {loading ? (
                    <div className="merchants-loading" data-testid="merchants-loading">
                        <div className="loader" aria-hidden="true" />
                        <p>{t('loading')}</p>
                    </div>
                ) : error && merchants.length === 0 ? (
                    <div className="merchants-empty" data-testid="merchants-error">
                        <div className="merchants-empty-icon"><FiAlertCircle size={48} /></div>
                        <h3>{t('error')}</h3>
                        <p>{error}</p>
                        <button type="button" className="btn btn-primary" data-testid="retry-merchants" onClick={handleRetry}>
                            {t('shop_try_again')}
                        </button>
                    </div>
                ) : showEmptySearch ? (
                    <div className="merchants-empty" data-testid="merchants-no-results">
                        <div className="merchants-empty-icon"><FiSearch size={48} /></div>
                        <h3>{t('merchants_no_results')}</h3>
                    </div>
                ) : showEmptyDatabase ? (
                    <div className="merchants-empty" data-testid="merchants-empty-database">
                        <div className="merchants-empty-icon"><FiShoppingBag size={48} /></div>
                        <h3>{t('merchants_no_results')}</h3>
                        <p>{t('merchants_description')}</p>
                    </div>
                ) : (
                    <>
                        <p className="merchants-result-count" data-testid="merchants-count">
                            {t('merchants_showing', { shown: merchants.length, total })}
                        </p>
                        <div className="merchants-grid stagger-children">
                            {merchants.map((merchant) => (
                                <div key={merchant._id} className="merchant-card animate-fade-in-up" id={`merchant-${merchant._id}`}>
                                    {/* Card Header */}
                                    <div className="merchant-card-header" style={{ background: `linear-gradient(135deg, var(--primary-600), var(--primary-800))` }}>
                                        <div className="merchant-card-avatar">
                                            {merchant.logo?.url ? (
                                                <img src={merchant.logo.url} alt={merchant.businessName} loading="lazy" decoding="async" />
                                            ) : (
                                                <span className="merchant-card-initial">{(merchant.businessName || '?')[0]}</span>
                                            )}
                                        </div>
                                        {isMerchantHalalVerified(merchant) && (
                                            <span className="merchant-verified-badge">
                                                <FiCheckCircle size={12} /> {t('merchants_verified')}
                                            </span>
                                        )}
                                        <span className="merchant-type-badge">
                                            {TYPE_EMOJIS[merchant.businessType] || 'Other'} {formatType(merchant.businessType)}
                                        </span>
                                    </div>

                                    {/* Card Body */}
                                    <div className="merchant-card-body">
                                        <h3 className="merchant-card-name">{merchant.businessName}</h3>
                                        {merchant.businessNameAmharic && (
                                            <p className="merchant-card-name-am text-ethiopic">{merchant.businessNameAmharic}</p>
                                        )}
                                        <p className="merchant-card-desc">{merchant.description}</p>

                                        {/* Stats (real server values only) */}
                                        <div className="merchant-card-stats">
                                            <div className="merchant-stat">
                                                <FiStar size={14} color="var(--accent-500)" />
                                                <span>{merchant.ratingsAverage > 0 ? Number(merchant.ratingsAverage).toFixed(1) : '—'}</span>
                                                <small>({merchant.ratingsCount ?? 0})</small>
                                            </div>
                                            <div className="merchant-stat">
                                                <FiShoppingBag size={14} />
                                                <span>{merchant.totalProducts ?? 0}</span>
                                                <small>{t('merchants_products_label')}</small>
                                            </div>
                                            <div className="merchant-stat">
                                                <FiPackage size={14} />
                                                <span>{formatNumber(merchant.totalOrders ?? 0)}</span>
                                                <small>{t('merchants_orders_label')}</small>
                                            </div>
                                        </div>

                                        {/* Location */}
                                        <div className="merchant-card-info">
                                            <FiMapPin size={14} />
                                            <span>{merchant.businessAddress?.city || t('merchants_location')}{merchant.businessAddress?.region && merchant.businessAddress.region !== merchant.businessAddress?.city ? `, ${merchant.businessAddress.region}` : ''}</span>
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

                        {error && merchants.length > 0 && (
                            <div className="merchants-empty" data-testid="merchants-load-more-error">
                                <p>{error}</p>
                                <button type="button" className="btn btn-ghost" onClick={handleLoadMore}>
                                    {t('shop_try_again')}
                                </button>
                            </div>
                        )}

                        {hasMore && (
                            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-outline"
                                    data-testid="load-more-merchants"
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                >
                                    {loadingMore ? t('loading') : t('merchants_load_more')}
                                </button>
                            </div>
                        )}
                    </>
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
