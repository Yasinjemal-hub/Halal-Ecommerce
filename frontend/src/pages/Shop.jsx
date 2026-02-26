import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiFilter, FiX, FiGrid, FiList, FiSearch, FiChevronDown } from 'react-icons/fi';
import { fetchProducts, setFilters, clearFilters } from '../../redux/slices/productSlice';
import ProductCard from '../../components/common/ProductCard';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import './Shop.css';

const CATEGORIES = [
    { value: '', label: 'All Categories' },
    { value: 'meat', label: '🥩 Meat & Poultry' },
    { value: 'poultry', label: '🍗 Poultry' },
    { value: 'dairy', label: '🥛 Dairy' },
    { value: 'spices', label: '🌶️ Spices' },
    { value: 'bakery', label: '🍞 Bakery' },
    { value: 'honey', label: '🍯 Honey' },
    { value: 'grains', label: '🌾 Grains' },
    { value: 'clothing', label: '👗 Clothing' },
    { value: 'cosmetics', label: '✨ Cosmetics' },
    { value: 'perfume', label: '🌸 Perfume' },
    { value: 'books', label: '📚 Books' },
    { value: 'home_decor', label: '🏠 Home Décor' },
    { value: 'beverages', label: '☕ Beverages' },
];

const SORT_OPTIONS = [
    { value: '-createdAt', label: 'Newest First' },
    { value: 'price', label: 'Price: Low to High' },
    { value: '-price', label: 'Price: High to Low' },
    { value: '-ratingsAverage', label: 'Top Rated' },
    { value: 'name', label: 'Name: A-Z' },
];

