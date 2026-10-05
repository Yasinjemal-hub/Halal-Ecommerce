import React, { useEffect, useState } from 'react';
import { FiImage, FiPlus, FiUploadCloud } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import merchantService from '../../services/merchantService';
import { getPlaceholderImage, getProductFallbackImage } from '../../lib/utils';
import { useLanguage } from '../../i18n/LanguageContext';
import { backendError } from '../../utils/backendErrors';
import './Dashboard.css';

const PRODUCT_CATEGORIES = [
    'meat', 'poultry', 'seafood', 'dairy', 'bakery', 'grains', 'spices',
    'beverages', 'snacks', 'frozen', 'canned', 'oils', 'honey', 'clothing',
    'cosmetics', 'perfume', 'books', 'home_decor', 'other',
];

const PM_STATUS_KEYS = {
    pending: 'appst_st_pending',
    under_review: 'appst_st_under_review',
    approved: 'appst_st_approved',
    rejected: 'appst_st_rejected',
    suspended: 'appst_st_suspended',
};

const PM_CATEGORY_KEYS = {
    meat: 'cat_meat',
    poultry: 'cat_poultry',
    seafood: 'cat_seafood',
    dairy: 'cat_dairy',
    bakery: 'cat_bakery',
    grains: 'cat_grains',
    spices: 'cat_spices',
    beverages: 'cat_beverages',
    snacks: 'cat_snacks',
    frozen: 'cat_frozen',
    canned: 'cat_canned',
    oils: 'cat_oils',
    honey: 'cat_honey',
    clothing: 'cat_clothing',
    cosmetics: 'cat_cosmetics',
    perfume: 'cat_perfume',
    books: 'cat_books',
    home_decor: 'cat_home_decor',
    other: 'cat_other',
};
const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Category-specific placeholder colors for better visual distinction
const CATEGORY_PLACEHOLDERS = {
    meat: { bg: 'C0392B', text: 'Fresh Meat' },
    poultry: { bg: 'D4AC0D', text: 'Poultry' },
    seafood: { bg: '2980B9', text: 'Seafood' },
    dairy: { bg: 'ECF0F1', text: 'Dairy', textColor: '2C3E50' },
    bakery: { bg: 'D35400', text: 'Bakery' },
    grains: { bg: 'F5CBA7', text: 'Grains', textColor: '2C3E50' },
    spices: { bg: 'CB4335', text: 'Spices' },
    beverages: { bg: '27AE60', text: 'Beverages' },
    snacks: { bg: 'A04000', text: 'Snacks' },
    frozen: { bg: '3498DB', text: 'Frozen' },
    canned: { bg: 'F39C12', text: 'Canned' },
    oils: { bg: 'F1C40F', text: 'Oils', textColor: '2C3E50' },
    honey: { bg: 'B9770E', text: 'Honey' },
    clothing: { bg: '8E44AD', text: 'Clothing' },
    cosmetics: { bg: 'E91E63', text: 'Cosmetics' },
    perfume: { bg: 'D4AF37', text: 'Perfume' },
    books: { bg: '5D6D7E', text: 'Books' },
    home_decor: { bg: '8B4513', text: 'Home Decor' },
    other: { bg: '0D7C3D', text: 'Product' },
};

