const express = require('express');
const { authenticate, requireOwnerOrAdmin } = require('../middleware/auth');
const { User, Subscription, WhatsAppBot, TelegramBot, ClientWebsite } = require('../models');
const router = express.Router();

/**
 * GET /api/users/me
 * معلومات المستخدم الحالي
 */
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.user_id, {
            attributes: { exclude: ['password_hash', 'verification_code', 'code_expiry'] }
        });

        // جلب الاشتراك الحالي
        const subscription = await Subscription.findOne({
            where: { user_id: req.user.user_id, status: 'active' }
        });

        // إحصائيات سريعة
        const whatsappCount = await WhatsAppBot.count({ where: { user_id: req.user.user_id } });
        const telegramCount = await TelegramBot.count({ where: { user_id: req.user.user_id } });
        const websiteCount = await ClientWebsite.count({ where: { user_id: req.user.user_id } });

        res.json({
            user,
            subscription,
            stats: {
                whatsapp_bots: whatsappCount,
                telegram_bots: telegramCount,
                websites: websiteCount
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * PUT /api/users/me
 * تحديث معلومات المستخدم
 */
router.put('/me', authenticate, async (req, res) => {
    try {
        const allowedFields = ['company_name', 'company_logo', 'company_description', 'business_type', 'hero_image', 'primary_color', 'phone'];
        const updateData = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        await req.user.update(updateData);

        res.json({
            message: 'تم تحديث المعلومات بنجاح',
            user: req.user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * PUT /api/users/me/password
 * تغيير كلمة السر
 */
router.put('/me/password', authenticate, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const isValid = await req.user.comparePassword(oldPassword);
        if (!isValid) {
            return res.status(400).json({ error: 'كلمة السر القديمة غير صحيحة' });
        }

        await req.user.update({ password_hash: newPassword });

        res.json({ message: 'تم تغيير كلمة السر بنجاح' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * DELETE /api/users/me
 * حذف الحساب (نهائياً)
 */
router.delete('/me', authenticate, async (req, res) => {
    try {
        // حذف جميع البيانات المرتبطة
        await WhatsAppBot.destroy({ where: { user_id: req.user.user_id } });
        await TelegramBot.destroy({ where: { user_id: req.user.user_id } });
        await ClientWebsite.destroy({ where: { user_id: req.user.user_id } });
        await Subscription.destroy({ where: { user_id: req.user.user_id } });
        
        // حذف المستخدم
        await req.user.update({ status: 'deleted' });

        res.json({ message: 'تم حذف الحساب بنجاح' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

module.exports = router;