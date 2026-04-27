/**
 * خدمة استقبال Webhooks
 */

const { Bot } = require('grammy');
const { handleIncomingMessage: handleWhatsAppMessage } = require('./whatsappService');
const { processWithAI } = require('./aiService');
const { WhatsAppSession, TelegramBot, User } = require('../models');

/**
 * معالجة Webhook من تيليجرام
 */
async function handleTelegramWebhook(req, res) {
    try {
        const { botToken } = req.params;
        const update = req.body;

        // التحقق من صحة التوكن
        const bot = await TelegramBot.findOne({ where: { bot_token: botToken } });
        if (!bot) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // معالجة التحديث
        const grammyBot = new Bot(botToken);
        
        // معالجة الرسائل النصية
        grammyBot.on('message:text', async (ctx) => {
            const user = await User.findByPk(bot.user_id);
            if (!user) return;

            const message = ctx.message.text;
            const sender = ctx.from.id;

            // معالجة الرسالة بالذكاء الاصطناعي
            const response = await processWithAI(bot.user_id, message, sender);
            if (response) {
                await ctx.reply(response);
            }
        });

        // معالجة أمر /start
        grammyBot.command('start', async (ctx) => {
            await ctx.reply(bot.welcome_message || 'أهلاً بك في خدماتنا!');
        });

        await grammyBot.handleUpdate(update);
        
        res.sendStatus(200);
    } catch (error) {
        console.error('Telegram webhook error:', error);
        res.sendStatus(500);
    }
}

/**
 * معالجة Webhook من واتساب
 */
async function handleWhatsAppWebhook(req, res) {
    try {
        const { botId } = req.params;
        const update = req.body;

        // التحقق من صحة البوت
        const session = await WhatsAppSession.findOne({
            where: { session_id: botId, is_valid: true },
            include: [{ model: WhatsAppBot, as: 'bot' }]
        });

        if (!session) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // معالجة الرسالة
        if (update.messages && update.messages[0]) {
            const message = update.messages[0];
            const sender = message.from;
            const text = message.text?.body || '';

            if (text) {
                await handleWhatsAppMessage(session.bot, session, sender, text);
            }
        }

        res.sendStatus(200);
    } catch (error) {
        console.error('WhatsApp webhook error:', error);
        res.sendStatus(500);
    }
}

/**
 * معالجة Webhook من مزودي الدفع (للمستقبل)
 */
async function handlePaymentWebhook(req, res) {
    try {
        const { provider } = req.params;
        const data = req.body;

        // TODO: تنفيذ معالجة الدفع من مزودي الخدمة (PayMob, MyFatoorah, إلخ)
        console.log(`Payment webhook from ${provider}:`, data);

        res.sendStatus(200);
    } catch (error) {
        console.error('Payment webhook error:', error);
        res.sendStatus(500);
    }
}

module.exports = {
    handleTelegramWebhook,
    handleWhatsAppWebhook,
    handlePaymentWebhook
};