/**
 * وحدة تحكم بوتات واتساب (WhatsApp Controller)
 * المسؤول عن: إنشاء وإدارة بوتات واتساب للعملاء
 */

const { WhatsAppBot, WhatsAppSession, User, SubscriptionPlan } = require('../models');
const { startWhatsAppSession, stopWhatsAppSession, generateQR, checkSessionHealth } = require('../services/whatsappService');
const { sendTelegramNotification } = require('../services/notificationService');
const QRCode = require('qrcode');

/**
 * الحصول على جميع بوتات واتساب للمستخدم
 * GET /api/bots/whatsapp
 */
exports.getWhatsAppBots = async (req, res) => {
    try {
        const bots = await WhatsAppBot.findAll({
            where: { user_id: req.user.user_id },
            include: [{ model: WhatsAppSession, as: 'sessions' }],
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, bots });
    } catch (error) {
        console.error('Get WhatsApp bots error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إنشاء بوت واتساب جديد
 * POST /api/bots/whatsapp
 */
exports.createWhatsAppBot = async (req, res) => {
    try {
        const { bot_name } = req.body;

        if (!bot_name || bot_name.trim().length < 3) {
            return res.status(400).json({ error: 'اسم البوت يجب أن يكون 3 أحرف على الأقل' });
        }

        // التحقق من الحد الأقصى للبوتات حسب الاشتراك
        const botCount = await WhatsAppBot.count({ where: { user_id: req.user.user_id } });
        
        // جلب خطة المستخدم الحالية
        const subscription = await Subscription.findOne({
            where: { user_id: req.user.user_id, status: 'active' },
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });

        const maxBots = subscription?.plan?.max_whatsapp_bots || parseInt(process.env.FREE_BOT_LIMIT) || 1;
        
        if (botCount >= maxBots) {
            return res.status(403).json({ 
                error: `لقد تجاوزت الحد الأقصى للبوتات (${maxBots}). يرجى الترقية للاستمرار.` 
            });
        }

        const bot = await WhatsAppBot.create({
            user_id: req.user.user_id,
            bot_name: bot_name.trim(),
            status: 'pending'
        });

        // تسجيل النشاط
        await sendTelegramNotification(process.env.ADMIN_GROUP_ID, {
            title: '🤖 بوت واتساب جديد',
            message: `المستخدم: ${req.user.email}\nاسم البوت: ${bot.bot_name}\nالتاريخ: ${new Date().toLocaleString('ar')}`
        });

        res.status(201).json({ success: true, bot });
    } catch (error) {
        console.error('Create WhatsApp bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على QR Code لربط البوت
 * GET /api/bots/whatsapp/:botId/qr
 */
exports.getQRCode = async (req, res) => {
    try {
        const { botId } = req.params;
        
        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        // توليد QR Code جديد
        const qrData = await generateQR(bot.bot_id);
        
        // تحويل QR Code إلى صورة base64
        const qrImage = await QRCode.toDataURL(qrData);

        res.json({ success: true, qr: qrImage, bot_id: bot.bot_id });
    } catch (error) {
        console.error('Get QR code error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إضافة جلسة واتساب جديدة (بعد ربط QR)
 * POST /api/bots/whatsapp/:botId/session
 */
exports.addSession = async (req, res) => {
    try {
        const { botId } = req.params;
        const { session_name, phone_number } = req.body;

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

        // بدء الجلسة (سيتم توليد QR وإرساله)
        const session = await startWhatsAppSession(bot.bot_id, session_name, phone_number);

        // تحديث حالة البوت
        await bot.update({ status: 'active' });

        res.status(201).json({ 
            success: true, 
            message: 'جاري ربط الجلسة... سيتم إرسال QR Code إلى بريدك الإلكتروني',
            session 
        });
    } catch (error) {
        console.error('Add session error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث إعدادات بوت واتساب
 * PUT /api/bots/whatsapp/:botId
 */
exports.updateWhatsAppBot = async (req, res) => {
    try {
        const { botId } = req.params;
        const { bot_name, delete_tracking } = req.body;

        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        const updateData = {};
        if (bot_name) updateData.bot_name = bot_name;
        if (delete_tracking !== undefined) updateData.delete_tracking = delete_tracking;

        await bot.update(updateData);

        res.json({ success: true, bot });
    } catch (error) {
        console.error('Update WhatsApp bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إيقاف/تشغيل بوت واتساب
 * POST /api/bots/whatsapp/:botId/toggle
 */
exports.toggleWhatsAppBot = async (req, res) => {
    try {
        const { botId } = req.params;
        const { action } = req.body; // 'pause' or 'resume'

        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        if (action === 'pause') {
            await bot.update({ status: 'paused' });
            // إيقاف الجلسات
            const sessions = await WhatsAppSession.findAll({ where: { bot_id: bot.bot_id } });
            for (const session of sessions) {
                await stopWhatsAppSession(session.session_id);
            }
        } else if (action === 'resume') {
            await bot.update({ status: 'active' });
            // إعادة تشغيل الجلسات
            const sessions = await WhatsAppSession.findAll({ where: { bot_id: bot.bot_id } });
            for (const session of sessions) {
                await startWhatsAppSession(bot.bot_id, session.session_name, session.phone_number);
            }
        } else {
            return res.status(400).json({ error: 'إجراء غير صالح' });
        }

        res.json({ success: true, message: `تم ${action === 'pause' ? 'إيقاف' : 'تشغيل'} البوت بنجاح` });
    } catch (error) {
        console.error('Toggle WhatsApp bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * حذف جلسة واتساب
 * DELETE /api/bots/whatsapp/:botId/session/:sessionId
 */
exports.deleteSession = async (req, res) => {
    try {
        const { botId, sessionId } = req.params;

        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        const session = await WhatsAppSession.findOne({
            where: { session_id: sessionId, bot_id: botId }
        });

        if (!session) {
            return res.status(404).json({ error: 'الجلسة غير موجودة' });
        }

        await stopWhatsAppSession(sessionId);
        await session.destroy();

        // التحقق من وجود جلسات أخرى
        const remainingSessions = await WhatsAppSession.count({ where: { bot_id: botId } });
        if (remainingSessions === 0) {
            await bot.update({ status: 'pending' });
        }

        res.json({ success: true, message: 'تم حذف الجلسة بنجاح' });
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * حذف بوت واتساب بالكامل
 * DELETE /api/bots/whatsapp/:botId
 */
exports.deleteWhatsAppBot = async (req, res) => {
    try {
        const { botId } = req.params;

        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        // حذف جميع الجلسات المرتبطة
        const sessions = await WhatsAppSession.findAll({ where: { bot_id: botId } });
        for (const session of sessions) {
            await stopWhatsAppSession(session.session_id);
            await session.destroy();
        }

        await bot.destroy();

        res.json({ success: true, message: 'تم حذف البوت بنجاح' });
    } catch (error) {
        console.error('Delete WhatsApp bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على جميع جلسات البوت
 * GET /api/bots/whatsapp/:botId/sessions
 */
exports.getSessions = async (req, res) => {
    try {
        const { botId } = req.params;

        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        const sessions = await WhatsAppSession.findAll({
            where: { bot_id: botId },
            order: [['created_at', 'DESC']]
        });

        res.json({ success: true, sessions });
    } catch (error) {
        console.error('Get sessions error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث إعدادات مراقبة التعديل والحذف
 * PUT /api/bots/whatsapp/:botId/tracking
 */
exports.updateTrackingSettings = async (req, res) => {
    try {
        const { botId } = req.params;
        const { delete_tracking } = req.body;

        const bot = await WhatsAppBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        await bot.update({ delete_tracking: delete_tracking || false });

        res.json({ 
            success: true, 
            message: delete_tracking ? 'تم تفعيل مراقبة التعديل والحذف' : 'تم إلغاء تفعيل مراقبة التعديل والحذف'
        });
    } catch (error) {
        console.error('Update tracking settings error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};