const ProductManager = () => {
    const { t, formatETB, formatNumber } = useLanguage();
    const [merchantId, setMerchantId] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [productImageFile, setProductImageFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [merchantVerified, setMerchantVerified] = useState(false);
    const [merchantStatus, setMerchantStatus] = useState('pending');
    const navigate = useNavigate();

    const [form, setForm] = useState({
        name: '',
        description: '',
        category: '',
        price: '',
        discountPrice: '',
        stock: '',
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const profile = await merchantService.getMyProfile();
            const merchant = profile.merchant || profile;
            setMerchantId(merchant?._id || '');
            const status = merchant?.verificationStatus || 'pending';
            setMerchantStatus(status);
            const approved = status === 'approved';
            setMerchantVerified(approved);

            // Only approved merchants may see or manage products. Other
            // statuses see a status message instead — the server also
            // blocks the list and all mutations for non-approved merchants.
            if (approved && merchant?._id) {
                const productData = await merchantService.getMerchantProducts(merchant._id, { limit: 100 });
                setProducts(productData.products || []);
            } else {
                setProducts([]);
            }
        } catch (err) {
            setError(backendError(t, err, 'err_load_products'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

    const numericPrice = Number(form.price) || 0;
    const numericDiscountPrice = Number(form.discountPrice) || 0;
    const minDiscountPrice = numericPrice ? Number((numericPrice * 0.2).toFixed(2)) : 0;
    const sellingPrice = numericDiscountPrice > 0 ? numericDiscountPrice : numericPrice;
    const merchantFee = sellingPrice * 0.03;
    const mejilisFee = sellingPrice * 0.03;
    const merchantEarnings = sellingPrice - merchantFee - mejilisFee;

    const validateImageFile = (file) => {
        if (!file) return false;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            setError(t('appform_img_type_error'));
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            setError(t('appform_img_size', { size: MAX_IMAGE_SIZE_MB }));
            return false;
        }
        return true;
    };

    const handleImageSelect = (file) => {
        setError('');
        if (!file) {
            setProductImageFile(null);
            return;
        }
        if (!validateImageFile(file)) return;
        setProductImageFile(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!merchantVerified) {
            setError(t('pm_must_approved'));
            return;
        }
        // Validate discount before sending to server (client-side checks
        // report their own translated message, never a network error).
        if (form.discountPrice && form.discountPrice.trim()) {
            const discountValue = Number(form.discountPrice);
            const regularPriceValue = Number(form.price);
            if (discountValue <= 0 || discountValue >= regularPriceValue) {
                setError(t('pm_discount_range'));
                return;
            }
            if (discountValue < regularPriceValue * 0.2) {
                setError(t('pm_discount_max'));
                return;
            }
        }
        setSubmitting(true);
        setError('');
        setSuccess('');
        try {
            let payload;
            const formValues = {
                name: form.name.trim(),
                description: form.description.trim(),
                category: form.category,
                price: Number(form.price),
                stock: Number(form.stock),
                discountPrice: form.discountPrice && form.discountPrice.trim() ? Number(form.discountPrice) : undefined,
            };

            if (productImageFile) {
                const formData = new FormData();
                Object.entries(formValues).forEach(([key, value]) => {
                    if (value !== undefined && value !== '') {
                        formData.append(key, value);
                    }
                });
                formData.append('image', productImageFile);
                payload = formData;
            } else {
                const imageData = getProductFallbackImage(form.name);
                payload = {
                    ...formValues,
                    images: [{ url: imageData, alt: form.name.trim(), isDefault: true }],
                };
            }

            if (editingProduct) {
                if (!productImageFile && !(payload instanceof FormData)) {
                    payload.images = editingProduct.images || [];
                }
                await productService.update(editingProduct._id, payload);
                setSuccess(t('pm_updated'));
            } else {
                await productService.create(payload);
                setSuccess(t('pm_created'));
            }

            setForm({ name: '', description: '', category: '', price: '', discountPrice: '', stock: '' });
            setProductImageFile(null);
            setIsDragOver(false);
            setEditingProduct(null);
            await loadData();
            if (!editingProduct) navigate('/shop');
        } catch (err) {
            setError(backendError(t, err, 'err_save_product'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditProduct = (product) => {
        setEditingProduct(product);
        setForm({
            name: product.name || '',
            description: product.description || '',
            category: product.category || '',
            price: product.price?.toString() || '',
            discountPrice: product.discountPrice?.toString() || '',
            stock: product.stock?.toString() || '',
        });
        setProductImageFile(null);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
        setForm({ name: '', description: '', category: '', price: '', discountPrice: '', stock: '' });
        setProductImageFile(null);
    };

    const handleDeleteProduct = async (productId) => {
        if (!window.confirm(t('pm_delete_confirm'))) return;
        setLoading(true);
        try {
            await productService.delete(productId);
            setSuccess(t('pm_deleted'));
            await loadData();
        } catch (err) {
            setError(backendError(t, err, 'err_delete_product'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-welcome">
                <div>
                    <h1 className="heading-section">{t('pm_title')}</h1>
                    <p className="text-body">{t('pm_sub')}</p>
                </div>
                <Link to="/dashboard" className="btn btn-ghost">{t('pm_back')}</Link>
            </div>

            {(error || success) && (
                <div className={`dashboard-alert ${error ? 'error' : 'success'}`}>
                    {error || success}
                </div>
            )}

            {!loading && !merchantVerified && (
                <div className="dashboard-section" data-testid="product-access-gate">
                    <h2>{t('pm_gate', { status: t(PM_STATUS_KEYS[merchantStatus] || 'appst_st_pending') })}</h2>
                    <p className="text-body">
                        {t('pm_gate_desc')}
                    </p>
                    <Link to="/merchant/register" className="btn btn-primary">
                        {t('pm_view_app')}
                    </Link>
                </div>
            )}

            {merchantVerified && (
            <div className="dashboard-section">
                <div className="dashboard-section-header">
                    <h2><FiPlus /> {t('pm_add')}</h2>
                </div>

                <form className="dashboard-form-grid" onSubmit={handleSubmit}>
                    <input
                        className="dashboard-input"
                        placeholder={t('pm_name_ph')}
                        value={form.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        required
                        disabled={!merchantVerified}
                    />

                    <select
                        className="dashboard-input"
                        value={form.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        required
                        disabled={!merchantVerified}
                    >
                        <option value="">{t('pm_category_ph')}</option>
                        {PRODUCT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{t(PM_CATEGORY_KEYS[cat])}</option>
                        ))}
                    </select>

                    <input
                        className="dashboard-input"
                        type="number"
                        min="0"
                        placeholder={t('pm_price_ph')}
                        value={form.price}
                        onChange={(e) => handleChange('price', e.target.value)}
                        required
                        disabled={!merchantVerified}
                    />

                    <input
                        className="dashboard-input"
                        type="number"
                        min={form.price ? minDiscountPrice : 0}
                        max={form.price ? Number(form.price) - 0.01 : undefined}
                        placeholder={t('pm_discount_ph')}
                        value={form.discountPrice}
                        onChange={(e) => handleChange('discountPrice', e.target.value)}
                        disabled={!merchantVerified}
                        title={t('pm_discount_title')}
                        step="0.01"
                    />

                    {numericPrice > 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#666', gridColumn: '1 / -1', marginTop: '-12px', marginBottom: '8px', padding: '10px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                            {numericDiscountPrice > 0 && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', textDecoration: 'line-through', color: '#999' }}>
                                        <span>{t('pm_regular')}</span>
                                        <span>{formatETB(numericPrice)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 'bold', color: '#10b981' }}>
                                        <span>{t('pm_sale')}</span>
                                        <span>{formatETB(numericDiscountPrice)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#10b981' }}>
                                        <span>{t('pm_discount')}</span>
                                        <span>-{formatETB(numericPrice - numericDiscountPrice)} ({Math.round(((numericPrice - numericDiscountPrice) / numericPrice) * 100)}%)</span>
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>{t('pm_sale')}</span>
                                <span>{formatETB(sellingPrice)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#dc2626' }}>
                                <span>{t('pm_fee')}</span>
                                <span>-{formatETB(merchantFee)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#dc2626' }}>
                                <span>{t('pm_mejilis')}</span>
                                <span>-{formatETB(mejilisFee)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontWeight: 'bold', color: 'var(--primary-700)' }}>
                                <span>{t('pm_earn')}</span>
                                <span>{formatETB(merchantEarnings)}</span>
                            </div>
                        </div>
                    )}

                    <input
                        className="dashboard-input"
                        type="number"
                        min="0"
                        placeholder={t('pm_stock_ph')}
                        value={form.stock}
                        onChange={(e) => handleChange('stock', e.target.value)}
                        required
                        disabled={!merchantVerified}
                    />

                    <textarea
                        className="dashboard-input dashboard-textarea"
                        placeholder={t('pm_desc_ph')}
                        value={form.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        required
                        disabled={!merchantVerified}
                    />

                    <label className="dashboard-upload">
                        <div
                            className={`dashboard-dropzone ${isDragOver ? 'dragover' : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => { e.preventDefault(); setIsDragOver(false); handleImageSelect(e.dataTransfer.files?.[0] || null); }}
                        >
                            <FiUploadCloud size={18} />
                            <span>{productImageFile ? productImageFile.name : t('pm_drop')}</span>
                            <small>{t('appform_file_types', { size: MAX_IMAGE_SIZE_MB })}</small>
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e.target.files?.[0] || null)} disabled={!merchantVerified} />
                    </label>

                    {productImageFile && (
                        <div className="dashboard-preview-card">
                            <img src={URL.createObjectURL(productImageFile)} alt="Product preview" />
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProductImageFile(null)}>{t('pm_remove')}</button>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={submitting || !merchantVerified}>
                        {submitting ? t('pm_saving') : editingProduct ? t('pm_update') : t('pm_create')}
                    </button>

                    {editingProduct && (
                        <button type="button" className="btn btn-ghost" onClick={handleCancelEdit}>{t('pm_cancel_edit')}</button>
                    )}

                    {!merchantVerified && (
                        <span className="text-muted" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                            {t('pm_need_approval')}
                        </span>
                    )}
                </form>
            </div>
            )}

            {merchantVerified && (
            <div className="dashboard-section">
                <div className="dashboard-section-header">
                    <h2><FiImage /> {t('pm_yours')}</h2>
                </div>

                {loading ? (
                    <p className="text-body">{t('pm_loading')}</p>
                ) : products.length === 0 ? (
                    <p className="text-body">{t('pm_empty')}</p>
                ) : (
                    <div className="dashboard-products-grid">
                        {products.map((product) => (
                            <div className="dashboard-product-card" key={product._id}>
                                <img src={product.images?.[0]?.url || getProductFallbackImage(product.name, 400, 240)} alt={product.name} />
                                <h4>{product.name}</h4>
                                <p>{PM_CATEGORY_KEYS[product.category] ? t(PM_CATEGORY_KEYS[product.category]) : product.category}</p>
                                <div style={{ marginBottom: '8px' }}>
                                    {product.discountPrice ? (
                                        <>
                                            <strong style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>
                                                {formatETB(Number(product.price || 0))}
                                            </strong>
                                            <strong style={{ color: '#10b981' }}>
                                                {formatETB(Number(product.discountPrice || 0))}
                                            </strong>
                                            <span style={{ color: '#10b981', fontSize: '0.85rem', marginLeft: '8px' }}>
                                                {t('product_save_percent', { percent: Math.round(((product.price - product.discountPrice) / product.price) * 100) })}
                                            </span>
                                        </>
                                    ) : (
                                        <strong>{formatETB(Number(product.price || 0))}</strong>
                                    )}
                                </div>
                                <p className="dashboard-product-meta">{t('pm_stock', { count: formatNumber(product.stock ?? 0) })}</p>
                                <div className="dashboard-product-actions">
                                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleEditProduct(product)}>{t('pm_edit')}</button>
                                    <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDeleteProduct(product._id)}>{t('pm_delete')}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

export default ProductManager;