const Shop = () => {
    const dispatch = useDispatch();
    const [searchParams, setSearchParams] = useSearchParams();
    const { items, pagination, filters, isLoading, error } = useSelector((state) => state.products);
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

    // Fetch products when filters change
    useEffect(() => {
        const params = {
            page: pagination.page,
            limit: 12,
            ...(filters.category && { category: filters.category }),
            ...(filters.search && { search: filters.search }),
            ...(filters.sort && { sort: filters.sort }),
            ...(filters.minPrice && { 'price[gte]': filters.minPrice }),
            ...(filters.maxPrice && { 'price[lte]': filters.maxPrice }),
            ...(filters.halalCertified && { halalCertified: true }),
        };
        dispatch(fetchProducts(params));
    }, [dispatch, filters, pagination.page]);

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
    };

    const handlePageChange = (page) => {
        dispatch(setFilters({})); // triggers re-fetch
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Demo products for display
    const demoProducts = [
        { _id: 's1', name: 'Halal Chicken Wings', price: 350, category: 'poultry', ratingsAverage: 4.5, ratingsCount: 67, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/0D7C3D/fff?text=Chicken' }], merchant: { businessName: 'Addis Poultry', verificationStatus: 'approved' } },
        { _id: 's2', name: 'Mitmita Spice Blend', nameAmharic: 'ሚጥሚጣ', price: 120, category: 'spices', ratingsAverage: 4.8, ratingsCount: 156, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/d97706/fff?text=Mitmita' }], merchant: { businessName: 'Harar Spices', verificationStatus: 'approved' } },
        { _id: 's3', name: 'Organic Teff Grain', nameAmharic: 'ጤፍ', price: 280, category: 'grains', ratingsAverage: 4.6, ratingsCount: 92, halalCertified: true, isInStock: true, isFeatured: true, images: [{ url: 'https://placehold.co/400x400/065f2d/fff?text=Teff' }], merchant: { businessName: 'Teff Farm', verificationStatus: 'approved' } },
        { _id: 's4', name: 'Shiro Powder', nameAmharic: 'ሽሮ', price: 95, category: 'spices', ratingsAverage: 4.7, ratingsCount: 203, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/c2410c/fff?text=Shiro' }], merchant: { businessName: 'Ethiopian Foods', verificationStatus: 'approved' } },
        { _id: 's5', name: 'Raw Wildflower Honey', price: 520, discountPrice: 440, category: 'honey', ratingsAverage: 4.9, ratingsCount: 178, halalCertified: true, isInStock: true, isFeatured: true, images: [{ url: 'https://placehold.co/400x400/ca8a04/fff?text=Honey' }], merchant: { businessName: 'Tigray Honey', verificationStatus: 'approved' } },
        { _id: 's6', name: 'Ethiopian Coffee Beans', nameAmharic: 'ቡና', price: 380, category: 'beverages', ratingsAverage: 4.8, ratingsCount: 341, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/78350f/fff?text=Coffee' }], merchant: { businessName: 'Yirgacheffe Coffee', verificationStatus: 'approved' } },
        { _id: 's7', name: 'Islamic Calligraphy Art', price: 1200, category: 'home_decor', ratingsAverage: 4.4, ratingsCount: 34, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/4f46e5/fff?text=Art' }], merchant: { businessName: 'Islamic Arts', verificationStatus: 'approved' } },
        { _id: 's8', name: 'Premium Lamb Cuts', price: 950, discountPrice: 820, category: 'meat', ratingsAverage: 4.7, ratingsCount: 89, halalCertified: true, isInStock: true, images: [{ url: 'https://placehold.co/400x400/dc2626/fff?text=Lamb' }], merchant: { businessName: 'Halal Meats AA', verificationStatus: 'approved' } },
    ];

    const displayProducts = items.length > 0 ? items : demoProducts;
    const hasActiveFilters = filters.category || filters.search || filters.halalCertified || filters.minPrice || filters.maxPrice;

    return (
        <div className="shop-page">
            {/* Header */}
            <div className="shop-header">
                <div className="container">
                    <div className="shop-header-content">
                        <div>
                            <h1 className="heading-section">Shop Halal Products</h1>
                            <p className="text-body">Browse {pagination.total || displayProducts.length}+ verified halal products</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container shop-layout">
                {/* Sidebar Filters (Desktop) */}
                <aside className={`shop-filters ${isFilterOpen ? 'filters-open' : ''}`} id="shop-filters">
                    <div className="filters-header">
                        <h3>Filters</h3>
                        <button className="filters-close" onClick={() => setIsFilterOpen(false)}>
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Search */}
                    <div className="filter-group">
                        <label className="filter-label">Search</label>
                        <form onSubmit={handleSearch} className="filter-search">
                            <FiSearch size={16} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                value={localSearch}
                                onChange={(e) => setLocalSearch(e.target.value)}
                                className="input"
                            />
                        </form>
                    </div>

                    {/* Category Filter */}
                    <div className="filter-group">
                        <label className="filter-label">Category</label>
                        <div className="filter-options">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.value}
                                    className={`filter-option ${filters.category === cat.value ? 'filter-option-active' : ''}`}
                                    onClick={() => handleFilterChange('category', cat.value)}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Price Range */}
                    <div className="filter-group">
                        <label className="filter-label">Price Range (ETB)</label>
                        <div className="filter-price-range">
                            <input
                                type="number"
                                placeholder="Min"
                                value={filters.minPrice}
                                onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                                className="input"
                            />
                            <span>—</span>
                            <input
                                type="number"
                                placeholder="Max"
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
                            <span>☪ Halal Certified Only</span>
                        </label>
                    </div>

                    {hasActiveFilters && (
                        <button className="btn btn-ghost filter-clear" onClick={handleClearFilters}>
                            <FiX size={16} /> Clear All Filters
                        </button>
                    )}
                </aside>

                {/* Main Content */}
                <main className="shop-content">
                    {/* Toolbar */}
                    <div className="shop-toolbar">
                        <button className="btn btn-outline btn-sm filter-toggle" onClick={() => setIsFilterOpen(true)} id="filter-toggle-btn">
                            <FiFilter size={16} /> Filters
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
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="sort-icon" />
                            </div>

                            <div className="view-modes">
                                <button
                                    className={`view-mode-btn ${viewMode === 'grid' ? 'view-active' : ''}`}
                                    onClick={() => setViewMode('grid')}
                                    aria-label="Grid view"
                                >
                                    <FiGrid size={18} />
                                </button>
                                <button
                                    className={`view-mode-btn ${viewMode === 'list' ? 'view-active' : ''}`}
                                    onClick={() => setViewMode('list')}
                                    aria-label="List view"
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
                                    {CATEGORIES.find(c => c.value === filters.category)?.label || filters.category}
                                    <button onClick={() => handleFilterChange('category', '')}><FiX size={14} /></button>
                                </span>
                            )}
                            {filters.search && (
                                <span className="filter-chip">
                                    Search: "{filters.search}"
                                    <button onClick={() => handleFilterChange('search', '')}><FiX size={14} /></button>
                                </span>
                            )}
                            {filters.halalCertified && (
                                <span className="filter-chip">
                                    Halal Certified
                                    <button onClick={() => handleFilterChange('halalCertified', false)}><FiX size={14} /></button>
                                </span>
                            )}
                        </div>
                    )}

                    {/* Products */}
                    {isLoading ? (
                        <Loader text="Loading halal products..." />
                    ) : error ? (
                        <div className="shop-error">
                            <p>😔 {error}</p>
                            <button className="btn btn-primary" onClick={() => dispatch(fetchProducts({}))}>Try Again</button>
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
                                    <div className="shop-empty-icon">🔍</div>
                                    <h3>No products found</h3>
                                    <p>Try adjusting your filters or search terms</p>
                                    <button className="btn btn-primary" onClick={handleClearFilters}>Clear Filters</button>
                                </div>
                            )}

                            <Pagination
                                currentPage={pagination.page}
                                totalPages={pagination.totalPages}
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
