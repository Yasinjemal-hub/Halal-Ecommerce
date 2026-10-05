import Product from '../models/Product.js';
import Merchant from '../models/Merchant.js';
import { getFileUrl } from '../middleware/upload.js';
import { safeMerchantResponse } from '../utils/safeResponse.js';
const parseImagesFromBody = (imagesField) => {
    if (!imagesField) return undefined;
    if (Array.isArray(imagesField)) return imagesField;
    if (typeof imagesField === 'string') {
        try {
            return JSON.parse(imagesField);
        } catch {
            return undefined;
        }
    }
    return undefined;
};

/**
 * Public storefronts only ever show products from currently approved
 * (hence halal certified) merchants. Products from pending, rejected, or
 * suspended merchants stay stored untouched — they reappear automatically
 * if the merchant is approved later — but are never listed, searched, or
 * served as currently available. Products without a merchant (legacy
 * orphans) keep their existing visibility.
 *
 * When a specific merchant is requested and it is not approved, the filter
 * matches nothing (empty public result, records preserved).
 */
export const restrictToApprovedMerchants = async (filter, requestedMerchantId) => {
    const approvedIds = await Merchant.find({ verificationStatus: 'approved' }).distinct('_id');
    if (requestedMerchantId) {
        const allowed = approvedIds.some((id) => id.toString() === String(requestedMerchantId));
        filter.merchant = allowed ? requestedMerchantId : { $in: [] };
        return;
    }
    filter.merchant = { $in: [...approvedIds, null] };
};

export const createProduct = async (req, res, next) => {
    try {
        const merchant = await Merchant.findOne({ user: req.user._id });

        if (!merchant) {
            return res.status(403).json({
                success: false,
                message: 'Merchant profile not found. You must register as a merchant first.',
            });
        }

        if (merchant.verificationStatus !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Your merchant profile must be approved by Mejilis/Admin before adding products.',
            });
        }

        const productData = {
            ...req.body,
            merchant: merchant._id,
            // One-approval rule: every product from an approved (hence halal
            // certified) merchant is halal verified.
            halalCertified: true,
            halalCertification: merchant.halalCertification || req.body.halalCertification,
        };

        if (req.file) {
            const imageUrl = getFileUrl(req, req.file);
            if (imageUrl) {
                productData.images = [
                    {
                        url: imageUrl,
                        alt: req.body.name?.trim() || 'Product image',
                        isDefault: true,
                    },
                ];
            }
        } else {
            const parsedImages = parseImagesFromBody(req.body.images);
            if (parsedImages) {
                productData.images = parsedImages;
            } else if (req.body.image) {
                productData.images = [
                    {
                        url: req.body.image,
                        alt: req.body.name?.trim() || 'Product image',
                        isDefault: true,
                    },
                ];
            }
        }

        if (productData.images?.length) {
            productData.image = productData.images[0].url;
        }

        const product = await Product.create(productData);

        await Merchant.findByIdAndUpdate(merchant._id, {
            $inc: { totalProducts: 1 },
        });

        res.status(201).json({
            success: true,
            product,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all products (public, with filtering & pagination)
 * @route   GET /api/products
 * @access  Public
 */
export const getAllProducts = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;

        // Build filter
        const filter = { isActive: true, isApproved: true, isDeleted: { $ne: true } };

        if (req.query.category) filter.category = req.query.category;
        if (req.query.halalCertified) filter.halalCertified = req.query.halalCertified === 'true';
        if (req.query.isFeatured) filter.isFeatured = req.query.isFeatured === 'true';
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { nameAmharic: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } },
            ];
        }
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
        }

        // Sort options
        let sort = { createdAt: -1 };
        if (req.query.sort === 'price_asc') sort = { price: 1 };
        if (req.query.sort === 'price_desc') sort = { price: -1 };
        if (req.query.sort === 'rating') sort = { ratingsAverage: -1 };
        if (req.query.sort === 'newest') sort = { createdAt: -1 };

        // Storefront visibility: approved merchants only.
        await restrictToApprovedMerchants(filter, req.query.merchant);

        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate({ path: 'merchant', select: 'businessName slug logo verificationStatus halalCertification', populate: { path: 'halalCertification', select: 'certificateNumber status issueDate expiryDate' } })
                .skip(skip)
                .limit(limit)
                .sort(sort),
            Product.countDocuments(filter),
        ]);

        // Transform products to include safe merchant data
        const safeProducts = products.map((product) => ({
            ...product.toObject(),
            merchant: product.merchant ? safeMerchantResponse.public(product.merchant) : null,
        }));

        res.status(200).json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            products: safeProducts,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get single product by ID
 * @route   GET /api/products/:id
 * @access  Public
 */
