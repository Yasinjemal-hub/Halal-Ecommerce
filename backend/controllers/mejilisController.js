import Mejilis from '../models/Mejilis.js';
import Merchant from '../models/Merchant.js';
import Certification from '../models/Certification.js';
import User from '../models/User.js';

// ════════════════════════════════════════════════════════════
//  MEJILIS (COUNCIL) MANAGEMENT
// ════════════════════════════════════════════════════════════

/**
 * @desc    Get or create the Mejilis council
 * @route   GET /api/mejilis
 * @access  Public
 */
export const getMejilis = async (req, res, next) => {
    try {
        let mejilis = await Mejilis.findOne({ isActive: true })
            .populate('members.user', 'firstName lastName email role avatar')
            .populate('sessions.attendees.user', 'firstName lastName')
            .populate('sessions.agenda.merchant', 'businessName verificationStatus');

        if (!mejilis) {
            // Auto-create a default Mejilis if none exists
            mejilis = await Mejilis.create({
                name: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
                region: 'National',
            });
        }

        res.status(200).json({
            success: true,
            mejilis,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get Mejilis dashboard stats
 * @route   GET /api/mejilis/dashboard
 * @access  Admin
 */
export const getMejilisDashboard = async (req, res, next) => {
    try {
        const [
            totalMerchants,
            pendingMerchants,
            approvedMerchants,
            rejectedMerchants,
            suspendedMerchants,
            totalCertifications,
            pendingCertifications,
            approvedCertifications,
        ] = await Promise.all([
            Merchant.countDocuments(),
            Merchant.countDocuments({ verificationStatus: 'pending' }),
            Merchant.countDocuments({ verificationStatus: 'approved' }),
            Merchant.countDocuments({ verificationStatus: 'rejected' }),
            Merchant.countDocuments({ verificationStatus: 'suspended' }),
            Certification.countDocuments(),
            Certification.countDocuments({ status: 'pending' }),
            Certification.countDocuments({ status: 'approved' }),
        ]);

        const mejilis = await Mejilis.findOne({ isActive: true });

        const recentMerchants = await Merchant.find()
            .populate('user', 'firstName lastName email')
            .sort({ createdAt: -1 })
            .limit(10);

        const pendingMerchantsList = await Merchant.find({ verificationStatus: 'pending' })
            .populate('user', 'firstName lastName email phone')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            stats: {
                totalMerchants,
                pendingMerchants,
                approvedMerchants,
                rejectedMerchants,
                suspendedMerchants,
                totalCertifications,
                pendingCertifications,
                approvedCertifications,
                totalComplaints: mejilis?.complaints?.length || 0,
                totalSessions: mejilis?.sessions?.length || 0,
            },
            recentMerchants,
            pendingMerchantsList,
        });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════════════
//  MERCHANT VERIFICATION BY MEJILIS
// ════════════════════════════════════════════════════════════

/**
 * @desc    Review and verify a merchant (approve/reject/suspend)
 * @route   PUT /api/mejilis/merchants/:id/verify
 * @access  Admin
 */
export const verifyMerchantByMejilis = async (req, res, next) => {
    try {
        const { verificationStatus, verificationNotes } = req.body;

        const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'suspended'];
        if (!validStatuses.includes(verificationStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        const updateData = {
            verificationStatus,
            verificationNotes,
            verifiedBy: req.user._id,
        };

        if (verificationStatus === 'approved') {
            updateData.verifiedAt = new Date();
        }

        const merchant = await Merchant.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        }).populate('user', 'firstName lastName email phone');

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
        }

        // --- Auto-Issue Halal Certification if Approved ---
        if (verificationStatus === 'approved') {
            let cert = await Certification.findOne({ merchant: merchant._id });
            if (!cert) {
                // Issue a new certification for 1 year
                const expiryDate = new Date();
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);

                cert = await Certification.create({
                    merchant: merchant._id,
                    certificateType: 'halal_establishment',
                    status: 'approved',
                    issueDate: new Date(),
                    expiryDate: expiryDate,
                    reviewedBy: req.user._id,
                    reviewedAt: new Date()
                });
                merchant.halalCertification = cert._id;
                await merchant.save();
            } else if (cert.status !== 'approved') {
                cert.status = 'approved';
                cert.issueDate = new Date();
                const expiryDate = new Date();
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                cert.expiryDate = expiryDate;
                await cert.save();
            }
        }

        // Update Mejilis stats
        const mejilis = await Mejilis.findOne({ isActive: true });
        if (mejilis) {
            mejilis.totalMerchantsReviewed += 1;
            await mejilis.save();
        }

        res.status(200).json({
            success: true,
            message: `Merchant verification status updated to '${verificationStatus}'`,
            merchant,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all merchants with verification details
 * @route   GET /api/mejilis/merchants
 * @access  Admin
 */
export const getMejilisMerchants = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.verificationStatus) {
            filter.verificationStatus = req.query.verificationStatus;
        }
        if (req.query.businessType) {
            filter.businessType = req.query.businessType;
        }
        if (req.query.search) {
            filter.businessName = { $regex: req.query.search, $options: 'i' };
        }

        const [merchants, total] = await Promise.all([
            Merchant.find(filter)
                .populate('user', 'firstName lastName email phone avatar')
                .populate('halalCertification')
                .populate('verifiedBy', 'firstName lastName')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
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

// ════════════════════════════════════════════════════════════
//  CERTIFICATION MANAGEMENT
// ════════════════════════════════════════════════════════════

/**
 * @desc    Review a halal certification application
 * @route   PUT /api/mejilis/certifications/:id/review
 * @access  Admin
 */
export const reviewCertification = async (req, res, next) => {
    try {
        const { status, reviewNotes, rejectionReason, expiryDate } = req.body;

        const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'revoked', 'suspended'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        const updateData = {
            status,
            reviewNotes,
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
        };

        if (status === 'rejected') {
            updateData.rejectionReason = rejectionReason;
        }

        if (status === 'approved' && expiryDate) {
            updateData.expiryDate = new Date(expiryDate);
        }

        const certification = await Certification.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        }).populate('merchant', 'businessName businessPhone');

        if (!certification) {
            return res.status(404).json({
                success: false,
                message: 'Certification not found',
            });
        }

        // Update Mejilis stats
        if (status === 'approved') {
            const mejilis = await Mejilis.findOne({ isActive: true });
            if (mejilis) {
                mejilis.totalCertificationsIssued += 1;
                await mejilis.save();
            }
        }

        res.status(200).json({
            success: true,
            message: `Certification status updated to '${status}'`,
            certification,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all certifications
 * @route   GET /api/mejilis/certifications
 * @access  Admin
 */
export const getAllCertifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.certificateType) filter.certificateType = req.query.certificateType;

        const [certifications, total] = await Promise.all([
            Certification.find(filter)
                .populate('merchant', 'businessName businessType businessPhone')
                .populate('reviewedBy', 'firstName lastName')
                .skip(skip)
                .limit(limit)
                .sort({ applicationDate: -1 }),
            Certification.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: certifications.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            certifications,
        });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════════════
//  COMPLAINTS (CONSUMER REPORTS)
// ════════════════════════════════════════════════════════════

/**
 * @desc    File a complaint (consumer)
 * @route   POST /api/mejilis/complaints
 * @access  Private (authenticated user)
 */
export const fileComplaint = async (req, res, next) => {
    try {
        const { merchantId, category, subject, description, evidence = [] } = req.body;

        // Verify merchant exists
        const merchant = await Merchant.findById(merchantId);
        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
        }

        let mejilis = await Mejilis.findOne({ isActive: true });
        if (!mejilis) {
            mejilis = await Mejilis.create({
                name: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
                region: 'National',
            });
        }

        const complaint = {
            complainant: req.user._id,
            merchant: merchantId,
            category,
            subject,
            description,
            evidence,
            status: 'submitted',
            priority: category === 'halal_violation' ? 'critical' : 'medium',
        };

        mejilis.complaints.push(complaint);
        await mejilis.save();

        const newComplaint = mejilis.complaints[mejilis.complaints.length - 1];

        res.status(201).json({
            success: true,
            message: 'Complaint filed successfully',
            complaint: newComplaint,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all complaints
 * @route   GET /api/mejilis/complaints
 * @access  Admin
 */
export const getComplaints = async (req, res, next) => {
    try {
        const mejilis = await Mejilis.findOne({ isActive: true })
            .populate('complaints.complainant', 'firstName lastName email')
            .populate('complaints.merchant', 'businessName businessType')
            .populate('complaints.assignedTo', 'firstName lastName');

        if (!mejilis) {
            return res.status(200).json({
                success: true,
                complaints: [],
            });
        }

        let complaints = mejilis.complaints;

        // Filter by status
        if (req.query.status) {
            complaints = complaints.filter((c) => c.status === req.query.status);
        }

        // Sort by date (newest first)
        complaints.sort((a, b) => b.createdAt - a.createdAt);

        res.status(200).json({
            success: true,
            count: complaints.length,
            complaints,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update complaint status
 * @route   PUT /api/mejilis/complaints/:complaintId
 * @access  Admin
 */
export const updateComplaint = async (req, res, next) => {
    try {
        const { status, action, outcome } = req.body;

        const mejilis = await Mejilis.findOne({ isActive: true });
        if (!mejilis) {
            return res.status(404).json({
                success: false,
                message: 'Mejilis not found',
            });
        }

        const complaint = mejilis.complaints.id(req.params.complaintId);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found',
            });
        }

        if (status) complaint.status = status;

        if (status === 'resolved') {
            complaint.resolution = {
                resolvedAt: new Date(),
                resolvedBy: req.user._id,
                action,
                outcome,
            };
            mejilis.totalComplaintsResolved += 1;
        }

        await mejilis.save();

        res.status(200).json({
            success: true,
            message: 'Complaint updated successfully',
            complaint,
        });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════════════
//  SESSIONS
// ════════════════════════════════════════════════════════════

/**
 * @desc    Create a new Mejilis session
 * @route   POST /api/mejilis/sessions
 * @access  Admin
 */
export const createSession = async (req, res, next) => {
    try {
        const { sessionTitle, sessionDate, agenda } = req.body;

        let mejilis = await Mejilis.findOne({ isActive: true });
        if (!mejilis) {
            mejilis = await Mejilis.create({
                name: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
                region: 'National',
            });
        }

        const session = {
            sessionTitle,
            sessionDate: new Date(sessionDate),
            agenda: agenda || [],
            createdBy: req.user._id,
            attendees: [{ user: req.user._id, role: 'chairperson' }],
        };

        mejilis.sessions.push(session);
        mejilis.totalSessionsHeld += 1;
        await mejilis.save();

        const newSession = mejilis.sessions[mejilis.sessions.length - 1];

        res.status(201).json({
            success: true,
            message: 'Session created successfully',
            session: newSession,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all sessions
 * @route   GET /api/mejilis/sessions
 * @access  Admin
 */
export const getSessions = async (req, res, next) => {
    try {
        const mejilis = await Mejilis.findOne({ isActive: true })
            .populate('sessions.attendees.user', 'firstName lastName')
            .populate('sessions.agenda.merchant', 'businessName')
            .populate('sessions.createdBy', 'firstName lastName');

        if (!mejilis) {
            return res.status(200).json({
                success: true,
                sessions: [],
            });
        }

        const sessions = [...mejilis.sessions].sort(
            (a, b) => new Date(b.sessionDate) - new Date(a.sessionDate)
        );

        res.status(200).json({
            success: true,
            count: sessions.length,
            sessions,
        });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════════════
//  MERCHANT REGISTRATION (FOR MERCHANTS)
// ════════════════════════════════════════════════════════════

/**
 * @desc    Register as a merchant (self-service)
 * @route   POST /api/mejilis/register-merchant
 * @access  Private (authenticated user)
 */
export const registerAsMerchant = async (req, res, next) => {
    try {
        // Check if user already has a merchant profile
        const existing = await Merchant.findOne({ user: req.user._id });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'You already have a merchant profile',
                merchant: existing,
            });
        }

        const {
            businessName,
            businessNameAmharic,
            description,
            businessType,
            businessPhone,
            businessEmail,
            businessAddress,
            governmentLicense,
            nationalId,
            paymentInfo,
            socialMedia,
            operatingHours,
        } = req.body;

        const merchant = await Merchant.create({
            user: req.user._id,
            businessName,
            businessNameAmharic,
            description,
            businessType,
            businessPhone,
            businessEmail,
            businessAddress,
            governmentLicense,
            nationalId,
            paymentInfo,
            socialMedia,
            operatingHours,
            verificationStatus: 'pending',
        });

        // Update user role to merchant
        await User.findByIdAndUpdate(req.user._id, { role: 'merchant' });

        res.status(201).json({
            success: true,
            message: 'Merchant registration submitted! Your profile is pending Mejilis verification.',
            merchant,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get merchant registration status
 * @route   GET /api/mejilis/registration-status
 * @access  Private
 */
export const getRegistrationStatus = async (req, res, next) => {
    try {
        const merchant = await Merchant.findOne({ user: req.user._id })
            .populate('halalCertification')
            .populate('verifiedBy', 'firstName lastName');

        if (!merchant) {
            return res.status(200).json({
                success: true,
                isRegistered: false,
                message: 'You have not registered as a merchant yet',
            });
        }

        res.status(200).json({
            success: true,
            isRegistered: true,
            merchant,
        });
    } catch (error) {
        next(error);
    }
};
