/**
 * نموذج مواقع العملاء الإلكترونية (ClientWebsite)
 * لإدارة المواقع الإلكترونية التي ينشئها المستخدمون
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClientWebsite = sequelize.define('ClientWebsite', {
    site_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: 'معرف فريد للموقع'
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        },
        comment: 'معرف صاحب الموقع (ربط بجدول users)'
    },
    subdomain: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
        comment: 'النطاق الفرعي (مثل: company.afaqyemen.com)'
    },
    custom_domain: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true,
        comment: 'نطاق مخصص (مثل: company.com) - اختياري'
    },
    template_name: {
        type: DataTypes.STRING(100),
        defaultValue: 'afaq-default',
        allowNull: false,
        comment: 'اسم القالب المستخدم'
    },
    primary_color: {
        type: DataTypes.STRING(7),
        defaultValue: '#007bff',
        allowNull: false,
        validate: {
            is: /^#[0-9A-Fa-f]{6}$/i,
            comment: 'اللون الرئيسي بصيغة HEX'
        }
    },
    hero_image: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'رابط صورة الخلفية الرئيسية'
    },
    status: {
        type: DataTypes.ENUM('active', 'building', 'disabled', 'trial'),
        defaultValue: 'building',
        allowNull: false,
        comment: 'حالة الموقع: نشط، قيد الإنشاء، معطل، تجريبي'
    },
    trial_end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'تاريخ انتهاء الفترة التجريبية'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        comment: 'تاريخ الإنشاء'
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false,
        comment: 'تاريخ آخر تحديث'
    }
}, {
    tableName: 'client_websites',
    timestamps: false,
    indexes: [
        { fields: ['user_id'], name: 'idx_user_id' },
        { fields: ['subdomain'], name: 'idx_subdomain', unique: true },
        { fields: ['custom_domain'], name: 'idx_custom_domain', unique: true },
        { fields: ['status'], name: 'idx_status' },
        { fields: ['created_at'], name: 'idx_created_at' }
    ]
});

/**
 * الحصول على رابط الموقع الكامل
 * @returns {string} الرابط الكامل للموقع
 */
ClientWebsite.prototype.getSiteUrl = function() {
    if (this.custom_domain) {
        return `https://${this.custom_domain}`;
    }
    return `https://${this.subdomain}.${process.env.APP_URL?.replace('https://', '').replace('http://', '') || 'afaqyemen.com'}`;
};

/**
 * التحقق مما إذا كان الموقع في الفترة التجريبية
 * @returns {boolean}
 */
ClientWebsite.prototype.isTrial = function() {
    if (this.status !== 'trial') return false;
    if (!this.trial_end_date) return true;
    return new Date() < new Date(this.trial_end_date);
};

/**
 * الحصول على الأيام المتبقية في الفترة التجريبية
 * @returns {number} عدد الأيام المتبقية (0 إذا انتهت)
 */
ClientWebsite.prototype.getTrialDaysLeft = function() {
    if (!this.trial_end_date) return 0;
    const end = new Date(this.trial_end_date);
    const now = new Date();
    if (now >= end) return 0;
    const diff = end - now;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

/**
 * تفعيل الموقع
 */
ClientWebsite.prototype.activate = async function() {
    this.status = 'active';
    this.updated_at = new Date();
    await this.save();
};

/**
 * تعطيل الموقع
 */
ClientWebsite.prototype.disable = async function() {
    this.status = 'disabled';
    this.updated_at = new Date();
    await this.save();
};

/**
 * بدء الفترة التجريبية
 * @param {number} days - عدد أيام التجربة
 */
ClientWebsite.prototype.startTrial = async function(days = 2) {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    
    this.status = 'trial';
    this.trial_end_date = endDate;
    this.updated_at = new Date();
    await this.save();
};

/**
 * ربط نطاق مخصص
 * @param {string} domain - النطاق المخصص
 */
ClientWebsite.prototype.setCustomDomain = async function(domain) {
    // التحقق من صحة النطاق
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
    if (!domainRegex.test(domain)) {
        throw new Error('النطاق المخصص غير صالح');
    }
    
    // التحقق من عدم استخدام النطاق من قبل
    const existing = await ClientWebsite.findOne({ where: { custom_domain: domain } });
    if (existing && existing.site_id !== this.site_id) {
        throw new Error('هذا النطاق مستخدم بالفعل');
    }
    
    this.custom_domain = domain;
    this.updated_at = new Date();
    await this.save();
};

/**
 * إزالة النطاق المخصص
 */
ClientWebsite.prototype.removeCustomDomain = async function() {
    this.custom_domain = null;
    this.updated_at = new Date();
    await this.save();
};

/**
 * الحصول على جميع مواقع مستخدم معين
 * @param {number} userId - معرف المستخدم
 */
ClientWebsite.getByUser = async function(userId) {
    return await this.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']]
    });
};

/**
 * الحصول على المواقع النشطة فقط
 */
ClientWebsite.getActiveSites = async function() {
    return await this.findAll({
        where: { status: 'active' },
        order: [['created_at', 'DESC']]
    });
};

/**
 * الحصول على المواقع المنتهية صلاحيتها تجريبياً
 */
ClientWebsite.getExpiredTrials = async function() {
    return await this.findAll({
        where: {
            status: 'trial',
            trial_end_date: { [Op.lt]: new Date() }
        }
    });
};

/**
 * إعادة بناء جميع مواقع المستخدم
 * @param {number} userId - معرف المستخدم
 */
ClientWebsite.rebuildAllForUser = async function(userId) {
    const sites = await this.findAll({ where: { user_id: userId } });
    const { rebuildClientWebsite } = require('../services/websiteBuilderService');
    
    for (const site of sites) {
        await rebuildClientWebsite(site.site_id);
    }
};

/**
 * حذف موقع وملفاته
 */
ClientWebsite.prototype.deleteWithFiles = async function() {
    const { deleteClientWebsite } = require('../services/websiteBuilderService');
    
    // حذف الموقع من السيرفر
    await deleteClientWebsite(this.subdomain);
    
    // حذف من قاعدة البيانات
    await this.destroy();
};

module.exports = ClientWebsite;
