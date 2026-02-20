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

        const filter = { merchant: req.params.id, isActive: true };

        const [products, total] = await Promise.all([
            Product.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
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
