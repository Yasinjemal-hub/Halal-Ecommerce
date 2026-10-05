import mongoose from 'mongoose';
import Mejilis from '../models/Mejilis.js';
import Merchant from '../models/Merchant.js';
import Certification from '../models/Certification.js';
import User from '../models/User.js';
import { safeMerchantResponse, safeCertificationResponse, safeMejilisResponse } from '../utils/safeResponse.js';
import { generateCertificatePdf } from '../utils/certificatePdf.js';
import {
    isCertificateIssued,
} from '../utils/certificationWorkflow.js';
import {
    decideMerchantVerification,
    VerificationValidationError,
} from '../utils/merchantVerification.js';

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
            .populate('members.user', 'firstName lastName role avatar')
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
            mejilis: safeMejilisResponse.public(mejilis),
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
            recentMerchants: recentMerchants.map((m) => safeMerchantResponse.adminList(m)),
            pendingMerchantsList: pendingMerchantsList.map((m) => safeMerchantResponse.adminList(m)),
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
 * @note    Single review decision (product rule): approving the business
 *          also approves it as halal certified and issues the certificate
 *          automatically. No certificate type/ID input, no second form,
 *          no second decision. Legacy `certification` payloads are ignored.
 */
export const verifyMerchantByMejilis = async (req, res, next) => {
    try {
        const { verificationStatus, verificationNotes, rejectionReason } = req.body;

        // Single decision: business approval also issues the certificate.
        const merchant = await decideMerchantVerification(req.params.id, {
            verificationStatus,
            verificationNotes,
            rejectionReason,
            reviewerId: req.user._id,
        });
        const populated = await Merchant.findById(merchant._id).populate('halalCertification');
        const certificationDoc = populated?.halalCertification && typeof populated.halalCertification === 'object'
            ? populated.halalCertification
            : null;

        // Update Mejilis stats
        const mejilis = await Mejilis.findOne({ isActive: true });
        if (mejilis) {
            mejilis.totalMerchantsReviewed += 1;
            await mejilis.save();
        }

        res.status(200).json({
            success: true,
            message: verificationStatus === 'approved'
                ? `Merchant '${populated.businessName}' approved and halal certified (certificate ${certificationDoc?.certificateNumber || 'issued'}).`
                : `Merchant verification status updated to '${verificationStatus}'`,
            merchant: safeMerchantResponse.admin(populated),
            certification: certificationDoc ? safeCertificationResponse.admin(certificationDoc) : null,
        });
    } catch (error) {
        if (error instanceof VerificationValidationError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        if (error.statusCode === 404 || error.statusCode === 403) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
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
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
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
                .populate('halalCertification', 'certificateNumber issuingAuthority certificateType status issueDate expiryDate scope coveredProducts')
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
            // List view excludes identity/business documents (see safeResponse).
            merchants: merchants.map((m) => safeMerchantResponse.adminList(m)),
        });
    } catch (error) {
        next(error);
    }
};

// ════════════════════════════════════════════════════════════
//  CERTIFICATION MANAGEMENT
// ════════════════════════════════════════════════════════════

/**
 * @desc    Review a halal certification application (RETIRED)
 * @route   PUT /api/mejilis/certifications/:id/review
 * @access  Admin
 * @note    Retired under the one-approval product rule: business approval
 *          issues the certificate automatically. Kept as HTTP 410 so old
 *          clients get an explicit signal instead of a silent break.
 */
export const reviewCertification = async (req, res) => {
    return res.status(410).json({
        success: false,
        message: 'Separate halal certification review is retired. Approving the merchant business application issues the halal certificate automatically — no second decision is needed.',
    });
};

/**
 * @desc    Get all certifications
 * @route   GET /api/mejilis/certifications
 * @access  Admin
 */
