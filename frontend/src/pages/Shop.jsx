import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiFilter, FiX, FiGrid, FiList, FiSearch, FiChevronDown } from 'react-icons/fi';
import { fetchProducts, setFilters, setPage, clearFilters } from '../redux/slices/productSlice';
import ProductCard from '../components/common/ProductCard';
import Pagination from '../components/common/Pagination';
import Loader from '../components/common/Loader';
import merchantService from '../services/merchantService';
import { useLanguage } from '../i18n/LanguageContext';
import { mapBackendMessage } from '../utils/backendErrors';
import './Shop.css';

const CATEGORIES = [
    { value: '', key: 'shop_all_categories' },
    { value: 'meat', key: 'cat_meat' },
    { value: 'poultry', key: 'cat_poultry' },
    { value: 'dairy', key: 'cat_dairy' },
    { value: 'spices', key: 'cat_spices' },
    { value: 'bakery', key: 'cat_bakery' },
    { value: 'honey', key: 'cat_honey' },
    { value: 'grains', key: 'cat_grains' },
    { value: 'clothing', key: 'cat_clothing' },
    { value: 'cosmetics', key: 'cat_cosmetics' },
    { value: 'perfume', key: 'cat_perfume' },
    { value: 'books', key: 'cat_books' },
    { value: 'home_decor', key: 'cat_home_decor' },
    { value: 'beverages', key: 'cat_beverages' },
];

const SORT_OPTIONS = [
    { value: '-createdAt', key: 'shop_sort_newest' },
    { value: 'price', key: 'shop_sort_price_asc' },
    { value: '-price', key: 'shop_sort_price_desc' },
    { value: '-ratingsAverage', key: 'shop_sort_rating' },
    { value: 'name', key: 'shop_sort_name' },
];

