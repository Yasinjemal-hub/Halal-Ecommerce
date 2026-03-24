import React, { useEffect, useState } from 'react';
import { FiImage, FiPlus, FiUploadCloud } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import productService from '../../services/productService';
import merchantService from '../../services/merchantService';
import './Dashboard.css';

const PRODUCT_CATEGORIES = [
    'meat', 'poultry', 'seafood', 'dairy', 'bakery', 'grains', 'spices',
    'beverages', 'snacks', 'frozen', 'canned', 'oils', 'honey', 'clothing',
    'cosmetics', 'perfume', 'books', 'home_decor', 'other',
];
const MAX_IMAGE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

const ProductManager = () => {
    const [merchantId, setMerchantId] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [productImageFile, setProductImageFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const [form, setForm] = useState({
        name: '',
        description: '',
        category: '',
        price: '',
        stock: '',
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const profile = await merchantService.getMyProfile();
            const merchant = profile.merchant || profile;
            setMerchantId(merchant?._id || '');

            if (merchant?._id) {
                const productData = await productService.getAll({ merchant: merchant._id, limit: 100 });
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

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

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
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const imageData = productImageFile ? await fileToBase64(productImageFile) : '';
            const payload = {
                name: form.name.trim(),
                description: form.description.trim(),
                category: form.category,
                price: Number(form.price),
                stock: Number(form.stock),
                images: imageData ? [{ url: imageData, alt: form.name.trim(), isDefault: true }] : [],
            };

            await productService.create(payload);
            setSuccess('Product created successfully.');
            setForm({ name: '', description: '', category: '', price: '', stock: '' });
            setProductImageFile(null);
            setIsDragOver(false);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create product.');
        } finally {
            setSubmitting(false);
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
                    />
                    <select
                        className="dashboard-input"
                        value={form.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        required
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
                    />
                    <input
                        className="dashboard-input"
                        type="number"
                        min="0"
                        placeholder="Stock quantity"
                        value={form.stock}
                        onChange={(e) => handleChange('stock', e.target.value)}
                        required
                    />
                    <textarea
                        className="dashboard-input dashboard-textarea"
                        placeholder="Product description"
                        value={form.description}
                        onChange={(e) => handleChange('description', e.target.value)}
                        required
                    />
                    <label className="dashboard-upload">
                        <div
                            className={`dashboard-dropzone ${isDragOver ? 'dragover' : ''}`}
                            onDragOver={(e) => {
                                e.preventDefault();
                                setIsDragOver(true);
                            }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={(e) => {
                                e.preventDefault();
                                setIsDragOver(false);
                                handleImageSelect(e.dataTransfer.files?.[0] || null);
                            }}
                        >
                            <FiUploadCloud size={18} />
                            <span>{productImageFile ? productImageFile.name : 'Drag & drop product image, or click to upload'}</span>
                            <small>JPG, PNG, WEBP - max {MAX_IMAGE_SIZE_MB}MB</small>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageSelect(e.target.files?.[0] || null)}
                        />
                    </label>
                    {productImageFile && (
                        <div className="dashboard-preview-card">
                            <img src={URL.createObjectURL(productImageFile)} alt="Product preview" />
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProductImageFile(null)}>
                                Remove
                            </button>
                        </div>
                    )}
                    <button type="submit" className="btn btn-primary" disabled={submitting || !merchantId}>
                        {submitting ? 'Saving...' : 'Create Product'}
                    </button>
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
                                <img
                                    src={product.images?.[0]?.url || 'https://placehold.co/400x240/0D7C3D/ffffff?text=No+Image'}
                                    alt={product.name}
                                />
                                <h4>{product.name}</h4>
                                <p>{product.category?.replace('_', ' ')}</p>
                                <strong>{Number(product.price || 0).toLocaleString()} ETB</strong>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductManager;
