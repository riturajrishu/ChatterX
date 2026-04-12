const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/authMiddleware');
const { requireAdmin } = require('../middlewares/adminMiddleware');
const {
  getDashboardStats,
  getAllUsers,
  getUserById,
  deleteUser,
  resetUserPassword,
  updateUserRole,
} = require('../controllers/adminController');

// All admin routes require authentication + admin role
router.use(protect, requireAdmin);

router.get('/stats', getDashboardStats);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/reset-password', resetUserPassword);
router.put('/users/:id/role', updateUserRole);

module.exports = router;
