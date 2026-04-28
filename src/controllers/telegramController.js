/**
 * وحدة تحكم بوتات تيليجرام للعملاء (Telegram Controller)
 * المسؤول عن: إنشاء وإدارة بوتات تيليجرام للعملاء
 */

const { TelegramBot, TelegramSubscriber, User, SubscriptionPlan } = require('../models');
const { startClientTelegramBot, stopClientTelegramBot, broadcastToSubscribers } = require('../services/clientTelegramService');
const { sendTelegramNotification } = require('../services/notificationService');

/**
 * الحصول على جميع بوتات تيليجرام للمستخدم
 * GET /api/bots/telegram
 */
exports.getTelegramBots = async (req, res) => {
    try {
        const bots = await TelegramBot.findAll({
            where: { user_id: req.user.user_id },
            order: [['created_at', 'DESC']]
        });
        res.json({ success: true, bots });
    } catch (error) {
        console.error('Get Telegram bots error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إنشاء بوت تيليجرام جديد
 * POST /api/bots/telegram
 */
exports.createTelegramBot = async (req, res) => {
    try {
        const { bot_name, bot_token, bot_username, welcome_message } = req.body;

        if (!bot_name || bot_name.trim().length < 3) {
            return res.status(400).json({ error: 'اسم البوت يجب أن يكون 3 أحرف على الأقل' });
        }

        if (!bot_token || !bot_username) {
            return res.status(400).json({ error: 'التوكن واسم المستخدم مطلوبان' });
        }

        // التحقق من صحة التوكن
        const { Bot } = require('grammy');
        const testBot = new Bot(bot_token);
        
        try {
            const botInfo = await testBot.api.getMe();
            if (botInfo.username !== bot_username.replace('@', '')) {
                return res.status(400).json({ error: 'اسم المستخدم لا يتطابق مع التوكن' });
            }
        } catch (error) {
            return res.status(400).json({ error: 'توكن غير صالح' });
        }

        // التحقق من الحد الأقصى للبوتات حسب الاشتراك
        const botCount = await TelegramBot.count({ where: { user_id: req.user.user_id } });
        
        const subscription = await Subscription.findOne({
            where: { user_id: req.user.user_id, status: 'active' },
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });

        const maxBots = subscription?.plan?.max_telegram_bots || parseInt(process.env.FREE_BOT_LIMIT) || 1;
        
        if (botCount >= maxBots) {
            return res.status(403).json({ 
                error: `لقد تجاوزت الحد الأقصى للبوتات (${maxBots}). يرجى الترقية للاستمرار.` 
            });
        }

        const bot = await TelegramBot.create({
            user_id: req.user.user_id,
            bot_name: bot_name.trim(),
            bot_token,
            bot_username: bot_username.replace('@', ''),
            welcome_message: welcome_message || `أهلاً بك في ${req.user.company_name || 'خدماتنا'}!`,
            status: 'active'
        });

        // بدء تشغيل البوت
        await startClientTelegramBot(
            bot.bot_id, 
            bot.bot_token, 
            bot.bot_username, 
            bot.welcome_message,
            req.user.user_id
        );

        // تسجيل النشاط
        await sendTelegramNotification(process.env.ADMIN_GROUP_ID, {
            title: '🤖 بوت تيليجرام جديد',
            message: `المستخدم: ${req.user.email}\nاسم البوت: ${bot.bot_name}\nمعرف البوت: @${bot.bot_username}`
        });

        res.status(201).json({ success: true, bot });
    } catch (error) {
        console.error('Create Telegram bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث إعدادات بوت تيليجرام
 * PUT /api/bots/telegram/:botId
 */
exports.updateTelegramBot = async (req, res) => {
    try {
        const { botId } = req.params;
        const { bot_name, welcome_message } = req.body;

        const bot = await TelegramBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        const updateData = {};
        if (bot_name) updateData.bot_name = bot_name;
        if (welcome_message) updateData.welcome_message = welcome_message;

        await bot.update(updateData);

        // إعادة تشغيل البوت لتحديث رسالة الترحيب
        await stopClientTelegramBot(botId);
        await startClientTelegramBot(
            bot.bot_id, 
            bot.bot_token, 
            bot.bot_username, 
            bot.welcome_message,
            req.user.user_id
        );

        res.json({ success: true, bot });
    } catch (error) {
        console.error('Update Telegram bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إيقاف/تشغيل بوت تيليجرام
 * POST /api/bots/telegram/:botId/toggle
 */
exports.toggleTelegramBot = async (req, res) => {
    try {
        const { botId } = req.params;
        const { action } = req.body;

        const bot = await TelegramBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        if (action === 'pause') {
            await stopClientTelegramBot(botId);
            await bot.update({ status: 'paused' });
        } else if (action === 'resume') {
            await startClientTelegramBot(
                bot.bot_id, 
                bot.bot_token, 
                bot.bot_username, 
                bot.welcome_message,
                req.user.user_id
            );
            await bot.update({ status: 'active' });
        } else {
            return res.status(400).json({ error: 'إجراء غير صالح' });
        }

        res.json({ success: true, message: `تم ${action === 'pause' ? 'إيقاف' : 'تشغيل'} البوت بنجاح` });
    } catch (error) {
        console.error('Toggle Telegram bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * حذف بوت تيليجرام
 * DELETE /api/bots/telegram/:botId
 */
exports.deleteTelegramBot = async (req, res) => {
    try {
        const { botId } = req.params;

        const bot = await TelegramBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        await stopClientTelegramBot(botId);
        await bot.destroy();

        res.json({ success: true, message: 'تم حذف البوت بنجاح' });
    } catch (error) {
        console.error('Delete Telegram bot error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على إحصائيات البوت
 * GET /api/bots/telegram/:botId/stats
 */
exports.getBotStats = async (req, res) => {
    try {
        const { botId } = req.params;

        const bot = await TelegramBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        const totalSubscribers = await TelegramSubscriber.count({
            where: { bot_id: botId, is_blocked: false }
        });

        const blockedSubscribers = await TelegramSubscriber.count({
            where: { bot_id: botId, is_blocked: true }
        });

        const activeLastWeek = await TelegramSubscriber.count({
            where: { 
                bot_id: botId, 
                last_active: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            }
        });

        res.json({ 
            success: true, 
            stats: {
                total_subscribers: totalSubscribers,
                blocked_subscribers: blockedSubscribers,
                active_last_week: activeLastWeek,
                status: bot.status
            }
        });
    } catch (error) {
        console.error('Get bot stats error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إرسال رسالة لجميع المشتركين (Broadcast)
 * POST /api/bots/telegram/:botId/broadcast
 */
exports.broadcast = async (req, res) => {
    try {
        const { botId } = req.params;
        const { message, image_url } = req.body;

        if (!message || message.trim().length === 0) {
            return res.status(400).json({ error: 'نص الرسالة مطلوب' });
        }

        const bot = await TelegramBot.findOne({
            where: { bot_id: botId, user_id: req.user.user_id }
        });

        if (!bot) {
            return res.status(404).json({ error: 'البوت غير موجود' });
        }

        if (bot.status !== 'active') {
            return res.status(403).json({ error: 'البوت غير نشط. يرجى تشغيله أولاً' });
        }

        // إرسال الرسالة
        const result = await broadcastToSubscribers(botId, message, image_url);

        res.json({ 
            success: true, 
            message: `تم إرسال الرسالة إلى ${result.success} من ${result.total} مشترك`,
            stats: result
        });
    } catch (error) {
        console.error('Broadcast error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};