export const getProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('merchant', 'businessName slug logo businessPhone verificationStatus user')
            .populate('halalCertification', 'certificateNumber issuingAuthority certificateType status issueDate expiryDate scope coveredProducts');

        if (!product || product.isDeleted) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        // Not publicly available while its merchant is not approved. Only
        // staff may open it (authorized management); everyone else —
        // including the merchant while non-approved — gets 404 so the
        // product is never presented as available or halal. Records stay
        // stored and reappear on approval.
        const merchantStatus = product.merchant?.verificationStatus;
        const isStaff = req.user && ['admin', 'superadmin'].includes(req.user.role);
        if (product.merchant && merchantStatus !== 'approved' && !isStaff) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        const safeProduct = {
            ...product.toObject(),
            merchant: product.merchant ? safeMerchantResponse.public(product.merchant) : null,
        };

        res.status(200).json({
            success: true,
            product: safeProduct,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Merchant (owner)
 */
export const updateProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        const merchant = await Merchant.findOne({ user: req.user._id });
        if (!merchant || product.merchant.toString() !== merchant._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own products',
            });
        }

        // Only approved merchants may manage products. Records stay stored
        // and reappear if the merchant is approved later.
        if (merchant.verificationStatus !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Your merchant profile must be approved by Mejilis/Admin before managing products.',
            });
        }

        const updateData = { ...req.body };

        if (req.file) {
            const imageUrl = getFileUrl(req, req.file);
            if (imageUrl) {
                updateData.images = [
                    {
                        url: imageUrl,
                        alt: req.body.name?.trim() || 'Product image',
                        isDefault: true,
                    },
                ];
            }
        } else {
            const parsedImages = parseImagesFromBody(req.body.images);
            if (parsedImages) {
                updateData.images = parsedImages;
            } else if (req.body.image) {
                updateData.images = [
                    {
                        url: req.body.image,
                        alt: req.body.name?.trim() || 'Product image',
                        isDefault: true,
                    },
                ];
            }
        }

        if (updateData.images?.length) {
            updateData.image = updateData.images[0].url;
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
            context: 'query',
        });

        res.status(200).json({
            success: true,
            product: updatedProduct,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Merchant (owner) / Admin
 */
export const deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        // Verify ownership or admin
        if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
            const merchant = await Merchant.findOne({ user: req.user._id });
            if (!merchant || product.merchant.toString() !== merchant._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own products',
                });
            }
            // Only approved merchants may manage products; admins retain access.
            if (merchant.verificationStatus !== 'approved') {
                return res.status(403).json({
                    success: false,
                    message: 'Your merchant profile must be approved by Mejilis/Admin before managing products.',
                });
            }
        }

        // Soft-delete product instead of hard delete to preserve references
        await Product.findByIdAndUpdate(req.params.id, { isDeleted: true, isActive: false });

        // Decrement merchant product count
        if (product.merchant) {
            await Merchant.findByIdAndUpdate(product.merchant, {
                $inc: { totalProducts: -1 },
            });
        }

        res.status(200).json({
            success: true,
            message: 'Product deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Search products (full-text)
 * @route   GET /api/products/search
 * @access  Public
 */
export const searchProducts = async (req, res, next) => {
    try {
        const { q, category, page: pageStr, limit: limitStr } = req.query;
        const page = Math.max(parseInt(pageStr) || 1, 1);
        const limit = Math.min(Math.max(parseInt(limitStr) || 20, 1), 100);
        const skip = (page - 1) * limit;

        if (!q) {
            return res.status(400).json({
                success: false,
                message: 'Search query (q) is required',
            });
        }

        const filter = {
            $text: { $search: q },
            isActive: true,
            isApproved: true,
            isDeleted: { $ne: true },
        };
        if (category) filter.category = category;

        // Storefront visibility: approved merchants only.
        await restrictToApprovedMerchants(filter);

        const [products, total] = await Promise.all([
            Product.find(filter, { score: { $meta: 'textScore' } })
                .populate({ path: 'merchant', select: 'businessName slug logo verificationStatus halalCertification', populate: { path: 'halalCertification', select: 'certificateNumber status issueDate expiryDate' } })
                .sort({ score: { $meta: 'textScore' } })
                .skip(skip)
                .limit(limit),
            Product.countDocuments(filter),
        ]);

        // Transform products to include safe merchant data
        const safeProducts = products.map((product) => ({
            ...product.toObject(),
            merchant: product.merchant ? safeMerchantResponse.public(product.merchant) : null,
        }));

        res.status(200).json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            products: safeProducts,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Approve a product (admin)
 * @route   PUT /api/products/:id/approve
 * @access  Admin
 */
export const approveProduct = async (req, res, next) => {
    try {
        const { isApproved } = req.body;

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { isApproved: isApproved !== false },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        res.status(200).json({
            success: true,
            message: `Product ${product.isApproved ? 'approved' : 'unapproved'} successfully`,
            product,
        });
    } catch (error) {
        next(error);
    }
};
