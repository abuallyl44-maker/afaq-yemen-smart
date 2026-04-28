/**
 * وحدة تحكم الاشتراكات والدفع (Payment Controller)
 * المسؤول عن: إدارة خطط الاشتراك، طلبات الدفع، تأكيد ورفض المدفوعات
 */

const { Subscription, SubscriptionPlan, PaymentRequest, User } = require('../models');
const { sendTelegramNotification, sendEmailNotification } = require('../services/notificationService');
const { Op } = require('sequelize');

/**
 * الحصول على جميع خطط الاشتراك المتاحة
 * GET /api/payments/plans
 */
exports.getPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.findAll({
            where: { is_active: true },
            order: [['order_index', 'ASC']]
        });
        res.json({ success: true, plans });
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على خطة المستخدم الحالية
 * GET /api/payments/my-plan
 */
exports.getMyPlan = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { user_id: req.user.user_id, status: 'active' },
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });
        
        res.json({ success: true, subscription });
    } catch (error) {
        console.error('Get my plan error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إرسال طلب دفع جديد
 * POST /api/payments/request
 */
exports.requestPayment = async (req, res) => {
    try {
        const { plan_id, company, transfer_number, sender_name } = req.body;

        // التحقق من صحة البيانات
        if (!plan_id || !company || !transfer_number || !sender_name) {
            return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
        }

        // التحقق من صحة الخطة
        const plan = await SubscriptionPlan.findByPk(plan_id);
        if (!plan) {
            return res.status(404).json({ error: 'الخطة غير موجودة' });
        }

        // التحقق من صحة رقم الحوالة حسب الشركة
        if (!validateTransferNumber(company, transfer_number)) {
            return res.status(400).json({ error: 'رقم الحوالة غير صحيح حسب تنسيق الشركة' });
        }

        // التحقق من عدم وجود طلب دفع معلق لنفس المستخدم
        const existingPending = await PaymentRequest.findOne({
            where: { user_id: req.user.user_id, status: 'pending' }
        });

        if (existingPending) {
            return res.status(400).json({ error: 'لديك طلب دفع معلق بالفعل. يرجى الانتظار حتى تتم معالجته.' });
        }

        // إنشاء طلب الدفع
        const paymentRequest = await PaymentRequest.create({
            user_id: req.user.user_id,
            amount: plan.price,
            company,
            transfer_number,
            sender_name,
            status: 'pending',
            requested_at: new Date()
        });

        // إرسال إشعار إلى المشرفين عبر تيليجرام
        await sendTelegramNotification(process.env.ADMIN_GROUP_ID, {
            title: '💰 طلب دفع جديد',
            message: `🆔 رقم الطلب: #${paymentRequest.payment_id}\n👤 المستخدم: ${req.user.email}\n🏢 المؤسسة: ${req.user.company_name || '-'}\n💰 المبلغ: ${plan.price} ريال\n🏦 الشركة: ${company}\n🔢 رقم الحوالة: ${transfer_number}\n👤 اسم المرسل: ${sender_name}\n📅 التاريخ: ${new Date().toLocaleString('ar')}\n🎁 الخطة: ${plan.name}`,
            buttons: [
                { text: '✅ تأكيد الدفع', callback: `confirm_payment_${paymentRequest.payment_id}` },
                { text: '❌ رفض الدفع', callback: `reject_payment_${paymentRequest.payment_id}` }
            ]
        });

        // إرسال إشعار للمستخدم
        await sendEmailNotification(
            req.user.email,
            'تم استلام طلب الدفع - آفاق اليمن',
            `عزيزي ${req.user.company_name || req.user.email}،\n\nتم استلام طلب الدفع الخاص بك بنجاح. سيتم مراجعته خلال ${process.env.PAYMENT_WAITING_HOURS || 48} ساعة.\n\nرقم الطلب: #${paymentRequest.payment_id}\nالمبلغ: ${plan.price} ريال\nالخطة: ${plan.name}\n\nشكراً لثقتك بنا.\n\nفريق آفاق اليمن`
        );

        res.status(201).json({
            success: true,
            message: `تم إرسال طلب الدفع بنجاح. سيتم مراجعته خلال ${process.env.PAYMENT_WAITING_HOURS || 48} ساعة.`,
            payment_id: paymentRequest.payment_id
        });
    } catch (error) {
        console.error('Request payment error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على طلبات الدفع الخاصة بالمستخدم
 * GET /api/payments/my-requests
 */
exports.getMyRequests = async (req, res) => {
    try {
        const requests = await PaymentRequest.findAll({
            where: { user_id: req.user.user_id },
            order: [['requested_at', 'DESC']]
        });
        res.json({ success: true, requests });
    } catch (error) {
        console.error('Get my requests error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على تفاصيل طلب دفع معين
 * GET /api/payments/request/:paymentId
 */
exports.getRequestDetails = async (req, res) => {
    try {
        const { paymentId } = req.params;
        
        const request = await PaymentRequest.findOne({
            where: { payment_id: paymentId, user_id: req.user.user_id }
        });
        
        if (!request) {
            return res.status(404).json({ error: 'طلب الدفع غير موجود' });
        }
        
        res.json({ success: true, request });
    } catch (error) {
        console.error('Get request details error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * التحقق من صحة رقم الحوالة حسب الشركة
 */
function validateTransferNumber(company, number) {
    const numberStr = number.toString();
    
    switch (company) {
        case 'حزمي':
            return /^\d{8,12}$/.test(numberStr);
        case 'السريع':
            return /^\d{10,14}$/.test(numberStr);
        case 'يمن إكسبرس':
            return /^\d{12}$/.test(numberStr);
        default:
            return true;
    }
}

// ============================================================
// مسارات المشرفين (Admin Only)
// ============================================================

/**
 * الحصول على جميع طلبات الدفع (للمشرفين)
 * GET /api/payments/admin/requests
 */
exports.getAllRequests = async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        
        const where = {};
        if (status && status !== 'all') {
            where.status = status;
        }
        
        const offset = (page - 1) * limit;
        
        const { count, rows } = await PaymentRequest.findAndCountAll({
            where,
            include: [{ model: User, as: 'user', attributes: ['user_id', 'email', 'company_name', 'phone'] }],
            order: [['requested_at', 'DESC']],
            limit: parseInt(limit),
            offset
        });
        
        res.json({
            success: true,
            requests: rows,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Get all requests error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تأكيد الدفع (للمشرفين)
 * POST /api/payments/admin/confirm/:paymentId
 */
exports.confirmPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { plan_id, admin_notes } = req.body;

        const payment = await PaymentRequest.findByPk(paymentId, {
            include: [{ model: User, as: 'user' }]
        });
        
        if (!payment) {
            return res.status(404).json({ error: 'طلب الدفع غير موجود' });
        }
        
        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'تم معالجة هذا الطلب بالفعل' });
        }
        
        const plan = await SubscriptionPlan.findByPk(plan_id);
        if (!plan) {
            return res.status(404).json({ error: 'الخطة غير موجودة' });
        }
        
        // إلغاء الاشتراكات السابقة النشطة
        await Subscription.update(
            { status: 'expired' },
            { where: { user_id: payment.user_id, status: 'active' } }
        );
        
        // إنشاء الاشتراك الجديد
        const endDate = plan.duration_days ? new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000) : null;
        
        const subscription = await Subscription.create({
            user_id: payment.user_id,
            plan_id: plan.plan_id,
            status: 'active',
            start_date: new Date(),
            end_date: endDate,
            auto_renew: false,
            payment_id: payment.payment_id
        });
        
        // تحديث طلب الدفع
        await payment.update({
            status: 'confirmed',
            confirmed_at: new Date(),
            subscription_id: subscription.subscription_id,
            admin_notes: admin_notes || null
        });
        
        // تحديث المستخدم
        await payment.user.update({ current_subscription_id: subscription.subscription_id });
        
        // تسجيل في سجل المشرفين
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: 'confirm_payment',
            target_id: payment.payment_id,
            target_type: 'payment',
            details: { amount: payment.amount, plan: plan.name, user_email: payment.user.email },
            ip_address: req.ip
        });
        
        // إرسال إشعار للمستخدم
        await sendEmailNotification(
            payment.user.email,
            '✅ تم تأكيد دفعتك - آفاق اليمن',
            `عزيزي ${payment.user.company_name || payment.user.email}،\n\nتم تأكيد دفعتك بنجاح! تم تفعيل اشتراكك في باقة "${plan.name}".\n\n📅 تاريخ البدء: ${new Date().toLocaleDateString('ar')}\n📅 تاريخ الانتهاء: ${endDate ? new Date(endDate).toLocaleDateString('ar') : 'غير محدود'}\n💰 المبلغ: ${payment.amount} ريال\n\nشكراً لثقتك بنا.\n\nفريق آفاق اليمن`
        );
        
        // إرسال إشعار تيليجرام للمستخدم
        const { sendTelegramToUser } = require('../services/notificationService');
        await sendTelegramToUser(payment.user.telegram_id, `✅ تم تأكيد دفعتك بنجاح!\n\nتم تفعيل اشتراكك في باقة "${plan.name}".\nينتهي في: ${endDate ? new Date(endDate).toLocaleDateString('ar') : 'غير محدود'}`);
        
        res.json({
            success: true,
            message: 'تم تأكيد الدفع وتفعيل الاشتراك بنجاح',
            subscription
        });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * رفض الدفع (للمشرفين)
 * POST /api/payments/admin/reject/:paymentId
 */
exports.rejectPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reason, admin_notes } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'سبب الرفض مطلوب' });
        }

        const payment = await PaymentRequest.findByPk(paymentId, {
            include: [{ model: User, as: 'user' }]
        });
        
        if (!payment) {
            return res.status(404).json({ error: 'طلب الدفع غير موجود' });
        }
        
        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'تم معالجة هذا الطلب بالفعل' });
        }
        
        await payment.update({
            status: 'rejected',
            rejected_at: new Date(),
            rejection_reason: reason,
            admin_notes: admin_notes || null
        });
        
        // تسجيل في سجل المشرفين
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: 'reject_payment',
            target_id: payment.payment_id,
            target_type: 'payment',
            details: { amount: payment.amount, reason, user_email: payment.user.email },
            ip_address: req.ip
        });
        
        // إرسال إشعار للمستخدم
        await sendEmailNotification(
            payment.user.email,
            '❌ لم يتم تأكيد دفعتك - آفاق اليمن',
            `عزيزي ${payment.user.company_name || payment.user.email}،\n\nنأسف لإبلاغك بأنه لم يتم تأكيد دفعتك.\n\nالسبب: ${reason}\n\nيرجى المحاولة مرة أخرى أو التواصل مع الدعم للحصول على المساعدة.\n\nفريق آفاق اليمن`
        );
        
        // إرسال إشعار تيليجرام للمستخدم
        const { sendTelegramToUser } = require('../services/notificationService');
        await sendTelegramToUser(payment.user.telegram_id, `❌ لم يتم تأكيد دفعتك.\n\nالسبب: ${reason}\n\nيرجى المحاولة مرة أخرى أو التواصل مع الدعم.`);
        
        res.json({
            success: true,
            message: 'تم رفض الدفع وإشعار المستخدم'
        });
    } catch (error) {
        console.error('Reject payment error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على إحصائيات المدفوعات (للمشرفين)
 * GET /api/payments/admin/stats
 */
exports.getPaymentStats = async (req, res) => {
    try {
        // إجمالي الإيرادات
        const totalRevenue = await PaymentRequest.sum('amount', { where: { status: 'confirmed' } });
        
        // الإيرادات هذا الشهر
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const monthlyRevenue = await PaymentRequest.sum('amount', {
            where: {
                status: 'confirmed',
                confirmed_at: { [Op.gte]: startOfMonth }
            }
        });
        
        // عدد الطلبات حسب الحالة
        const pendingCount = await PaymentRequest.count({ where: { status: 'pending' } });
        const confirmedCount = await PaymentRequest.count({ where: { status: 'confirmed' } });
        const rejectedCount = await PaymentRequest.count({ where: { status: 'rejected' } });
        
        // عدد الاشتراكات النشطة
        const activeSubscriptions = await Subscription.count({ where: { status: 'active' } });
        
        res.json({
            success: true,
            stats: {
                total_revenue: totalRevenue || 0,
                monthly_revenue: monthlyRevenue || 0,
                pending_count: pendingCount,
                confirmed_count: confirmedCount,
                rejected_count: rejectedCount,
                active_subscriptions: activeSubscriptions
            }
        });
    } catch (error) {
        console.error('Get payment stats error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إدارة خطط الاشتراك (للمشرفين)
 * GET /api/payments/admin/plans
 */
exports.getAllPlans = async (req, res) => {
    try {
        const plans = await SubscriptionPlan.findAll({
            order: [['order_index', 'ASC']]
        });
        res.json({ success: true, plans });
    } catch (error) {
        console.error('Get all plans error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إضافة خطة اشتراك جديدة (للمشرفين)
 * POST /api/payments/admin/plans
 */
exports.addPlan = async (req, res) => {
    try {
        const { name, price, duration_days, max_bots, max_whatsapp_bots, max_telegram_bots, max_messages, has_website, has_ai, has_custom_domain, priority_support, order_index } = req.body;
        
        if (!name || !price) {
            return res.status(400).json({ error: 'اسم الخطة والسعر مطلوبان' });
        }
        
        const plan = await SubscriptionPlan.create({
            name,
            price,
            duration_days: duration_days || null,
            max_bots: max_bots || 1,
            max_whatsapp_bots: max_whatsapp_bots || 1,
            max_telegram_bots: max_telegram_bots || 1,
            max_messages: max_messages || 1000,
            has_website: has_website || false,
            has_ai: has_ai || false,
            has_custom_domain: has_custom_domain || false,
            priority_support: priority_support || false,
            order_index: order_index || 0,
            is_active: true
        });
        
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: 'add_plan',
            target_id: plan.plan_id,
            target_type: 'plan',
            details: { name, price },
            ip_address: req.ip
        });
        
        res.status(201).json({ success: true, plan });
    } catch (error) {
        console.error('Add plan error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث خطة اشتراك (للمشرفين)
 * PUT /api/payments/admin/plans/:planId
 */
exports.updatePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        const updates = req.body;
        
        const plan = await SubscriptionPlan.findByPk(planId);
        if (!plan) {
            return res.status(404).json({ error: 'الخطة غير موجودة' });
        }
        
        await plan.update(updates);
        
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: 'update_plan',
            target_id: plan.plan_id,
            target_type: 'plan',
            details: updates,
            ip_address: req.ip
        });
        
        res.json({ success: true, plan });
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * حذف خطة اشتراك (للمشرفين)
 * DELETE /api/payments/admin/plans/:planId
 */
exports.deletePlan = async (req, res) => {
    try {
        const { planId } = req.params;
        
        const plan = await SubscriptionPlan.findByPk(planId);
        if (!plan) {
            return res.status(404).json({ error: 'الخطة غير موجودة' });
        }
        
        // التحقق من عدم وجود اشتراكات مرتبطة بهذه الخطة
        const subscriptionCount = await Subscription.count({ where: { plan_id: planId } });
        if (subscriptionCount > 0) {
            return res.status(400).json({ error: 'لا يمكن حذف الخطة لوجود اشتراكات مرتبطة بها' });
        }
        
        await plan.destroy();
        
        const { logAdminAction } = require('../utils/logger');
        await logAdminAction({
            admin_id: req.user.user_id,
            action: 'delete_plan',
            target_id: parseInt(planId),
            target_type: 'plan',
            details: { name: plan.name },
            ip_address: req.ip
        });
        
        res.json({ success: true, message: 'تم حذف الخطة بنجاح' });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};