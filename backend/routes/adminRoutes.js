import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import {
    getAllUsers,
    getPendingProfileUpdates,
    approveUserProfileUpdate,
    updateUserRole,
    toggleUserStatus,
    getDashboardStats,
    getAllMerchants,
    verifyMerchant,
} from '../controllers/adminController.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

// ── Dashboard ───────────────────────────────────────────
router.get('/dashboard', getDashboardStats);

// ── Users ───────────────────────────────────────────────
router.get('/users', getAllUsers);
router.get('/users/pending-updates', getPendingProfileUpdates);
router.put('/users/:id/profile-approval', approveUserProfileUpdate);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', toggleUserStatus);

// ── Merchants ───────────────────────────────────────────
router.get('/merchants', getAllMerchants);
router.put('/merchants/:id/verify', verifyMerchant);

export default router;
