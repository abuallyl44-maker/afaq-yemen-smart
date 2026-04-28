/**
 * نموذج خطط الاشتراك (SubscriptionPlan)
 * يحدد ميزات وحدود كل خطة اشتراك في النظام
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
    plan_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: 'معرف فريد للخطة'
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'اسم الخطة (مجاني، أساسي، احترافي، سنوي، أبدي)'
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        comment: 'السعر بالريال اليمني'
    },
    duration_days: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'المدة بالأيام (null = غير محدود / أبدي)'
    },
    max_bots: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'الحد الأقصى لعدد البوتات (واتساب + تيليجرام)'
    },
    max_whatsapp_bots: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'الحد الأقصى لبوتات واتساب'
    },
    max_telegram_bots: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: 'الحد الأقصى لبوتات تيليجرام'
    },
    max_messages: {
        type: DataTypes.INTEGER,
        defaultValue: 1000,
        comment: 'الحد الأقصى للرسائل شهرياً'
    },
    has_website: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'هل تشمل الخطة موقعاً إلكترونياً؟'
    },
    has_ai: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'هل تشمل الخطة الذكاء الاصطناعي؟'
    },
    has_custom_domain: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'هل تسمح الخطة بنطاق مخصص؟'
    },
    priority_support: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'هل تشمل الخطة دعم أولوية؟'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'هل الخطة مفعلة ومعروضة للمستخدمين؟'
    },
    order_index: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'ترتيب ظهور الخطة (1 = الأول)'
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
    tableName: 'subscription_plans',
    timestamps: false,
    indexes: [
        { fields: ['is_active'], name: 'idx_is_active' },
        { fields: ['order_index'], name: 'idx_order_index' }
    ]
});

/**
 * الحصول على الخطط النشطة فقط
 */
SubscriptionPlan.getActivePlans = async function() {
    return await this.findAll({
        where: { is_active: true },
        order: [['order_index', 'ASC']]
    });
};

/**
 * الحصول على الخطة الافتراضية (المجانية)
 */
SubscriptionPlan.getFreePlan = async function() {
    return await this.findOne({
        where: { name: 'مجاني', is_active: true }
    });
};

/**
 * التحقق مما إذا كانت الخطة تسمح بموقع إلكتروني
 */
SubscriptionPlan.prototype.allowsWebsite = function() {
    return this.has_website === true;
};

/**
 * التحقق مما إذا كانت الخطة تسمح بالذكاء الاصطناعي
 */
SubscriptionPlan.prototype.allowsAI = function() {
    return this.has_ai === true;
};

/**
 * التحقق مما إذا كانت الخطة تسمح بنطاق مخصص
 */
SubscriptionPlan.prototype.allowsCustomDomain = function() {
    return this.has_custom_domain === true;
};

/**
 * الحصول على السعر مع العملة
 */
SubscriptionPlan.prototype.getFormattedPrice = function() {
    if (this.price === 0) return 'مجاني';
    return `${this.price.toLocaleString()} ريال`;
};

/**
 * الحصول على المدة كـ نص
 */
SubscriptionPlan.prototype.getDurationText = function() {
    if (this.duration_days === null) return 'أبدي';
    if (this.duration_days === 30) return 'شهرياً';
    if (this.duration_days === 365) return 'سنوياً';
    return `${this.duration_days} يوماً`;
};

module.exports = SubscriptionPlan;