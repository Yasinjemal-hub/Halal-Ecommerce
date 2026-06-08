import Merchant from '../models/Merchant.js';
import Product from '../models/Product.js';
import Certification from '../models/Certification.js';

/**
 * @desc    Create a merchant profile
 * @route   POST /api/merchants
 * @access  Private (authenticated user)
 */
export const createMerchant = async (req, res, next) => {
    try {
        // Check if user already has a merchant profile
        const existing = await Merchant.findOne({ user: req.user._id });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'You already have a merchant profile',
            });
        }

        const merchantData = {
            ...req.body,
            user: req.user._id,
        };

        const merchant = await Merchant.create(merchantData);

        res.status(201).json({
            success: true,
            merchant,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get merchant profile by ID
 * @route   GET /api/merchants/:id
 * @access  Public
 */
export const getMerchant = async (req, res, next) => {
    try {
        const merchant = await Merchant.findById(req.params.id)
            .populate('user', 'firstName lastName email avatar')
            .populate('halalCertification');

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
        }

        res.status(200).json({
            success: true,
            merchant,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update merchant profile
 * @route   PUT /api/merchants/:id
 * @access  Merchant (owner)
 */
export const updateMerchant = async (req, res, next) => {
    try {
        const merchant = await Merchant.findById(req.params.id);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
        }

        // Verify ownership
        if (merchant.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only update your own merchant profile',
            });
        }

        const allowedFields = [
            'businessName',
            'businessNameAmharic',
            'description',
            'businessType',
            'logo',
            'banner',
            'businessAddress',
            'businessPhone',
            'businessEmail',
            'website',
            'operatingHours',
            'paymentInfo',
            'socialMedia',
        ];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        const updatedMerchant = await Merchant.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            success: true,
            merchant: updatedMerchant,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get merchant's products
 * @route   GET /api/merchants/:id/products
 * @access  Public
 */
export const getMerchantProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {
            merchant: req.params.id,
            isActive: true,
            isDeleted: { $ne: true },
        };

        if (req.query.category) filter.category = req.query.category;
        if (req.query.halalCertified) filter.halalCertified = req.query.halalCertified === 'true';
        if (req.query.minPrice || req.query.maxPrice) {
            filter.price = {};
            if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
            if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
        }
        if (req.query.search) {
            filter.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { nameAmharic: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } },
                { category: { $regex: req.query.search, $options: 'i' } },
            ];
        }

        let sort = { createdAt: -1 };
        if (req.query.sort === 'price_asc') sort = { price: 1 };
        if (req.query.sort === 'price_desc') sort = { price: -1 };
        if (req.query.sort === 'rating') sort = { ratingsAverage: -1 };
        if (req.query.sort === 'newest') sort = { createdAt: -1 };

        const [products, total] = await Promise.all([
            Product.find(filter).skip(skip).limit(limit).sort(sort),
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
 * @desc    Apply for halal certification
 * @route   POST /api/merchants/:id/certifications
 * @access  Merchant (owner)
 */
export const applyForCertification = async (req, res, next) => {
    try {
        const merchant = await Merchant.findById(req.params.id);

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
        }

        // Verify ownership
        if (merchant.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You can only apply for your own merchant certification',
            });
        }

        const certificationData = {
            merchant: merchant._id,
            certificateType: req.body.certificateType,
            scope: req.body.scope,
            coveredProducts: req.body.coveredProducts,
            documents: req.body.documents || [],
        };

        const certification = await Certification.create(certificationData);

        // Link certification to merchant
        merchant.halalCertification = certification._id;
        await merchant.save();

        res.status(201).json({
            success: true,
            message: 'Certification application submitted successfully',
            certification,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get my merchant profile (for logged-in merchant)
 * @route   GET /api/merchants/me
 * @access  Merchant
 */
export const getMyMerchantProfile = async (req, res, next) => {
    try {
        const merchant = await Merchant.findOne({ user: req.user._id })
            .populate('user', 'firstName lastName email phone avatar')
            .populate('halalCertification');

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'You do not have a merchant profile',
            });
        }

        res.status(200).json({
            success: true,
            merchant,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all merchants (public listing with filters)
 * @route   GET /api/merchants
 * @access  Public
 */
export const getAllMerchants = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = { isActive: true };

        if (req.query.verified === 'true') filter.verificationStatus = 'approved';
        if (req.query.businessType) filter.businessType = req.query.businessType;
        if (req.query.city) filter['businessAddress.city'] = req.query.city;
        if (req.query.region) filter['businessAddress.region'] = req.query.region;
        if (req.query.featured === 'true') filter.isFeatured = true;

        let sort = { createdAt: -1 };
        if (req.query.sort === 'rating') sort = { ratingsAverage: -1 };
        if (req.query.sort === 'name') sort = { businessName: 1 };
        if (req.query.sort === 'orders') sort = { totalOrders: -1 };

        const [merchants, total] = await Promise.all([
            Merchant.find(filter)
                .populate('user', 'firstName lastName avatar')
                .populate('halalCertification')
                .skip(skip)
                .limit(limit)
                .sort(sort),
            Merchant.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: merchants.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            merchants,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get featured merchants (for homepage)
 * @route   GET /api/merchants/featured
 * @access  Public
 */
export const getFeaturedMerchants = async (req, res, next) => {
    try {
        const limit = parseInt(req.query.limit) || 6;

        const merchants = await Merchant.find({
            isActive: true,
            verificationStatus: 'approved',
            isFeatured: true,
        })
            .populate('user', 'firstName lastName avatar')
            .sort({ ratingsAverage: -1 })
            .limit(limit);

        res.status(200).json({
            success: true,
            count: merchants.length,
            merchants,
        });
    } catch (error) {
        next(error);
    }
};
