const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/admin/stats
 * @desc    الحصول على إحصائيات عامة (Dashboard)
 * @access  Admin
 */
router.get('/stats', requireAdmin, adminController.getStats);

/**
 * @route   GET /api/admin/users
 * @desc    الحصول على جميع المستخدمين
 * @access  Admin
 */
router.get('/users', requireAdmin, adminController.getAllUsers);

/**
 * @route   GET /api/admin/users/:userId
 * @desc    الحصول على تفاصيل مستخدم معين
 * @access  Admin
 */
router.get('/users/:userId', requireAdmin, adminController.getUserDetails);

/**
 * @route   PUT /api/admin/users/:userId/status
 * @desc    تحديث حالة مستخدم (تعليق/تفعيل)
 * @access  Admin
 */
router.put('/users/:userId/status', requireAdmin, adminController.updateUserStatus);

/**
 * @route   GET /api/admin/logs
 * @desc    الحصول على سجل حركات المشرفين
 * @access  Admin
 */
router.get('/logs', requireAdmin, adminController.getAdminLogs);

/**
 * @route   GET /api/admin/settings
 * @desc    الحصول على إعدادات النظام
 * @access  Admin
 */
router.get('/settings', requireAdmin, adminController.getSystemSettings);

/**
 * @route   PUT /api/admin/settings
 * @desc    تحديث إعدادات النظام
 * @access  Admin
 */
router.put('/settings', requireAdmin, adminController.updateSystemSettings);

/**
 * @route   POST /api/admin/backup
 * @desc    إنشاء نسخة احتياطية
 * @access  Admin
 */
router.post('/backup', requireAdmin, adminController.createBackup);

/**
 * @route   POST /api/admin/maintenance
 * @desc    وضع الصيانة
 * @access  Admin
 */
router.post('/maintenance', requireAdmin, adminController.setMaintenanceMode);

/**
 * @route   POST /api/admin/broadcast
 * @desc    إرسال إشعار لجميع المستخدمين
 * @access  Admin
 */
router.post('/broadcast', requireAdmin, adminController.broadcastToUsers);

module.exports = router;