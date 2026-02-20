import { Router } from 'express';
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

// ── Register ────────────────────────────────────────────
router.post(
    '/register',
    [
        body('firstName').trim().notEmpty().withMessage('First name is required'),
        body('lastName').trim().notEmpty().withMessage('Last name is required'),
        body('email').isEmail().withMessage('Please provide a valid email'),
        body('password')
            .isLength({ min: 8 })
            .withMessage('Password must be at least 8 characters'),
        body('phone')
            .optional()
            .matches(/^(\+251|0)(9|7)\d{8}$/)
            .withMessage('Please provide a valid Ethiopian phone number'),
    ],
    validate,
    register
);

// ── Login ───────────────────────────────────────────────
router.post(
    '/login',
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
