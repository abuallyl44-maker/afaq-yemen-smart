/**
 * خدمة بوتات تيليجرام للعملاء
 */

const { Bot, session, InlineKeyboard } = require('grammy');
const { TelegramBot, TelegramSubscriber, CatalogItem, AISetting } = require('../models');
const { processWithAI } = require('./aiService');
const activeClientBots = new Map();

/**
 * بدء تشغيل بوت تيليجرام للعميل
 */
async function startClientTelegramBot(botId, botToken, botUsername, welcomeMessage, userId) {
    try {
        const bot = new Bot(botToken);
        
        // إدارة الجلسات
        bot.use(session({
            initial: () => ({ step: 'start' })
        }));
        
        // معالج /start
        bot.command('start', async (ctx) => {
            const chatId = ctx.from.id;
            
            // تسجيل المشترك
            await TelegramSubscriber.findOrCreate({
                where: { bot_id: botId, chat_id: chatId },
                defaults: {
                    username: ctx.from.username,
                    first_name: ctx.from.first_name,
                    last_name: ctx.from.last_name,
                    subscribed_at: new Date(),
                    last_active: new Date()
                }
            });
            
            // جلب الكتالوج لعرض الخدمات
            const services = await CatalogItem.findAll({
                where: { user_id: userId, type: 'service', is_active: true },
                limit: 5
            });
            
            const keyboard = new InlineKeyboard();
            for (const service of services) {
                keyboard.text(service.name, `service_${service.item_id}`).row();
            }
            keyboard.text('📞 اتصل بنا', 'contact').row();
            keyboard.text('🛒 طلب شراء', 'order');
            
            await ctx.reply(
                welcomeMessage || `أهلاً بك في خدماتنا!\n\nاختر الخدمة التي تريدها:`,
                { reply_markup: keyboard }
            );
        });
        
        // معالج الرسائل النصية
        bot.on('message:text', async (ctx) => {
            const message = ctx.message.text;
            const chatId = ctx.from.id;
            
            // تحديث آخر نشاط
            await TelegramSubscriber.update(
                { last_active: new Date() },
                { where: { bot_id: botId, chat_id: chatId } }
            );
            
            // البحث عن رد آلي مطابق
            const autoReply = await CatalogItem.findOne({
                where: {
                    user_id: userId,
                    type: 'auto_reply',
                    is_active: true,
                    trigger_keyword: { [Op.like]: `%${message}%` }
                }
            });
            
            if (autoReply) {
                await ctx.reply(autoReply.reply_content);
                return;
            }
            
            // استخدام الذكاء الاصطناعي
            const aiSettings = await AISetting.findOne({ where: { user_id: userId } });
            if (aiSettings?.is_enabled) {
                const aiResponse = await processWithAI(userId, message, chatId.toString());
                if (aiResponse) {
                    await ctx.reply(aiResponse);
                    return;
                }
            }
            
            await ctx.reply('عذراً، لم أفهم طلبك. يرجى المحاولة مرة أخرى أو استخدام الأزرار.');
        });
        
        // معالج الأزرار
        bot.callbackQuery(/service_(\d+)/, async (ctx) => {
            const serviceId = ctx.match[1];
            const service = await CatalogItem.findByPk(serviceId);
            
            if (service) {
                let reply = `*${service.name}*\n\n${service.description}\n`;
                if (service.price) {
                    reply += `\n💰 السعر: ${service.price} ريال`;
                }
                await ctx.reply(reply, { parse_mode: 'Markdown' });
            }
            await ctx.answerCallbackQuery();
        });
        
        bot.callbackQuery('contact', async (ctx) => {
            // جلب معلومات الاتصال من إعدادات المستخدم
            const user = await User.findByPk(userId);
            await ctx.reply(
                `📞 *معلومات الاتصال*\n\n` +
                `📧 البريد: ${user.email}\n` +
                (user.phone ? `📱 الهاتف: ${user.phone}\n` : '') +
                `💬 واتساب: ${process.env.COMPANY_WHATSAPP || 'متاح قريباً'}`
            );
            await ctx.answerCallbackQuery();
        });
        
        bot.callbackQuery('order', async (ctx) => {
            await ctx.reply(
                '🛒 *طلب شراء*\n\n' +
                'يرجى إرسال:\n' +
                '1. اسم المنتج/الخدمة المطلوبة\n' +
                '2. الكمية\n' +
                '3. عنوان التسليم\n' +
                '4. رقم هاتفك للتواصل\n\n' +
                'سيتم التواصل معك قريباً لتأكيد الطلب.'
            );
            await ctx.answerCallbackQuery();
        });
        
        // بدء البوت
        bot.start();
        activeClientBots.set(botId, bot);
        
        console.log(`Client Telegram bot ${botUsername} started`);
        return true;
    } catch (error) {
        console.error(`Start client telegram bot error:`, error);
        return false;
    }
}

/**
 * إيقاف تشغيل بوت تيليجرام للعميل
 */
async function stopClientTelegramBot(botId) {
    const bot = activeClientBots.get(botId);
    if (bot) {
        await bot.stop();
        activeClientBots.delete(botId);
        console.log(`Client Telegram bot ${botId} stopped`);
    }
}

/**
 * إرسال رسالة لجميع مشتركي البوت
 */
async function broadcastToSubscribers(botId, message, imageUrl = null) {
    const bot = activeClientBots.get(botId);
    if (!bot) {
        throw new Error(`Bot ${botId} not active`);
    }
    
    const subscribers = await TelegramSubscriber.findAll({
        where: { bot_id: botId, is_blocked: false }
    });
    
    let successCount = 0;
    for (const subscriber of subscribers) {
        try {
            if (imageUrl) {
                await bot.api.sendPhoto(subscriber.chat_id, imageUrl, { caption: message });
            } else {
                await bot.api.sendMessage(subscriber.chat_id, message);
            }
            successCount++;
        } catch (error) {
            if (error.description?.includes('blocked')) {
                await subscriber.update({ is_blocked: true });
            }
        }
    }
    
    return { total: subscribers.length, success: successCount };
}

module.exports = {
    startClientTelegramBot,
    stopClientTelegramBot,
    broadcastToSubscribers
};