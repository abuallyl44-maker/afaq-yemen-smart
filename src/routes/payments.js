const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { Subscription, SubscriptionPlan, PaymentRequest, User } = require('../models');
const { sendPaymentConfirmationEmail, sendPaymentRejectionEmail } = require('../services/emailService');
const { sendTelegramNotification } = require('../services/notificationService');
const { Op } = require('sequelize');
const router = express.Router();

/**
 * GET /api/payments/plans
 * قائمة خطط الاشتراك المتاحة
 */
router.get('/plans', async (req, res) => {
    try {
        const plans = await SubscriptionPlan.findAll({
            where: { is_active: true },
            order: [['order_index', 'ASC']]
        });
        res.json(plans);
    } catch (error) {
        console.error('Get plans error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * GET /api/payments/my-plan
 * خطة المستخدم الحالية
 */
router.get('/my-plan', authenticate, async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { user_id: req.user.user_id, status: 'active' },
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });
        
        res.json(subscription);
    } catch (error) {
        console.error('Get my plan error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/payments/request
 * إرسال طلب دفع جديد
 */
router.post('/request', authenticate, async (req, res) => {
    try {
        const { plan_id, company, transfer_number, sender_name } = req.body;
        
        // التحقق من صحة رقم الحوالة حسب الشركة
        if (!validateTransferNumber(company, transfer_number)) {
            return res.status(400).json({ error: 'رقم الحوالة غير صحيح حسب تنسيق الشركة' });
        }
        
        const plan = await SubscriptionPlan.findByPk(plan_id);
        if (!plan) {
            return res.status(404).json({ error: 'الخطة غير موجودة' });
        }
        
        // إنشاء طلب الدفع
        const paymentRequest = await PaymentRequest.create({
            user_id: req.user.user_id,
            amount: plan.price,
            company,
            transfer_number,
            sender_name,
            status: 'pending'
        });
        
        // إرسال إشعار إلى المشرفين
        await sendTelegramNotification('admin_group', {
            title: '💰 طلب دفع جديد',
            message: `المستخدم: ${req.user.email}\nالمبلغ: ${plan.price} ريال\nالشركة: ${company}\nرقم الحوالة: ${transfer_number}\nالخطة: ${plan.name}`,
            buttons: [
                { text: '✅ تأكيد', callback: `confirm_payment_${paymentRequest.payment_id}` },
                { text: '❌ رفض', callback: `reject_payment_${paymentRequest.payment_id}` }
            ]
        });
        
        res.status(201).json({
            message: 'تم إرسال طلب الدفع بنجاح، سيتم مراجعته خلال 48 ساعة',
            payment_id: paymentRequest.payment_id
        });
    } catch (error) {
        console.error('Request payment error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * GET /api/payments/requests
 * قائمة طلبات الدفع الخاصة بالمستخدم
 */
router.get('/requests', authenticate, async (req, res) => {
    try {
        const requests = await PaymentRequest.findAll({
            where: { user_id: req.user.user_id },
            order: [['requested_at', 'DESC']]
        });
        res.json(requests);
    } catch (error) {
        console.error('Get payment requests error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

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
 * GET /api/payments/admin/requests
 * قائمة طلبات الدفع المنتظرة (للمشرفين)
 */
router.get('/admin/requests', requireAdmin, async (req, res) => {
    try {
        const pendingRequests = await PaymentRequest.findAll({
            where: { status: 'pending' },
            include: [{ model: User, as: 'user', attributes: ['user_id', 'email', 'company_name'] }],
            order: [['requested_at', 'ASC']]
        });
        
        const confirmedRequests = await PaymentRequest.findAll({
            where: { status: 'confirmed' },
            include: [{ model: User, as: 'user', attributes: ['user_id', 'email', 'company_name'] }],
            order: [['confirmed_at', 'DESC']],
            limit: 50
        });
        
        const rejectedRequests = await PaymentRequest.findAll({
            where: { status: 'rejected' },
            include: [{ model: User, as: 'user', attributes: ['user_id', 'email', 'company_name'] }],
            order: [['rejected_at', 'DESC']],
            limit: 50
        });
        
        res.json({ pending: pendingRequests, confirmed: confirmedRequests, rejected: rejectedRequests });
    } catch (error) {
        console.error('Admin get requests error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/payments/admin/confirm/:paymentId
 * تأكيد الدفع (للمشرفين)
 */
router.post('/admin/confirm/:paymentId', requireAdmin, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { plan_id } = req.body;
        
        const payment = await PaymentRequest.findByPk(paymentId);
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
        
        // إنشاء الاشتراك
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
            subscription_id: subscription.subscription_id
        });
        
        // تحديث المستخدم
        await User.update(
            { current_subscription_id: subscription.subscription_id },
            { where: { user_id: payment.user_id } }
        );
        
        // إرسال إشعار للمستخدم
        const user = await User.findByPk(payment.user_id);
        await sendPaymentConfirmationEmail(user.email, payment.amount, plan.name, endDate?.toLocaleDateString('ar') || 'غير محدود');
        await sendTelegramNotification(user.telegram_id, {
            title: '✅ تم تأكيد دفعتك',
            message: `تم تفعيل اشتراكك في باقة ${plan.name} بنجاح.\nينتهي في: ${endDate?.toLocaleDateString('ar') || 'غير محدود'}`
        });
        
        res.json({ message: 'تم تأكيد الدفع وتفعيل الاشتراك', subscription });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/payments/admin/reject/:paymentId
 * رفض الدفع (للمشرفين)
 */
router.post('/admin/reject/:paymentId', requireAdmin, async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reason } = req.body;
        
        const payment = await PaymentRequest.findByPk(paymentId);
        if (!payment) {
            return res.status(404).json({ error: 'طلب الدفع غير موجود' });
        }
        
        if (payment.status !== 'pending') {
            return res.status(400).json({ error: 'تم معالجة هذا الطلب بالفعل' });
        }
        
        await payment.update({
            status: 'rejected',
            rejected_at: new Date(),
            rejection_reason: reason
        });
        
        // إرسال إشعار للمستخدم
        const user = await User.findByPk(payment.user_id);
        await sendPaymentRejectionEmail(user.email, payment.amount, reason);
        await sendTelegramNotification(user.telegram_id, {
            title: '❌ لم يتم تأكيد دفعتك',
            message: `السبب: ${reason}\nيرجى المحاولة مرة أخرى أو التواصل مع الدعم.`
        });
        
        res.json({ message: 'تم رفض الدفع' });
    } catch (error) {
        console.error('Reject payment error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/payments/admin/plans
 * إضافة خطة اشتراك جديدة (للمشرفين)
 */
router.post('/admin/plans', requireAdmin, async (req, res) => {
    try {
        const plan = await SubscriptionPlan.create(req.body);
        res.status(201).json(plan);
    } catch (error) {
        console.error('Add plan error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * PUT /api/payments/admin/plans/:planId
 * تحديث خطة اشتراك (للمشرفين)
 */
router.put('/admin/plans/:planId', requireAdmin, async (req, res) => {
    try {
        const { planId } = req.params;
        const plan = await SubscriptionPlan.findByPk(planId);
        
        if (!plan) {
            return res.status(404).json({ error: 'الخطة غير موجودة' });
        }
        
        await plan.update(req.body);
        res.json(plan);
    } catch (error) {
        console.error('Update plan error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * DELETE /api/payments/admin/plans/:planId
 * حذف خطة اشتراك (للمشرفين)
 */
router.delete('/admin/plans/:planId', requireAdmin, async (req, res) => {
    try {
        const { planId } = req.params;
        const plan = await SubscriptionPlan.findByPk(planId);
        
        if (!plan) {
            return res.status(404).json({ error: 'الخطة غير موجودة' });
        }
        
        await plan.destroy();
        res.json({ message: 'تم حذف الخطة' });
    } catch (error) {
        console.error('Delete plan error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

module.exports = router;