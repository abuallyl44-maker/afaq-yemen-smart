/**
 * وحدة تحكم المشرفين (Admin Controller)
 * المسؤول عن: إدارة المستخدمين، الإعدادات العامة، السجلات، المحتوى
 */

const { User, Subscription, WhatsAppBot, TelegramBot, ClientWebsite, PaymentRequest, AdminLog, SystemSettings } = require('../models');
const { Op } = require('sequelize');
const { rebuildAllClientWebsites } = require('../services/websiteBuilderService');
const { sendTelegramNotification, sendEmailNotification } = require('../services/notificationService');
const { createBackup } = require('../services/backupService');

/**
 * الحصول على إحصائيات عامة (Dashboard)
 * GET /api/admin/stats
 */
exports.getStats = async (req, res) => {
    try {
        const totalUsers = await User.count({ where: { status: 'active' } });
        const totalBots = await WhatsAppBot.count() + await TelegramBot.count();
        const totalWebsites = await ClientWebsite.count();
        
        const activeSubscriptions = await Subscription.count({ where: { status: 'active' } });
        const pendingPayments = await PaymentRequest.count({ where: { status: 'pending' } });
        
        const totalRevenue = await PaymentRequest.sum('amount', { where: { status: 'confirmed' } });
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const monthlyRevenue = await PaymentRequest.sum('amount', {
            where: {
                status: 'confirmed',
                confirmed_at: { [Op.gte]: startOfMonth }
            }
        });
        
        const recentUsers = await User.findAll({
            where: { status: 'active' },
            order: [['created_at', 'DESC']],
            limit: 10,
            attributes: ['user_id', 'email', 'company_name', 'created_at', 'status']
        });
        
        const pendingPaymentsList = await PaymentRequest.findAll({
            where: { status: 'pending' },
            include: [{ model: User, as: 'user', attributes: ['email', 'company_name'] }],
            order: [['requested_at', 'ASC']],
            limit: 10
        });
        
        res.json({
            success: true,
            stats: {
                total_users: totalUsers,
                total_bots: totalBots,
                total_websites: totalWebsites,
                active_subscriptions: activeSubscriptions,
                pending_payments: pendingPayments,
                total_revenue: totalRevenue || 0,
                monthly_revenue: monthlyRevenue || 0
            },
            recent_users: recentUsers,
            pending_payments_list: pendingPaymentsList
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على جميع المستخدمين (للمشرفين)
 * GET /api/admin/users
 */
exports.getAllUsers = async (req, res) => {
    try {
        const { search, status, page = 1, limit = 50 } = req.query;
        
        const where = {};
        
        if (search) {
            where[Op.or] = [
                { email: { [Op.like]: `%${search}%` } },
                { company_name: { [Op.like]: `%${search}%` } }
            ];
        }
        
        if (status && status !== 'all') {
            where.status = status;
        }
        
        const offset = (page - 1) * limit;
        
        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: { exclude: ['password_hash', 'verification_code', 'code_expiry'] },
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });
        
        // إضافة إحصائيات لكل مستخدم
        const usersWithStats = await Promise.all(rows.map(async (user) => {
            const whatsappCount = await WhatsAppBot.count({ where: { user_id: user.user_id } });
            const telegramCount = await TelegramBot.count({ where: { user_id: user.user_id } });
            const websiteCount = await ClientWebsite.count({ where: { user_id: user.user_id } });
            const subscription = await Subscription.findOne({
                where: { user_id: user.user_id, status: 'active' },
                include: [{ model: SubscriptionPlan, as: 'plan' }]
            });
            
            return {
                ...user.toJSON(),
                stats: { whatsapp_bots: whatsappCount, telegram_bots: telegramCount, websites: websiteCount },
                subscription: subscription ? { plan_name: subscription.plan?.name, end_date: subscription.end_date } : null
            };
        }));
        
        res.json({
            success: true,
            users: usersWithStats,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على تفاصيل مستخدم معين (للمشرفين)
 * GET /api/admin/users/:userId
 */
exports.getUserDetails = async (req, res) => {
    try {
        const { userId } = req.params;
        
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['password_hash', 'verification_code', 'code_expiry'] }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        
        const whatsappBots = await WhatsAppBot.findAll({
            where: { user_id: userId },
            include: [{ model: WhatsAppSession, as: 'sessions' }]
        });
        
        const telegramBots = await TelegramBot.findAll({ where: { user_id: userId } });
        const websites = await ClientWebsite.findAll({ where: { user_id: userId } });
        const subscription = await Subscription.findOne({
            where: { user_id: userId, status: 'active' },
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });
        const payments = await PaymentRequest.findAll({
            where: { user_id: userId },
            order: [['requested_at', 'DESC']],
            limit: 20
        });
        
        res.json({
            success: true,
            user,
            whatsapp_bots: whatsappBots,
            telegram_bots: telegramBots,
            websites,
            subscription,
            payments
        });
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث حالة مستخدم (تعليق/تفعيل) (للمشرفين)
 * PUT /api/admin/users/:userId/status
 */
exports.updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { status, reason } = req.body;
        
        if (!['active', 'suspended', 'deleted'].includes(status)) {
            return res.status(400).json({ error: 'حالة غير صالحة' });
        }
        
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }
        
        await user.update({ status });
        
        // تسجيل في سجل المشرفين
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: status === 'suspended' ? 'suspend_user' : (status === 'active' ? 'activate_user' : 'delete_user'),
            target_id: userId,
            target_type: 'user',
            details: { email: user.email, reason },
            ip_address: req.ip
        });
        
        // إرسال إشعار للمستخدم
        const statusMessage = status === 'suspended' ? 'تم تعليق حسابك' : (status === 'active' ? 'تم تفعيل حسابك' : 'تم حذف حسابك');
        await sendEmailNotification(
            user.email,
            `${statusMessage} - آفاق اليمن`,
            `عزيزي ${user.company_name || user.email}،\n\n${statusMessage}.\n${reason ? `السبب: ${reason}` : ''}\n\nللتواصل مع الدعم: ${process.env.APP_URL}/contact`
        );
        
        res.json({ success: true, message: `تم ${status === 'suspended' ? 'تعليق' : (status === 'active' ? 'تفعيل' : 'حذف')} المستخدم بنجاح` });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على سجل حركات المشرفين
 * GET /api/admin/logs
 */
exports.getAdminLogs = async (req, res) => {
    try {
        const { action, admin_id, page = 1, limit = 50 } = req.query;
        
        const where = {};
        if (action) where.action = action;
        if (admin_id) where.admin_id = admin_id;
        
        const offset = (page - 1) * limit;
        
        const { count, rows } = await AdminLog.findAndCountAll({
            where,
            include: [{ model: User, as: 'admin', attributes: ['email'] }],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });
        
        res.json({
            success: true,
            logs: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get admin logs error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على إعدادات النظام
 * GET /api/admin/settings
 */
exports.getSystemSettings = async (req, res) => {
    try {
        const settings = await SystemSettings.findAll();
        const settingsObj = {};
        settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
        
        res.json({ success: true, settings: settingsObj });
    } catch (error) {
        console.error('Get system settings error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث إعدادات النظام
 * PUT /api/admin/settings
 */
exports.updateSystemSettings = async (req, res) => {
    try {
        const updates = req.body;
        
        for (const [key, value] of Object.entries(updates)) {
            await SystemSettings.upsert({
                setting_key: key,
                setting_value: value,
                updated_at: new Date()
            });
        }
        
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: 'update_settings',
            target_id: null,
            target_type: 'system',
            details: { updated_keys: Object.keys(updates) },
            ip_address: req.ip
        });
        
        res.json({ success: true, message: 'تم تحديث الإعدادات بنجاح' });
    } catch (error) {
        console.error('Update system settings error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إنشاء نسخة احتياطية (للمشرفين)
 * POST /api/admin/backup
 */
exports.createBackup = async (req, res) => {
    try {
        const backupPath = await createBackup();
        
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: 'create_backup',
            target_id: null,
            target_type: 'system',
            details: { backup_path: backupPath },
            ip_address: req.ip
        });
        
        res.json({ success: true, message: 'تم إنشاء النسخة الاحتياطية بنجاح', backup_path: backupPath });
    } catch (error) {
        console.error('Create backup error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * وضع الصيانة (للمشرفين)
 * POST /api/admin/maintenance
 */
exports.setMaintenanceMode = async (req, res) => {
    try {
        const { enabled, message } = req.body;
        
        await SystemSettings.upsert({
            setting_key: 'maintenance_mode',
            setting_value: enabled ? 'true' : 'false',
            updated_at: new Date()
        });
        
        if (message) {
            await SystemSettings.upsert({
                setting_key: 'maintenance_message',
                setting_value: message,
                updated_at: new Date()
            });
        }
        
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: enabled ? 'enable_maintenance' : 'disable_maintenance',
            target_id: null,
            target_type: 'system',
            details: { message },
            ip_address: req.ip
        });
        
        res.json({ success: true, message: enabled ? 'تم تفعيل وضع الصيانة' : 'تم إلغاء وضع الصيانة' });
    } catch (error) {
        console.error('Set maintenance mode error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إرسال إشعار لجميع المستخدمين (للمشرفين)
 * POST /api/admin/broadcast
 */
exports.broadcastToUsers = async (req, res) => {
    try {
        const { subject, message, user_filter } = req.body;
        
        if (!subject || !message) {
            return res.status(400).json({ error: 'الموضوع والرسالة مطلوبان' });
        }
        
        let where = { status: 'active' };
        
        if (user_filter === 'subscribed') {
            where = { ...where, current_subscription_id: { [Op.ne]: null } };
        } else if (user_filter === 'non_subscribed') {
            where = { ...where, current_subscription_id: null };
        }
        
        const users = await User.findAll({ where, attributes: ['email', 'company_name'] });
        
        let sentCount = 0;
        for (const user of users) {
            await sendEmailNotification(
                user.email,
                subject,
                `عزيزي ${user.company_name || user.email}،\n\n${message}\n\nفريق آفاق اليمن`
            ).catch(() => {});
            sentCount++;
        }
        
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: 'broadcast',
            target_id: null,
            target_type: 'system',
            details: { subject, user_filter, recipient_count: sentCount },
            ip_address: req.ip
        });
        
        res.json({ success: true, message: `تم إرسال الإشعار إلى ${sentCount} مستخدم` });
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};