import React, { useEffect, useState } from 'react';
import { FiImage, FiPlus, FiUploadCloud } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import productService from '../../services/productService';
import merchantService from '../../services/merchantService';
import { getPlaceholderImage, getProductFallbackImage } from '../../lib/utils';
import './Dashboard.css';

const PRODUCT_CATEGORIES = [
    'meat', 'poultry', 'seafood', 'dairy', 'bakery', 'grains', 'spices',
    'beverages', 'snacks', 'frozen', 'canned', 'oils', 'honey', 'clothing',
    'cosmetics', 'perfume', 'books', 'home_decor', 'other',
];
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
            setMerchantVerified(merchant?.verificationStatus === 'approved');

            if (merchant?._id) {
                const productData = await merchantService.getMerchantProducts(merchant._id, { limit: 100 });
                setProducts(productData.products || []);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load products.');
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
            setError('Only JPG, PNG, or WEBP images are allowed.');
            return false;
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            setError(`Image must be ${MAX_IMAGE_SIZE_MB}MB or smaller.`);
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
            setError('Merchant must be approved before adding products.');
            return;
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

            // Validate discount before sending to server
            if (form.discountPrice && form.discountPrice.trim()) {
                const discountValue = Number(form.discountPrice);
                const regularPriceValue = Number(form.price);
                if (discountValue <= 0 || discountValue >= regularPriceValue) {
                    throw new Error('Discount price must be greater than 0 and less than the regular price.');
                }
                if (discountValue < regularPriceValue * 0.2) {
                    throw new Error('Discount cannot exceed 80% off.');
                }
            }

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
                setSuccess('Product updated successfully.');
            } else {
                await productService.create(payload);
                setSuccess('Product created successfully.');
            }

            setForm({ name: '', description: '', category: '', price: '', discountPrice: '', stock: '' });
            setProductImageFile(null);
            setIsDragOver(false);
            setEditingProduct(null);
            await loadData();
            if (!editingProduct) navigate('/shop');
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to save product.');
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
        if (!window.confirm('Delete this product?')) return;
        setLoading(true);
        try {
            await productService.delete(productId);
            setSuccess('Product deleted successfully.');
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to delete product.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-welcome">
                <div>
                    <h1 className="heading-section">Product Management</h1>
                    <p className="text-body">Add professional product listings with product photos.</p>
                </div>
                <Link to="/dashboard" className="btn btn-ghost">Back to Dashboard</Link>
            </div>

            {(error || success) && (
                <div className={`dashboard-alert ${error ? 'error' : 'success'}`}>
                    {error || success}
                </div>
            )}

            <div className="dashboard-section">
                {!merchantVerified && (
                    <div className="dashboard-alert warning">
                        Your merchant profile is pending approval. You must be approved by Mejilis/Admin before adding or editing products.
                    </div>
                )}

                <div className="dashboard-section-header">
                    <h2><FiPlus /> Add New Product</h2>
                </div>

                <form className="dashboard-form-grid" onSubmit={handleSubmit}>
                    <input
                        className="dashboard-input"
                        placeholder="Product name"
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
                        <option value="">Select category</option>
                        {PRODUCT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                        ))}
                    </select>

                    <input
                        className="dashboard-input"
                        type="number"
                        min="0"
                        placeholder="Price (ETB)"
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
                        placeholder="Discount Price (ETB) - Optional"
                        value={form.discountPrice}
                        onChange={(e) => handleChange('discountPrice', e.target.value)}
                        disabled={!merchantVerified}
                        title="Set a lower price to offer discount (max 80% off)"
                        step="0.01"
                    />

                    {numericPrice > 0 && (
                        <div style={{ fontSize: '0.85rem', color: '#666', gridColumn: '1 / -1', marginTop: '-12px', marginBottom: '8px', padding: '10px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                            {numericDiscountPrice > 0 && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', textDecoration: 'line-through', color: '#999' }}>
                                        <span>Regular Price:</span>
                                        <span>{numericPrice.toFixed(2)} ETB</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 'bold', color: '#10b981' }}>
                                        <span>Sale Price:</span>
                                        <span>{numericDiscountPrice.toFixed(2)} ETB</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#10b981' }}>
                                        <span>Discount:</span>
                                        <span>-{(numericPrice - numericDiscountPrice).toFixed(2)} ETB ({Math.round(((numericPrice - numericDiscountPrice) / numericPrice) * 100)}%)</span>
                                    </div>
                                </>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span>Sale Price:</span>
                                <span>{sellingPrice.toFixed(2)} ETB</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#dc2626' }}>
                                <span>Platform Fee (3%):</span>
                                <span>-{merchantFee.toFixed(2)} ETB</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#dc2626' }}>
                                <span>Mejilis Council Fee (3%):</span>
                                <span>-{mejilisFee.toFixed(2)} ETB</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb', fontWeight: 'bold', color: 'var(--primary-700)' }}>
                                <span>You Earn:</span>
                                <span>{merchantEarnings.toFixed(2)} ETB</span>
                            </div>
                        </div>
                    )}

                    <input
                        className="dashboard-input"
                        type="number"
                        min="0"
                        placeholder="Stock quantity"
                        value={form.stock}
                        onChange={(e) => handleChange('stock', e.target.value)}
                        required
                        disabled={!merchantVerified}
                    />

                    <textarea
                        className="dashboard-input dashboard-textarea"
                        placeholder="Product description"
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
                            <span>{productImageFile ? productImageFile.name : 'Drag & drop product image, or click to upload'}</span>
                            <small>JPG, PNG, WEBP - max {MAX_IMAGE_SIZE_MB}MB</small>
                        </div>
                        <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e.target.files?.[0] || null)} disabled={!merchantVerified} />
                    </label>

                    {productImageFile && (
                        <div className="dashboard-preview-card">
                            <img src={URL.createObjectURL(productImageFile)} alt="Product preview" />
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProductImageFile(null)}>Remove</button>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary" disabled={submitting || !merchantVerified}>
                        {submitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                    </button>

                    {editingProduct && (
                        <button type="button" className="btn btn-ghost" onClick={handleCancelEdit}>Cancel Edit</button>
                    )}

                    {!merchantVerified && (
                        <span className="text-muted" style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                            Your merchant account must be approved before creating or editing products.
                        </span>
                    )}
                </form>
            </div>

            <div className="dashboard-section">
                <div className="dashboard-section-header">
                    <h2><FiImage /> Your Products</h2>
                </div>

                {loading ? (
                    <p className="text-body">Loading products...</p>
                ) : products.length === 0 ? (
                    <p className="text-body">No products yet. Add your first product above.</p>
                ) : (
                    <div className="dashboard-products-grid">
                        {products.map((product) => (
                            <div className="dashboard-product-card" key={product._id}>
                                <img src={product.images?.[0]?.url || getProductFallbackImage(product.name, 400, 240)} alt={product.name} />
                                <h4>{product.name}</h4>
                                <p>{product.category?.replace('_', ' ')}</p>
                                <div style={{ marginBottom: '8px' }}>
                                    {product.discountPrice ? (
                                        <>
                                            <strong style={{ textDecoration: 'line-through', color: '#999', marginRight: '8px' }}>
                                                {Number(product.price || 0).toLocaleString()} ETB
                                            </strong>
                                            <strong style={{ color: '#10b981' }}>
                                                {Number(product.discountPrice || 0).toLocaleString()} ETB
                                            </strong>
                                            <span style={{ color: '#10b981', fontSize: '0.85rem', marginLeft: '8px' }}>
                                                Save {Math.round(((product.price - product.discountPrice) / product.price) * 100)}%
                                            </span>
                                        </>
                                    ) : (
                                        <strong>{Number(product.price || 0).toLocaleString()} ETB</strong>
                                    )}
                                </div>
                                <p className="dashboard-product-meta">Stock: {product.stock ?? 0}</p>
                                <div className="dashboard-product-actions">
                                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => handleEditProduct(product)}>Edit</button>
                                    <button className="btn btn-danger btn-sm" type="button" onClick={() => handleDeleteProduct(product._id)}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductManager;