const Shop = () => {
    const dispatch = useDispatch();
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const { items, pagination, filters, isLoading, error } = useSelector((state) => state.products);
    const { user } = useSelector((state) => state.auth);
    const isMerchantUser = user?.role === 'merchant';
    const [merchantId, setMerchantId] = useState('');
    const [merchantProducts, setMerchantProducts] = useState([]);
    const [merchantPagination, setMerchantPagination] = useState({ page: 1, totalPages: 1, total: 0 });
    const [merchantLoading, setMerchantLoading] = useState(false);
    const [merchantError, setMerchantError] = useState(null);
    const [merchantPage, setMerchantPage] = useState(1);
    const [merchantReload, setMerchantReload] = useState(0);
    const [isMerchantProfileLoading, setIsMerchantProfileLoading] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [viewMode, setViewMode] = useState('grid');
    const [localSearch, setLocalSearch] = useState('');

    // Sync URL params with filters
    useEffect(() => {
        const category = searchParams.get('category') || '';
        const search = searchParams.get('search') || '';
        dispatch(setFilters({ category, search }));
        setLocalSearch(search);
    }, [searchParams, dispatch]);

    useEffect(() => {
        if (!isMerchantUser) return;

        const loadMerchantProfile = async () => {
            setIsMerchantProfileLoading(true);
            try {
                const profile = await merchantService.getMyProfile();
                const merchant = profile.merchant || profile;
                setMerchantId(merchant?._id || merchant?.id || '');
            } catch (error) {
                console.error('Failed to load merchant profile', error);
            } finally {
                setIsMerchantProfileLoading(false);
            }
        };

        loadMerchantProfile();
    }, [isMerchantUser]);

    useEffect(() => {
        if (!isMerchantUser || !merchantId) return;

        const loadMerchantProducts = async () => {
            setMerchantLoading(true);
            setMerchantError(null);
            try {
                const sortMap = {
                    '-createdAt': 'newest',
                    'price': 'price_asc',
                    '-price': 'price_desc',
                    '-ratingsAverage': 'rating',
                    'name': 'newest',
                };
                const params = {
                    page: merchantPage,
                    limit: 12,
                    ...(filters.category && { category: filters.category }),
                    ...(filters.search && { search: filters.search }),
                    ...(filters.sort && { sort: sortMap[filters.sort] || filters.sort }),
                    ...(filters.minPrice && { minPrice: filters.minPrice }),
                    ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
                    ...(filters.halalCertified && { halalCertified: true }),
                };
                const productsData = await merchantService.getMerchantProducts(merchantId, params);
                setMerchantProducts(productsData.products || []);
                setMerchantPagination({
                    page: productsData.currentPage || 1,
                    totalPages: productsData.totalPages || 1,
                    total: productsData.total || 0,
                });
            } catch (err) {
                setMerchantError(err.response?.data?.message || 'Failed to load your products.');
            } finally {
                setMerchantLoading(false);
            }
        };

        loadMerchantProducts();
    }, [isMerchantUser, merchantId, filters, merchantPage, merchantReload]);

    // Fetch products when filters change
    useEffect(() => {
        if (isMerchantUser) return;

        const sortMap = {
            '-createdAt': 'newest',
            'price': 'price_asc',
            '-price': 'price_desc',
            '-ratingsAverage': 'rating',
            'name': 'newest', // fallback
        };

        const params = {
            page: pagination.page,
            limit: 12,
            ...(filters.category && { category: filters.category }),
            ...(filters.search && { search: filters.search }),
            ...(filters.sort && { sort: sortMap[filters.sort] || filters.sort }),
            ...(filters.minPrice && { minPrice: filters.minPrice }),
            ...(filters.maxPrice && { maxPrice: filters.maxPrice }),
            ...(filters.halalCertified && { halalCertified: true }),
        };

        dispatch(fetchProducts(params));
    }, [dispatch, filters, pagination.page, isMerchantUser]);

    const handleFilterChange = (key, value) => {
        dispatch(setFilters({ [key]: value }));
        const newParams = new URLSearchParams(searchParams);
        if (value) {
            newParams.set(key, value);
        } else {
            newParams.delete(key);
        }
        setSearchParams(newParams);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        handleFilterChange('search', localSearch);
    };

    const handleClearFilters = () => {
        dispatch(clearFilters());
        setSearchParams({});
        setLocalSearch('');
        if (isMerchantUser) setMerchantPage(1);
    };

    const handlePageChange = (page) => {
        if (isMerchantUser) {
            setMerchantPage(page);
        } else {
            dispatch(setPage(page));
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const displayProducts = isMerchantUser ? merchantProducts : items;
    const isLoadingProducts = isMerchantUser ? merchantLoading : isLoading;
    const errorMessage = isMerchantUser ? merchantError : error;
    const paginationState = isMerchantUser ? merchantPagination : pagination;
    const hasActiveFilters = filters.category || filters.search || filters.halalCertified || filters.minPrice || filters.maxPrice;

    return (
        <div className="shop-page">
            {/* Header */}
            <div className="shop-header">
                <div className="container">
                    <div className="shop-header-content">
                        <div>
                            <h1 className="heading-section">
                                {isMerchantUser ? t('shop_my_listings') : t('shop_title')}
                            </h1>
                            <p className="text-body">
                                {isMerchantUser
                                    ? t('shop_my_listings_desc')
                                    : t('shop_browse_count', { count: pagination.total || displayProducts.length })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container shop-layout">
                {/* Sidebar Filters (Desktop) */}
                <aside className={`shop-filters ${isFilterOpen ? 'filters-open' : ''}`} id="shop-filters">
                    <div className="filters-header">
                        <h3>{t('shop_filters')}</h3>
                        <button className="filters-close" onClick={() => setIsFilterOpen(false)}>
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="filter-group">
                        <label className="filter-label">{t('shop_search_label')}</label>
                        <form onSubmit={handleSearch} className="filter-search">
                            <FiSearch size={16} />
                            <input
                                type="text"
                                placeholder={t('shop_search_placeholder')}
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="input"
                            />
                        </form>
                    </div>

                    {/* Category Filter */}
                    <div className="filter-group">
                        <label className="filter-label">{t('shop_category')}</label>
                        <div className="filter-options">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.value}
                                    className={`filter-option ${filters.category === cat.value ? 'filter-option-active' : ''}`}
                                    onClick={() => handleFilterChange('category', cat.value)}
                                >
                                    {t(cat.key)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="filter-group">
                        <label className="filter-label">{t('shop_price_range')}</label>
                        <div className="filter-price-range">
                            <input
                                type="number"
                                placeholder={t('shop_min')}
                                value={filters.minPrice}
                                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                                className="input"
                            />
                            <span>—</span>
                            <input
                                type="number"
                                placeholder={t('shop_max')}
                                value={filters.maxPrice}
                                onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                                className="input"
                            />
                        </div>
                    </div>

                    {/* Halal Only */}
                    <div className="filter-group">
                        <label className="filter-checkbox">
                            <input
                                type="checkbox"
                                checked={filters.halalCertified}
                                onChange={(e) => handleFilterChange('halalCertified', e.target.checked)}
                            />
                            <span className="filter-checkbox-custom" />
                            <span>{t('shop_halal_only')}</span>
                        </label>
                    </div>

                    {hasActiveFilters && (
                        <button className="btn btn-ghost filter-clear" onClick={handleClearFilters}>
                            <FiX size={16} /> {t('shop_clear_filters')}
                        </button>
                    )}
                </aside>

                {/* Main Content */}
                <main className="shop-content">
                    {/* Toolbar */}
                    <div className="shop-toolbar">
                        <button className="btn btn-outline btn-sm filter-toggle" onClick={() => setIsFilterOpen(true)} id="filter-toggle-btn">
                            <FiFilter size={16} /> {t('shop_filters')}
                        </button>

                        <div className="shop-toolbar-right">
                            <div className="sort-select-wrapper">
                                <select
                                    className="sort-select"
                                    value={filters.sort}
                                    onChange={(e) => handleFilterChange('sort', e.target.value)}
                                    id="sort-select"
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>{t(opt.key)}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="sort-icon" />
                            </div>

                            <div className="view-modes">
                                <button
                                    className={`view-mode-btn ${viewMode === 'grid' ? 'view-active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                    aria-label={t('a11y_grid_view')}
                                >
                                    <FiGrid size={18} />
                                </button>
                                <button
                                    className={`view-mode-btn ${viewMode === 'list' ? 'view-active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                    aria-label={t('a11y_list_view')}
                                >
                                    <FiList size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Active Filters Chips */}
                    {hasActiveFilters && (
                        <div className="active-filters">
                            {filters.category && (
                                <span className="filter-chip">
                                    {t(CATEGORIES.find(c => c.value === filters.category)?.key || 'shop_all_categories')}
                                    <button onClick={() => handleFilterChange('category', '')}><FiX size={14} /></button>
                                </span>
                            )}
                            {filters.search && (
                                <span className="filter-chip">
                                    {t('shop_chip_search', { query: filters.search })}
                                    <button onClick={() => handleFilterChange('search', '')}><FiX size={14} /></button>
                                </span>
                            )}
                            {filters.halalCertified && (
                                <span className="filter-chip">
                                    {t('shop_chip_halal')}
                                    <button onClick={() => handleFilterChange('halalCertified', false)}><FiX size={14} /></button>
                                </span>
                            )}
                        </div>
                    )}

                    {/* Products */}
                    {isLoadingProducts ? (
                        <Loader text={t('shop_loading')} />
                    ) : errorMessage ? (
                        <div className="shop-error">
                            <p>{mapBackendMessage(t, errorMessage) || t('err_load_products')}</p>
                            <button className="btn btn-primary" onClick={() => {
                                if (isMerchantUser) {
                                    setMerchantReload((n) => n + 1);
                                } else {
                                    dispatch(fetchProducts({}));
                                }
                            }}>{t('shop_try_again')}</button>
                        </div>
                    ) : (
                        <>
                            <div className={`grid ${viewMode === 'grid' ? 'grid-products' : 'grid-list'} stagger-children`}>
                                {displayProducts.map((product) => (
                                    <ProductCard key={product._id} product={product} />
                                ))}
                            </div>

                            {displayProducts.length === 0 && (
                                <div className="shop-empty">
                                    <div className="shop-empty-icon"><FiSearch size={48} /></div>
                                    <h3>{t('shop_no_products')}</h3>
                                    <p>{t('shop_no_products_desc')}</p>
                                    <button className="btn btn-primary" onClick={handleClearFilters}>{t('shop_clear_filters')}</button>
                                </div>
                            )}

                            <Pagination
                                currentPage={paginationState.page}
                                totalPages={paginationState.totalPages}
                                onPageChange={handlePageChange}
                            />
                        </>
                    )}
                </main>
            </div>

            {/* Mobile Filter Overlay */}
            {isFilterOpen && <div className="filter-overlay" onClick={() => setIsFilterOpen(false)} />}
        </div>
    );
};

export default Shop;
