import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
    getProfile,
    updateProfile,
    updatePassword,
    deleteAccount,
} from '../controllers/userController.js';

const router = Router();

// All user routes require authentication
router.use(protect);

// ── Get Profile ─────────────────────────────────────────
router.get('/profile', getProfile);

// ── Update Profile ──────────────────────────────────────
router.put(
    '/profile',
    [
        body('firstName')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('First name cannot exceed 50 characters'),
        body('lastName')
            .optional()
            .trim()
            .isLength({ max: 50 })
            .withMessage('Last name cannot exceed 50 characters'),
        body('phone')
            .optional()
            .matches(/^(\+251|0)(9|7)\d{8}$/)
            .withMessage('Please provide a valid Ethiopian phone number'),
        body('preferredLanguage')
            .optional()
            .isIn(['en', 'am', 'om', 'so'])
            .withMessage('Invalid language'),
    ],
    validate,
    updateProfile
);

// ── Update Password ─────────────────────────────────────
router.put(
    '/password',
    [
        body('currentPassword').notEmpty().withMessage('Current password is required'),
        body('newPassword')
            .isLength({ min: 8 })
            .withMessage('New password must be at least 8 characters'),
    ],
    validate,
    updatePassword
);

// ── Delete (Deactivate) Account ─────────────────────────
router.delete('/account', deleteAccount);

export default router;
