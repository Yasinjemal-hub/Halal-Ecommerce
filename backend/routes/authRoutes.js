import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
    register,
    login,
    logout,
    verifyEmail,
    forgotPassword,
    resetPassword,
    refreshToken,
} from '../controllers/authController.js';

const router = Router();

// Rate limiter for auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: { success: false, message: 'Too many requests from this IP, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── Register ────────────────────────────────────────────
router.post(
    '/register',
    authLimiter,
    [
        body('firstName').trim().notEmpty().withMessage('First name is required'),
        body('lastName').trim().notEmpty().withMessage('Last name is required'),
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters'),
        body('phone')
            .optional()
            .matches(/^(?:\+251|0)([79]\d{8})$/)
            .withMessage('Please provide a valid Ethiopian phone number (format: +251912345678 or 0912345678)'),
    ],
    validate,
    register
);

// ── Login ───────────────────────────────────────────────
router.post(
    '/login',
    authLimiter,
    [
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    validate,
    login
);

// ── Logout ──────────────────────────────────────────────
router.post('/logout', protect, logout);

// ── Verify Email ────────────────────────────────────────
router.get('/verify-email/:token', verifyEmail);

// ── Forgot Password ─────────────────────────────────────
router.post(
    '/forgot-password',
    authLimiter,
    [body('email').isEmail().withMessage('Please provide a valid email')],
    validate,
    forgotPassword
);

// ── Reset Password ──────────────────────────────────────
router.put(
    '/reset-password/:token',
    [
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters'),
    ],
    validate,
    resetPassword
);

// ── Refresh Token ───────────────────────────────────────
router.post('/refresh-token', refreshToken);

export default router;
