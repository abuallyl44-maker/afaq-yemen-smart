const express = require('express');
const { authenticate } = require('../middleware/auth');
const { WhatsAppBot, WhatsAppSession, TelegramBot, User } = require('../models');
const { encrypt } = require('../utils/encryption');
const { startWhatsAppService, stopWhatsAppService } = require('../services/whatsappService');
const router = express.Router();

// ============================================================
// بوتات واتساب
// ============================================================

/**
 * GET /api/bots/whatsapp
 * قائمة بوتات واتساب للمستخدم
 */
router.get('/whatsapp', authenticate, async (req, res) => {
    try {
        const bots = await WhatsAppBot.findAll({
            where: { user_id: req.user.user_id },
            include: [{ model: WhatsAppSession, as: 'sessions' }]
        });
        res.json(bots);
    } catch (error) {
        console.error('Get WhatsApp bots error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/bots/whatsapp
 * إنشاء بوت واتساب جديد
 */
router.post('/whatsapp', authenticate, async (req, res) => {
    try {
        const { bot_name } = req.body;

        // التحقق من الحد الأقصى للبوتات حسب الاشتراك
        const botCount = await WhatsAppBot.count({ where: { user_id: req.user.user_id } });
        // TODO: التحقق من خطة الاشتراك

        const bot = await WhatsAppBot.create({
            user_id: req.user.user_id,
            bot_name,
            status: 'pending'
        });

        res.status(201).json(bot);
    } catch (error) {
        console.error('Create WhatsApp bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * GET /api/bots/whatsapp/:botId/qr
 * الحصول على QR Code لربط الجلسة
 */
router.get('/whatsapp/:botId/qr', authenticate, async (req, res) => {
    try {
        const { botId } = req.params;
        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        // توليد QR Code (يتم ذلك في خدمة واتساب)
        const qrCode = await startWhatsAppService(bot.bot_id);
        
        res.json({ qrCode });
    } catch (error) {
        console.error('Get QR error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/bots/whatsapp/:botId/session
 * إضافة جلسة جديدة (بعد ربط QR)
 */
router.post('/whatsapp/:botId/session', authenticate, async (req, res) => {
    try {
        const { botId } = req.params;
        const { session_name, session_data, phone_number } = req.body;

        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        // التحقق من عدم ربط الرقم بأكثر من بوت
        const existingSession = await WhatsAppSession.findOne({
            where: { phone_number }
        });

        if (existingSession) {
            return res.status(400).json({ error: 'هذا الرقم مرتبط بالفعل ببوت آخر' });
        }

        const session = await WhatsAppSession.create({
            bot_id: bot.bot_id,
            session_name,
            session_data: JSON.stringify(session_data),
            phone_number,
            is_valid: true,
            last_active: new Date()
        });

        // تحديث حالة البوت إلى active
        await bot.update({ status: 'active' });

        res.status(201).json(session);
    } catch (error) {
        console.error('Add session error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * PUT /api/bots/whatsapp/:botId
 * تحديث إعدادات البوت
 */
router.put('/whatsapp/:botId', authenticate, async (req, res) => {
    try {
        const { botId } = req.params;
        const { bot_name, delete_tracking } = req.body;

        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        await bot.update({ bot_name, delete_tracking });

        res.json(bot);
    } catch (error) {
        console.error('Update bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * DELETE /api/bots/whatsapp/:botId
 * حذف البوت
 */
router.delete('/whatsapp/:botId', authenticate, async (req, res) => {
    try {
        const { botId } = req.params;
        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        await stopWhatsAppService(botId);
        await bot.destroy();

        res.json({ message: 'تم حذف البوت بنجاح' });
    } catch (error) {
        console.error('Delete bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

// ============================================================
// بوتات تيليجرام للعملاء
// ============================================================

/**
 * GET /api/bots/telegram
 * قائمة بوتات تيليجرام للمستخدم
 */
router.get('/telegram', authenticate, async (req, res) => {
    try {
        const bots = await TelegramBot.findAll({
            where: { user_id: req.user.user_id }
        });
        res.json(bots);
    } catch (error) {
        console.error('Get Telegram bots error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/bots/telegram
 * إنشاء بوت تيليجرام جديد
 */
router.post('/telegram', authenticate, async (req, res) => {
    try {
        const { bot_name, bot_token, bot_username, welcome_message } = req.body;

        // التحقق من صحة التوكن
        const { Bot } = require('grammy');
        const testBot = new Bot(bot_token);
        
        try {
            const botInfo = await testBot.api.getMe();
            if (botInfo.username !== bot_username) {
                return res.status(400).json({ error: 'اسم المستخدم لا يتطابق مع التوكن' });
            }
        } catch (error) {
            return res.status(400).json({ error: 'توكن غير صالح' });
        }

        const bot = await TelegramBot.create({
            user_id: req.user.user_id,
            bot_name,
            bot_token,
            bot_username,
            welcome_message: welcome_message || `أهلاً بك في ${req.user.company_name || 'خدماتنا'}!`,
            status: 'active'
        });

        // بدء تشغيل البوت (سيتم في خدمة منفصلة)
        // startTelegramClientBot(bot.bot_id, bot_token);

        res.status(201).json(bot);
    } catch (error) {
        console.error('Create Telegram bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * PUT /api/bots/telegram/:botId
 * تحديث إعدادات بوت تيليجرام
 */
router.put('/telegram/:botId', authenticate, async (req, res) => {
    try {
        const { botId } = req.params;
        const { bot_name, welcome_message, status } = req.body;

        const bot = await TelegramBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        await bot.update({ bot_name, welcome_message, status });

        res.json(bot);
    } catch (error) {
        console.error('Update Telegram bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * DELETE /api/bots/telegram/:botId
 * حذف بوت تيليجرام
 */
router.delete('/telegram/:botId', authenticate, async (req, res) => {
    try {
        const { botId } = req.params;
        const bot = await TelegramBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        await bot.destroy();

        res.json({ message: 'تم حذف البوت بنجاح' });
    } catch (error) {
        console.error('Delete Telegram bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

module.exports = router;