export const getAllCertifications = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.status) {
            const valid = ['pending', 'under_review', 'approved', 'rejected', 'expired', 'revoked', 'suspended'];
            const requested = String(req.query.status).split(',').map((s) => s.trim()).filter(Boolean);
            const invalid = requested.filter((s) => !valid.includes(s));
            if (invalid.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid certification status: ${invalid.join(', ')}.`,
                });
            }
            filter.status = requested.length === 1 ? requested[0] : { $in: requested };
        }
        if (req.query.certificateType) filter.certificateType = req.query.certificateType;
        if (req.query.from || req.query.to) {
            filter.applicationDate = {};
            if (req.query.from) filter.applicationDate.$gte = new Date(req.query.from);
            if (req.query.to) filter.applicationDate.$lte = new Date(req.query.to);
        }
        if (req.query.search) {
            const q = req.query.search.trim();
            const nameMatches = await Merchant.find(
                { businessName: { $regex: q, $options: 'i' } },
                { _id: 1 }
            );
            filter.$or = [
                { certificateNumber: { $regex: q, $options: 'i' } },
                { merchant: { $in: nameMatches.map((m) => m._id) } },
            ];
        }

        let sort = { applicationDate: -1 };
        if (req.query.sort === 'oldest') sort = { applicationDate: 1 };
        if (req.query.sort === 'expiry') sort = { expiryDate: 1 };

        const [certifications, total, statusCounts] = await Promise.all([
            Certification.find(filter)
                .select('+reviewNotes +rejectionReason +revocationReason')
                .populate('merchant', 'businessName businessType businessPhone verificationStatus')
                .populate('reviewedBy', 'firstName lastName')
                .skip(skip)
                .limit(limit)
                .sort(sort),
            Certification.countDocuments(filter),
            Certification.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
        ]);

        const counts = { pending: 0, under_review: 0, approved: 0, rejected: 0, expired: 0, revoked: 0, suspended: 0 };
        for (const row of statusCounts) {
            if (row._id in counts) counts[row._id] = row.count;
        }

        res.status(200).json({
            success: true,
            count: certifications.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            statusCounts: counts,
            // List payloads use the admin sanitizer (no change here), but
            // note supporting documents stay out of bulk rows below.
            certifications: certifications.map((c) => {
                const obj = safeCertificationResponse.admin(c);
                if (Array.isArray(obj.documents)) {
                    obj.documents = obj.documents.map((d) => ({
                        name: d.name,
                        documentType: d.documentType,
                        uploadedAt: d.uploadedAt,
                        _id: d._id,
                    }));
                }
                return obj;
            }),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a single certification application (review detail)
 * @route   GET /api/mejilis/certifications/:id
 * @access  Admin
 * @note    The only admin surface that returns full supporting documents
 *          and inspection/compliance history for review.
 */
export const getCertificationById = async (req, res, next) => {
    try {
        const cert = await Certification.findById(req.params.id)
            .select('+reviewNotes +rejectionReason +revocationReason')
            .populate('merchant', 'businessName businessType businessPhone businessEmail businessAddress verificationStatus isActive user')
            .populate({ path: 'merchant', populate: { path: 'user', select: 'firstName lastName email phone' } })
            .populate('reviewedBy', 'firstName lastName')
            .populate('statusHistory.changedBy', 'firstName lastName');

        if (!cert) {
            return res.status(404).json({
                success: false,
                message: 'Certification not found',
            });
        }

        res.status(200).json({
            success: true,
            certification: safeCertificationResponse.admin(cert),
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
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const fileComplaint = async (req, res, next) => {
    try {
        const { merchantIdentifier, category, subject, description, evidence = [] } = req.body;
        const identifier = (merchantIdentifier || '').trim();

        if (!identifier) {
            return res.status(400).json({
                success: false,
                message: 'Merchant email or business name is required',
            });
        }

        let merchant = null;
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            merchant = await Merchant.findById(identifier);
        }

        if (!merchant && identifier.includes('@')) {
            merchant = await Merchant.findOne({ businessEmail: identifier.toLowerCase() });
        }

        if (!merchant) {
            merchant = await Merchant.findOne({
                businessName: new RegExp(`^${escapeRegex(identifier)}$`, 'i'),
            });
        }

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found. Please use the merchant email or exact business name.',
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
            merchant: merchant._id,
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
            .populate('complaints.complainant', 'firstName lastName')
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
        // Check if user already has a merchant profile (in-place updates
        // go through PUT /api/mejilis/registration — never a second profile)
        const existing = await Merchant.findOne({ user: req.user._id });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'You already have a merchant profile. Update your existing application instead of submitting a new one.',
                merchant: existing,
            });
        }

        // Friendly duplicate guard (the unique slug index is the final backstop)
        if (req.body.businessName) {
            const nameTaken = await Merchant.findOne({
                businessName: new RegExp(`^${escapeRegex(req.body.businessName.trim())}$`, 'i'),
            });
            if (nameTaken) {
                return res.status(400).json({
                    success: false,
                    message: 'A merchant with this business name already exists. Please choose a different name.',
                });
            }
        }

        if (req.user.role !== 'merchant') {
            return res.status(403).json({
                success: false,
                message: 'Consumer accounts cannot submit merchant registration from this form. Please use a merchant account.',
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
            applicationNotes,
            // Retired: separate certification evidence is no longer part of
            // the single business registration form. Any legacy
            // `certification` payload is ignored — approval issues the
            // certificate automatically with system-generated details.
        } = req.body;

        const session = await mongoose.startSession();
        session.startTransaction();
        let merchant;
        try {
            merchant = (await Merchant.create(
                [{
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
                    applicationNotes,
                    verificationStatus: 'pending',
                }],
                { session }
            ))[0];

            // Update user role to merchant
            await User.findByIdAndUpdate(req.user._id, { role: 'merchant' }, { session });

            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

        res.status(201).json({
            success: true,
            message: 'Merchant registration submitted! Once Majlis approves your business, you can sell and your halal certificate is issued automatically.',
            merchant: safeMerchantResponse.owner(merchant),
            certification: null,
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
        // Status + certificate metadata only. Identity document bodies
        // (governmentLicense/nationalId data URLs, often megabytes) and
        // certification evidence are NEVER needed to render the status
        // page — they stay server-side. This keeps the status check to a
        // few KB instead of megabytes.
        const merchant = await Merchant.findOne({ user: req.user._id })
            // Owner sees public certificate facts plus the merchant-facing
            // decision messages (review notes / reasons). Evidence
            // documents and other heavy/internal material are excluded.
            .populate('halalCertification', 'certificateNumber issuingAuthority certificateType status applicationDate issueDate expiryDate scope coveredProducts +reviewNotes +rejectionReason +revocationReason')
            .populate('verifiedBy', 'firstName lastName');

        if (!merchant) {
            return res.status(200).json({
                success: true,
                isRegistered: false,
                message: 'You have not registered as a merchant yet',
            });
        }

        // Document bodies (base64 data URLs, often megabytes) are never
        // sent to the status page — only whether each was submitted.
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
            isRegistered: true,
            merchant: obj,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update / resubmit own merchant application
 * @route   PUT /api/mejilis/registration
 * @access  Private (owner with an existing application)
 * @policy  Single business application only. Rejected applications may be
 *          corrected and resubmitted (status returns to 'pending').
 *          Pending / under-review applications may be edited in place.
 *          Approved applications are locked here (manage the live store via
 *          PUT /api/merchants/:id). Suspended applications cannot be edited
 *          here. No separate certification evidence is accepted — approval
 *          issues the certificate automatically.
 */
export const updateRegistration = async (req, res, next) => {
    try {
        const merchant = await Merchant.findOne({ user: req.user._id });

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'No merchant application found. Submit an application first.',
            });
        }

        const allowedFields = [
            'businessName',
            'businessNameAmharic',
            'description',
            'businessType',
            'businessPhone',
            'businessEmail',
            'businessAddress',
            'governmentLicense',
            'nationalId',
            'paymentInfo',
            'socialMedia',
            'operatingHours',
            'applicationNotes',
        ];

        const isApproved = merchant.verificationStatus === 'approved';
        const isSuspended = merchant.verificationStatus === 'suspended';

        if (isSuspended) {
            return res.status(403).json({
                success: false,
                message: `Applications with status 'suspended' cannot be edited here. Please contact support.`,
            });
        }

        if (isApproved) {
            return res.status(403).json({
                success: false,
                message: `Approved applications cannot be edited here. Manage your live store via your merchant profile, or contact support.`,
            });
        }
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                merchant[field] = req.body[field];
            }
        }

        const wasRejected = merchant.verificationStatus === 'rejected';
        if (wasRejected) {
            // Resubmission: fresh review cycle, stale decision cleared.
            merchant.verificationStatus = 'pending';
            merchant.rejectionReason = undefined;
            merchant.verificationNotes = undefined;
            merchant.verifiedAt = undefined;
            merchant.verifiedBy = undefined;
        }

        await merchant.save();

        res.status(200).json({
            success: true,
            message: wasRejected
                ? 'Application resubmitted! Your profile is pending Mejilis verification.'
                : 'Application updated.',
            merchant: safeMerchantResponse.owner(merchant),
            certification: null,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Shared eligibility check lives in utils/certificationWorkflow.js so the
 * review endpoint, PDF download, public verification, and merchant status
 * all apply one identical issuance rule. Re-exported here to preserve the
 * existing import surface.
 */
export { isCertificateIssued, isMerchantHalalVerified } from '../utils/certificationWorkflow.js';

const certificateVerificationUrl = (certificateNumber) => {
    const base = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/verify-certificate/${certificateNumber}`;
};

/**
 * @desc    Download own issued halal certificate as PDF
 * @route   GET /api/mejilis/certificate/pdf
 * @access  Private (owner of an issued certificate)
 * @note    Generated server-side from verified database records — never
 *          from client-supplied values. Contains public certificate facts
 *          only; no identity documents or reviewer notes.
 */
export const downloadCertificatePdf = async (req, res, next) => {
    try {
        const merchant = await Merchant.findOne({ user: req.user._id })
            .populate('halalCertification');

        if (!merchant?.halalCertification) {
            return res.status(404).json({
                success: false,
                message: 'No halal certificate has been issued for your business yet. It is issued automatically once Majlis approves your business application.',
            });
        }

        const cert = merchant.halalCertification;
        if (!isCertificateIssued(cert, merchant)) {
            const status = merchant.verificationStatus !== 'approved'
                ? `business status: ${merchant.verificationStatus}`
                : `certificate status: ${cert.status}`;
            return res.status(403).json({
                success: false,
                message: `Certificate ${cert.certificateNumber || ''} is not currently valid (${status}).`,
            });
        }

        const pdf = await generateCertificatePdf({
            certificate: cert.toObject ? cert.toObject() : cert,
            businessName: merchant.businessName,
            verificationUrl: certificateVerificationUrl(cert.certificateNumber),
        });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="halal-certificate-${cert.certificateNumber}.pdf"`
        );
        res.send(pdf);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Publicly verify a certificate by its number
 * @route   GET /api/mejilis/certifications/verify/:certificateNumber
 * @access  Public
 * @note    Returns public certificate facts only — no documents, no
 *          reviewer notes, no merchant contact details.
 */
export const verifyCertificatePublic = async (req, res, next) => {
    try {
        const cert = await Certification.findOne({
            certificateNumber: req.params.certificateNumber,
        }).populate('merchant', 'businessName businessType slug verificationStatus');

        if (!cert) {
            return res.status(404).json({
                success: false,
                message: 'Certificate not found. Check the certificate number and try again.',
            });
        }

        res.status(200).json({
            success: true,
            certificate: {
                ...safeCertificationResponse.public(cert),
                businessName: cert.merchant?.businessName,
                issued: isCertificateIssued(cert, cert.merchant),
                verificationUrl: certificateVerificationUrl(cert.certificateNumber),
            },
        });
    } catch (error) {
        next(error);
    }
};
