/**
 * نموذج الاشتراكات (Subscription)
 * يسجل اشتراكات المستخدمين في خطط الدفع المختلفة
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const Subscription = sequelize.define('Subscription', {
    subscription_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: 'معرف فريد للاشتراك'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        },
        comment: 'معرف المستخدم (ربط بجدول users)'
    },
    plan_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'subscription_plans',
            key: 'plan_id'
        },
        comment: 'معرف الخطة (ربط بجدول subscription_plans)'
    },
    status: {
        type: DataTypes.ENUM('active', 'expired', 'pending', 'cancelled'),
        defaultValue: 'pending',
        comment: 'حالة الاشتراك'
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'تاريخ بدء الاشتراك'
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'تاريخ انتهاء الاشتراك (null = غير محدود/أبدي)'
    },
    auto_renew: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'هل يتم التجديد تلقائياً؟'
    },
    payment_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'معرف الدفع المرتبط'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'تاريخ الإنشاء'
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'تاريخ آخر تحديث'
    }
}, {
    tableName: 'subscriptions',
    timestamps: false,
    indexes: [
        { fields: ['user_id'], name: 'idx_user_id' },
        { fields: ['status'], name: 'idx_status' },
        { fields: ['end_date'], name: 'idx_end_date' },
        { fields: ['user_id', 'status'], name: 'idx_user_status' }
    ]
});

/**
 * التحقق من أن الاشتراك لا يزال نشطاً
 */
Subscription.prototype.isActive = function() {
    if (this.status !== 'active') return false;
    if (this.end_date && new Date() > new Date(this.end_date)) return false;
    return true;
};

/**
 * الحصول على الأيام المتبقية في الاشتراك
 */
Subscription.prototype.getDaysRemaining = function() {
    if (!this.end_date) return -1; // غير محدود
    const now = new Date();
    const end = new Date(this.end_date);
    if (now >= end) return 0;
    const diff = end - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * إنهاء الاشتراك
 */
Subscription.prototype.expire = async function() {
    this.status = 'expired';
    this.updated_at = new Date();
    await this.save();
};

/**
 * تجديد الاشتراك
 */
Subscription.prototype.renew = async function(daysToAdd) {
    if (this.end_date) {
        const newEndDate = new Date(this.end_date);
        newEndDate.setDate(newEndDate.getDate() + daysToAdd);
        this.end_date = newEndDate;
    } else {
        const newEndDate = new Date();
        newEndDate.setDate(newEndDate.getDate() + daysToAdd);
        this.end_date = newEndDate;
    }
    this.status = 'active';
    this.updated_at = new Date();
    await this.save();
};

/**
 * الحصول على الاشتراك النشط لمستخدم معين
 */
Subscription.getActiveByUser = async function(userId) {
    return await this.findOne({
        where: {
            user_id: userId,
            status: 'active',
            [Op.or]: [
                { end_date: { [Op.gte]: new Date() } },
                { end_date: null }
            ]
        },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
    });
};

/**
 * الحصول على جميع الاشتراكات النشطة
 */
Subscription.getAllActive = async function() {
    return await this.findAll({
        where: {
            status: 'active',
            [Op.or]: [
                { end_date: { [Op.gte]: new Date() } },
                { end_date: null }
            ]
        },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
    });
};

/**
 * الحصول على الاشتراكات المنتهية
 */
Subscription.getExpired = async function() {
    return await this.findAll({
        where: {
            status: 'active',
            end_date: { [Op.lt]: new Date() }
        }
    });
};

/**
 * الحصول على الاشتراكات التي على وشك الانتهاء (خلال X أيام)
 */
Subscription.getExpiringSoon = async function(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return await this.findAll({
        where: {
            status: 'active',
            end_date: { [Op.between]: [new Date(), futureDate] }
        },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
    });
};

/**
 * إنشاء اشتراك جديد بعد تأكيد الدفع
 */
Subscription.createFromPayment = async function(userId, planId, paymentId) {
    const plan = await SubscriptionPlan.findByPk(planId);
    if (!plan) throw new Error('الخطة غير موجودة');
    
    const endDate = plan.duration_days 
        ? new Date(Date.now() + plan.duration_days * 24 * 60 * 60 * 1000)
        : null;
    
    return await this.create({
        user_id: userId,
        plan_id: planId,
        status: 'active',
        start_date: new Date(),
        end_date: endDate,
        auto_renew: false,
        payment_id: paymentId
    });
};

module.exports = Subscription;