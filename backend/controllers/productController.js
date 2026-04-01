import Product from '../models/Product.js';
import Merchant from '../models/Merchant.js';

/**
 * @desc    Create a new product
 * @route   POST /api/products
 * @access  Merchant
 */
export const createProduct = async (req, res, next) => {
    try {
        // Optional: Find merchant profile for the logged-in user
        const merchant = await Merchant.findOne({ user: req.user._id });

        const productData = {
            ...req.body,
        };

        if (merchant) {
            productData.merchant = merchant._id;
        }

        const product = await Product.create(productData);

        // Increment merchant product count if merchant exists
        if (merchant) {
            await Merchant.findByIdAndUpdate(merchant._id, {
                $inc: { totalProducts: 1 },
            });
        }

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Build filter
        const filter = { isActive: true, isApproved: true };

        if (req.query.category) filter.category = req.query.category;
        if (req.query.merchant) filter.merchant = req.query.merchant;
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

        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate('merchant', 'businessName slug logo')
                .skip(skip)
                .limit(limit)
                .sort(sort),
            Product.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            products,
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
            .populate('merchant', 'businessName slug logo businessPhone verificationStatus')
            .populate('halalCertification');

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found',
            });
        }

        res.status(200).json({
            success: true,
            product,
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

        // Verify ownership
        const merchant = await Merchant.findOne({ user: req.user._id });
        if (!merchant || product.merchant.toString() !== merchant._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own products',
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
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
        if (req.user.role !== 'admin') {
            const merchant = await Merchant.findOne({ user: req.user._id });
            if (!merchant || product.merchant.toString() !== merchant._id.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'You can only delete your own products',
                });
            }
        }

        await Product.findByIdAndDelete(req.params.id);

        // Decrement merchant product count
        await Merchant.findByIdAndUpdate(product.merchant, {
            $inc: { totalProducts: -1 },
        });

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
        const page = parseInt(pageStr) || 1;
        const limit = parseInt(limitStr) || 20;
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
        };
        if (category) filter.category = category;

        const [products, total] = await Promise.all([
            Product.find(filter, { score: { $meta: 'textScore' } })
                .populate('merchant', 'businessName slug logo')
                .sort({ score: { $meta: 'textScore' } })
                .skip(skip)
                .limit(limit),
            Product.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: products.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            products,
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
