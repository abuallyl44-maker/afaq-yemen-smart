/**
 * خدمة الإشعارات (Notification Service)
 * المسؤول عن: إرسال الإشعارات عبر تيليجرام والبريد الإلكتروني
 */

const axios = require('axios');
const { User } = require('../models');
const { sendEmail } = require('./emailService');

/**
 * إرسال إشعار إلى مجموعة تيليجرام
 * @param {string} chatId - معرف المجموعة
 * @param {Object} notification - بيانات الإشعار
 */
async function sendTelegramNotification(chatId, notification) {
    try {
        const botToken = process.env.MAIN_BOT_TOKEN;
        if (!botToken || !chatId) return;

        let message = `*${notification.title}*\n\n${notification.message}`;
        
        // إضافة أزرار إذا وجدت
        let replyMarkup = null;
        if (notification.buttons && notification.buttons.length > 0) {
            replyMarkup = {
                inline_keyboard: notification.buttons.map(button => [
                    { text: button.text, callback_data: button.callback }
                ])
            };
        }

        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId,
            text: message,
            parse_mode: 'Markdown',
            reply_markup: replyMarkup
        });
    } catch (error) {
        console.error('Telegram notification error:', error);
    }
}

/**
 * إرسال إشعار إلى مستخدم معين عبر تيليجرام
 * @param {string} userId - معرف المستخدم في تيليجرام
 * @param {string} message - نص الإشعار
 */
async function sendTelegramToUser(userId, message) {
    try {
        const botToken = process.env.MAIN_BOT_TOKEN;
        if (!botToken || !userId) return;

        await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: userId,
            text: message,
            parse_mode: 'Markdown'
        });
    } catch (error) {
        console.error('Telegram to user error:', error);
    }
}

/**
 * إرسال إشعار عبر البريد الإلكتروني
 * @param {string} to - البريد المستلم
 * @param {string} subject - الموضوع
 * @param {string} body - نص الرسالة
 */
async function sendEmailNotification(to, subject, body) {
    try {
        await sendEmail(to, subject, body);
    } catch (error) {
        console.error('Email notification error:', error);
    }
}

/**
 * إرسال إشعار انتهاء الجلسة للمستخدم
 * @param {number} userId - معرف المستخدم
 * @param {string} botName - اسم البوت
 * @param {string} sessionName - اسم الجلسة
 */
async function notifySessionExpired(userId, botName, sessionName) {
    const user = await User.findByPk(userId);
    if (!user) return;

    const message = `⚠️ *انتهت صلاحية جلسة واتساب*\n\nالبوت: ${botName}\nالجلسة: ${sessionName}\n\nيرجى إعادة ربط الجلسة من خلال البوت الرئيسي.`;
    
    await sendTelegramToUser(user.telegram_id, message);
    await sendEmailNotification(
        user.email,
        'انتهت صلاحية جلسة واتساب - آفاق اليمن',
        `عزيزي ${user.company_name || user.email},\n\nانتهت صلاحية جلسة "${sessionName}" في بوت "${botName}".\n\nيرجى إعادة ربط الجلسة من خلال البوت الرئيسي.\n\nفريق آفاق اليمن`
    );
}

/**
 * إرسال إشعار انتهاء الاشتراك للمستخدم
 * @param {number} userId - معرف المستخدم
 * @param {Date} endDate - تاريخ الانتهاء
 * @param {number} daysLeft - عدد الأيام المتبقية
 */
async function notifySubscriptionExpiry(userId, endDate, daysLeft = null) {
    const user = await User.findByPk(userId);
    if (!user) return;

    let message;
    if (daysLeft === 7) {
        message = `⏰ *تنبيه: اشتراكك على وشك الانتهاء*\n\nمتبقي 7 أيام على انتهاء اشتراكك.\nيرجى تجديد الاشتراك لضمان استمرارية الخدمة.`;
    } else if (daysLeft === 3) {
        message = `⏰ *تنبيه: اشتراكك على وشك الانتهاء*\n\nمتبقي 3 أيام فقط على انتهاء اشتراكك.\nيرجى تجديد الاشتراك فوراً.`;
    } else if (daysLeft === 1) {
        message = `⚠️ *تنبيه أخير: اشتراكك ينتهي غداً*\n\nيرجى تجديد الاشتراك اليوم لتجنب انقطاع الخدمة.`;
    } else {
        message = `❌ *انتهى اشتراكك*\n\nتم إيقاف الخدمات المدفوعة.\nيرجى الاشتراك من جديد للاستمرار.`;
    }

    await sendTelegramToUser(user.telegram_id, message);
    await sendEmailNotification(
        user.email,
        daysLeft ? 'تنبيه: اشتراكك على وشك الانتهاء - آفاق اليمن' : 'انتهى اشتراكك - آفاق اليمن',
        `عزيزي ${user.company_name || user.email},\n\n${message.replace(/\*/g, '')}\n\nفريق آفاق اليمن`
    );
}

/**
 * إرسال إشعار تجاوز الحد المجاني
 * @param {number} userId - معرف المستخدم
 * @param {number} currentUsage - الاستخدام الحالي
 * @param {number} limit - الحد الأقصى
 */
async function notifyLimitExceeded(userId, currentUsage, limit) {
    const user = await User.findByPk(userId);
    if (!user) return;

    const percentage = Math.round((currentUsage / limit) * 100);
    let message;

    if (percentage >= 100) {
        message = `⚠️ *لقد تجاوزت الحد المجاني للرسائل*\n\nلقد استخدمت ${currentUsage} من أصل ${limit} رسالة.\nتم إيقاف البوت مؤقتاً. يرجى الترقية للاستمرار.`;
    } else if (percentage >= 80) {
        message = `📊 *تنبيه: قارب على تجاوز الحد المجاني*\n\nلقد استخدمت ${currentUsage} من أصل ${limit} رسالة (${percentage}%).\nيرجى الترقية لتجنب انقطاع الخدمة.`;
    }

    await sendTelegramToUser(user.telegram_id, message);
    await sendEmailNotification(
        user.email,
        percentage >= 100 ? 'تجاوزت الحد المجاني - آفاق اليمن' : 'تنبيه: قارب على تجاوز الحد المجاني - آفاق اليمن',
        `عزيزي ${user.company_name || user.email},\n\n${message.replace(/\*/g, '')}\n\nفريق آفاق اليمن`
    );
}

module.exports = {
    sendTelegramNotification,
    sendTelegramToUser,
    sendEmailNotification,
    notifySessionExpired,
    notifySubscriptionExpiry,
    notifyLimitExceeded
};
