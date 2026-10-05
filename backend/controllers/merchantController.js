import Merchant from '../models/Merchant.js';
import Product from '../models/Product.js';
import { safeMerchantResponse } from '../utils/safeResponse.js';

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
            .populate('user', 'firstName lastName avatar')
            .populate('halalCertification', 'certificateNumber issuingAuthority certificateType status issueDate expiryDate scope coveredProducts');

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
        }

        res.status(200).json({
            success: true,
            merchant: safeMerchantResponse.public(merchant),
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
            'applicationNotes',
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
            merchant: safeMerchantResponse.owner(updatedMerchant),
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
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;

        // Visibility: only approved merchants may see or manage products.
        // Admins retain full management access. A non-approved merchant's
        // records stay stored untouched and reappear on approval — but are
        // never exposed through this merchant dashboard API (nor publicly).
        const store = await Merchant.findById(req.params.id).select('_id user verificationStatus');
        const requesterId = req.user?._id?.toString();
        const isOwner = requesterId && store?.user?.toString() === requesterId;
        const isStaff = req.user && ['admin', 'superadmin'].includes(req.user.role);
        if (!store) {
            return res.status(404).json({ success: false, message: 'Merchant not found' });
        }
        if (!isOwner && !isStaff && store.verificationStatus !== 'approved') {
            return res.status(200).json({
                success: true,
                count: 0,
                total: 0,
                totalPages: 0,
                currentPage: page,
                products: [],
            });
        }
        if (isOwner && !isStaff && store.verificationStatus !== 'approved') {
            return res.status(403).json({
                success: false,
                message: 'Your merchant profile must be approved by Mejilis/Admin before managing products. Your existing products are preserved and will reappear on approval.',
            });
        }

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
 * @desc    Get my merchant profile (for logged-in merchant)
 * @route   GET /api/merchants/me
 * @access  Merchant
 */
export const getMyMerchantProfile = async (req, res, next) => {
    try {
        // Dashboard profile: metadata only. Identity document bodies and
        // certification evidence are megabytes of base64 and are never
        // rendered by the dashboard — only submission flags are returned.
        const merchant = await Merchant.findOne({ user: req.user._id })
            .populate('user', 'firstName lastName email phone avatar')
            .populate('halalCertification', 'certificateNumber issuingAuthority certificateType status applicationDate issueDate expiryDate scope coveredProducts +reviewNotes +rejectionReason +revocationReason');

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'You do not have a merchant profile',
            });
        }

        const obj = safeMerchantResponse.owner(merchant);
        obj.governmentLicenseSubmitted = Boolean(
            merchant.governmentLicense?.url || merchant.governmentLicense?.publicId
        );
        obj.nationalIdSubmitted = Boolean(
            merchant.nationalId?.url || merchant.nationalId?.publicId
        );
        if (obj.governmentLicense) delete obj.governmentLicense.url;
        if (obj.nationalId) delete obj.nationalId.url;

        res.status(200).json({
            success: true,
            merchant: obj,
        });
    } catch (error) {
        next(error);
    }
};

const PUBLIC_MERCHANT_BUSINESS_TYPES = [
    'restaurant',
    'grocery',
    'butcher',
    'bakery',
    'wholesale',
    'cosmetics',
    'clothing',
    'spice_shop',
    'supermarket',
    'other',
];
const PUBLIC_MERCHANT_SEARCH_MAX_LENGTH = 100;

const escapePublicRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get all merchants (public listing with filters)
 * @route   GET /api/merchants
 * @access  Public
 * @note    The public storefront only ever lists active, approved
 *          merchants — seeded demo stores and real stores alike come from
 *          this same database query. Non-approved or inactive records are
 *          never exposed here. Responses use the public safe shape (no
 *          identity/business documents, payment details, or review notes).
 */
export const getAllMerchants = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
        const skip = (page - 1) * limit;

        // Public visibility is fixed: active + approved only.
        const filter = { isActive: true, verificationStatus: 'approved' };

        if (req.query.verified !== undefined && req.query.verified !== 'true') {
            return res.status(400).json({
                success: false,
                message: "Invalid verified filter. The public listing only includes verified ('true') merchants.",
            });
        }
        if (req.query.businessType) {
            if (!PUBLIC_MERCHANT_BUSINESS_TYPES.includes(req.query.businessType)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid business type. Must be one of: ${PUBLIC_MERCHANT_BUSINESS_TYPES.join(', ')}.`,
                });
            }
            filter.businessType = req.query.businessType;
        }
        if (req.query.city) filter['businessAddress.city'] = req.query.city;
        if (req.query.region) filter['businessAddress.region'] = req.query.region;
        if (req.query.featured === 'true') filter.isFeatured = true;
        if (req.query.search !== undefined && String(req.query.search).trim() !== '') {
            const q = String(req.query.search).trim();
            if (q.length > PUBLIC_MERCHANT_SEARCH_MAX_LENGTH) {
                return res.status(400).json({
                    success: false,
                    message: `Search is too long. Maximum ${PUBLIC_MERCHANT_SEARCH_MAX_LENGTH} characters.`,
                });
            }
            const safe = escapePublicRegExp(q);
            filter.$or = [
                { businessName: { $regex: safe, $options: 'i' } },
                { businessNameAmharic: { $regex: safe, $options: 'i' } },
                { description: { $regex: safe, $options: 'i' } },
            ];
        }

        let sort = { createdAt: -1 };
        if (req.query.sort === 'rating') sort = { ratingsAverage: -1 };
        if (req.query.sort === 'name') sort = { businessName: 1 };
        if (req.query.sort === 'orders') sort = { totalOrders: -1 };

        const [merchants, total] = await Promise.all([
            Merchant.find(filter)
                .populate('user', 'firstName lastName avatar')
                .populate('halalCertification', 'certificateNumber issuingAuthority certificateType status issueDate expiryDate scope coveredProducts')
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
            merchants: merchants.map((m) => safeMerchantResponse.public(m)),
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
            .populate('halalCertification', 'certificateNumber issuingAuthority certificateType status issueDate expiryDate scope coveredProducts')
            .sort({ ratingsAverage: -1 })
            .limit(limit);

        res.status(200).json({
            success: true,
            count: merchants.length,
            merchants: merchants.map((m) => safeMerchantResponse.public(m)),
        });
    } catch (error) {
        next(error);
    }
};
