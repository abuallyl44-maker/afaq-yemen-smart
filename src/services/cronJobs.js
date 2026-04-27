/**
 * المهام المجدولة (Cron Jobs)
 */

const cron = require('node-cron');
const { Subscription, User, WhatsAppBot, WhatsAppSession, PaymentRequest } = require('../models');
const { dailySessionHealthCheck } = require('./whatsappService');
const { sendSubscriptionExpiryNotification, sendPaymentReminder } = require('./notificationService');
const { createBackup } = require('./backupService');
const { Op } = require('sequelize');

/**
 * بدء جميع المهام المجدولة
 */
function startCronJobs() {
    // 1. فحص صلاحية جلسات واتساب - كل يوم في 03:00
    cron.schedule('0 3 * * *', async () => {
        console.log('Running WhatsApp session health check...');
        await dailySessionHealthCheck();
    });

    // 2. فحص الاشتراكات المنتهية - كل يوم في 00:00
    cron.schedule('0 0 * * *', async () => {
        console.log('Checking expired subscriptions...');
        
        const expiredSubscriptions = await Subscription.findAll({
            where: {
                status: 'active',
                end_date: { [Op.lt]: new Date() }
            }
        });

        for (const sub of expiredSubscriptions) {
            await sub.update({ status: 'expired' });
            
            // إيقاف البوتات المرتبطة
            await WhatsAppBot.update(
                { status: 'expired' },
                { where: { user_id: sub.user_id } }
            );
            await TelegramBot.update(
                { status: 'expired' },
                { where: { user_id: sub.user_id } }
            );
            
            // إشعار المستخدم
            await sendSubscriptionExpiryNotification(sub.user_id, sub.end_date);
        }
    });

    // 3. إرسال تذكير للمستخدمين قبل انتهاء الاشتراك - كل يوم في 08:00
    cron.schedule('0 8 * * *', async () => {
        console.log('Sending subscription expiry reminders...');
        
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        
        const oneDayFromNow = new Date();
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

        // قبل 7 أيام
        const subscriptions7 = await Subscription.findAll({
            where: {
                status: 'active',
                end_date: {
                    [Op.between]: [new Date(), sevenDaysFromNow]
                }
            }
        });
        
        for (const sub of subscriptions7) {
            await sendSubscriptionExpiryNotification(sub.user_id, sub.end_date, 7);
        }
        
        // قبل 3 أيام
        const subscriptions3 = await Subscription.findAll({
            where: {
                status: 'active',
                end_date: {
                    [Op.between]: [new Date(), threeDaysFromNow]
                }
            }
        });
        
        for (const sub of subscriptions3) {
            await sendSubscriptionExpiryNotification(sub.user_id, sub.end_date, 3);
        }
        
        // قبل يوم واحد
        const subscriptions1 = await Subscription.findAll({
            where: {
                status: 'active',
                end_date: {
                    [Op.between]: [new Date(), oneDayFromNow]
                }
            }
        });
        
        for (const sub of subscriptions1) {
            await sendSubscriptionExpiryNotification(sub.user_id, sub.end_date, 1);
        }
    });

    // 4. إعادة تعيين عداد الرسائل الشهري - أول كل شهر في 00:00
    cron.schedule('0 0 1 * *', async () => {
        console.log('Resetting monthly message counters...');
        // تم التعامل معه في نموذج MessageUsage
    });

    // 5. النسخ الاحتياطي التلقائي - كل يوم في 02:00
    cron.schedule('0 2 * * *', async () => {
        console.log('Creating automatic backup...');
        await createBackup();
    });
    
    // 6. تذكير طلبات الدفع المنتظرة - كل 6 ساعات
    cron.schedule('0 */6 * * *', async () => {
        console.log('Checking pending payments...');
        
        const pendingPayments = await PaymentRequest.findAll({
            where: {
                status: 'pending',
                requested_at: {
                    [Op.lt]: new Date(Date.now() - process.env.PAYMENT_WAITING_HOURS * 60 * 60 * 1000)
                }
            }
        });
        
        for (const payment of pendingPayments) {
            await sendPaymentReminder(payment.user_id, payment.payment_id);
        }
    });

    console.log('All cron jobs scheduled successfully');
}

module.exports = {
    startCronJobs
};