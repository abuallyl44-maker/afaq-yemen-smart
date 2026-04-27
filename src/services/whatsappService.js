/**
 * خدمة بوتات واتساب باستخدام مكتبة Baileys
 */

const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const { WhatsAppBot, WhatsAppSession, CatalogItem, AISetting } = require('../models');
const { processWithAI } = require('./aiService');
const path = require('path');
const fs = require('fs-extra');

// تخزين الجلسات النشطة
const activeSessions = new Map();
const qrCodes = new Map();

/**
 * بدء خدمة واتساب لبوت معين
 */
async function startWhatsAppService(botId) {
    try {
        const bot = await WhatsAppBot.findByPk(botId);
        if (!bot) {
            throw new Error(`Bot ${botId} not found`);
        }

        const sessions = await WhatsAppSession.findAll({
            where: { bot_id: botId, is_valid: true }
        });

        for (const session of sessions) {
            await startSession(bot, session);
        }

        return true;
    } catch (error) {
        console.error(`Start WhatsApp service error for bot ${botId}:`, error);
        return false;
    }
}

/**
 * بدء جلسة واتساب
 */
async function startSession(bot, session) {
    try {
        const sessionPath = path.join(process.env.UPLOADS_PATH, `sessions/${session.session_id}`);
        await fs.ensureDir(sessionPath);

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['Afaq Yemen', 'Chrome', '1.0.0']
        });

        // معالجة QR Code
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // توليد QR Code كصورة
                const qrImage = await QRCode.toDataURL(qr);
                qrCodes.set(session.session_id, qrImage);
                
                // إرسال QR إلى المستخدم عبر البوت الرئيسي
                await sendQRToUser(bot.user_id, qrImage, session.session_id);
            }

            if (connection === 'open') {
                console.log(`WhatsApp session ${session.session_id} connected`);
                await session.update({ is_valid: true, last_active: new Date() });
                activeSessions.set(session.session_id, sock);
                qrCodes.delete(session.session_id);
                
                // إشعار المستخدم بنجاح الربط
                await notifyUserSessionConnected(bot.user_id, session.session_name);
            }

            if (connection === 'close') {
                console.log(`WhatsApp session ${session.session_id} closed`);
                await session.update({ is_valid: false });
                activeSessions.delete(session.session_id);
                
                // إشعار المستخدم بانتهاء الجلسة
                await notifyUserSessionExpired(bot.user_id, session.session_name);
                
                // محاولة إعادة الاتصال بعد 5 ثوانٍ
                setTimeout(() => startSession(bot, session), 5000);
            }
        });

        // معالجة الرسائل الواردة
        sock.ev.on('messages.upsert', async (messageEvent) => {
            const { messages, type } = messageEvent;
            if (type !== 'notify') return;

            for (const msg of messages) {
                if (msg.key.fromMe) continue;
                
                const sender = msg.key.remoteJid;
                const messageText = msg.message?.conversation || 
                                   msg.message?.extendedTextMessage?.text || '';
                
                if (!messageText) continue;
                
                // معالجة الرسالة
                await handleIncomingMessage(bot, session, sender, messageText);
            }
        });

        // حفظ بيانات الاعتماد عند التغيير
        sock.ev.on('creds.update', saveCreds);

        return sock;
    } catch (error) {
        console.error(`Start session error:`, error);
        return null;
    }
}

/**
 * معالجة الرسائل الواردة
 */
async function handleIncomingMessage(bot, session, sender, message) {
    try {
        // البحث عن رد آلي مطابق
        const autoReply = await CatalogItem.findOne({
            where: {
                user_id: bot.user_id,
                type: 'auto_reply',
                is_active: true
            }
        });

        // التحقق من المطابقة (contains)
        if (autoReply && message.includes(autoReply.trigger_keyword)) {
            await sendWhatsAppMessage(session.session_id, sender, autoReply.reply_content);
            return;
        }

        // استخدام الذكاء الاصطناعي
        const aiSettings = await AISetting.findOne({
            where: { user_id: bot.user_id }
        });

        if (aiSettings?.is_enabled) {
            const response = await processWithAI(bot.user_id, message, sender);
            if (response) {
                await sendWhatsAppMessage(session.session_id, sender, response);
            }
        }
    } catch (error) {
        console.error('Handle incoming message error:', error);
    }
}

/**
 * إرسال رسالة واتساب
 */
async function sendWhatsAppMessage(sessionId, to, text) {
    try {
        const sock = activeSessions.get(sessionId);
        if (!sock) {
            throw new Error(`Session ${sessionId} not active`);
        }

        await sock.sendMessage(to, { text });
        return true;
    } catch (error) {
        console.error('Send WhatsApp message error:', error);
        return false;
    }
}

/**
 * إرسال QR Code للمستخدم
 */
async function sendQRToUser(userId, qrImage, sessionId) {
    // سيتم إرسال QR Code عبر البوت الرئيسي
    console.log(`QR Code generated for user ${userId}, session ${sessionId}`);
    // TODO: إرسال عبر البوت الرئيسي
}

/**
 * إشعار المستخدم بنجاح الربط
 */
async function notifyUserSessionConnected(userId, sessionName) {
    // سيتم إرسال إشعار عبر البوت الرئيسي
    console.log(`Session ${sessionName} connected for user ${userId}`);
}

/**
 * إشعار المستخدم بانتهاء الجلسة
 */
async function notifyUserSessionExpired(userId, sessionName) {
    // سيتم إرسال إشعار عبر البوت الرئيسي
    console.log(`Session ${sessionName} expired for user ${userId}`);
}

/**
 * إيقاف خدمة واتساب
 */
async function stopWhatsAppService(botId) {
    const sessions = await WhatsAppSession.findAll({ where: { bot_id: botId } });
    for (const session of sessions) {
        const sock = activeSessions.get(session.session_id);
        if (sock) {
            await sock.logout();
            activeSessions.delete(session.session_id);
        }
    }
}

/**
 * التحقق اليومي من صحة الجلسات
 */
async function dailySessionHealthCheck() {
    const sessions = await WhatsAppSession.findAll({ where: { is_valid: true } });
    
    for (const session of sessions) {
        const sock = activeSessions.get(session.session_id);
        if (!sock) {
            await session.update({ is_valid: false });
            await notifyUserSessionExpired(session.bot.user_id, session.session_name);
        }
    }
}

module.exports = {
    startWhatsAppService,
    stopWhatsAppService,
    sendWhatsAppMessage,
    dailySessionHealthCheck
};