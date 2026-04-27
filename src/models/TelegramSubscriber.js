/**
 * نموذج مشتركي بوتات تيليجرام للعملاء (TelegramSubscriber)
 * يسجل المستخدمين الذين يتفاعلون مع بوتات تيليجرام التي ينشئها العملاء
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

const TelegramSubscriber = sequelize.define('TelegramSubscriber', {
    subscriber_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        comment: 'معرف فريد للمشترك'
    },
    bot_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'telegram_bots',
            key: 'bot_id'
        },
        comment: 'معرف البوت (ربط بجدول telegram_bots)'
    },
    chat_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'معرف المحادثة في تيليجرام'
    },
    username: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'اسم المستخدم في تيليجرام (@username)'
    },
    first_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'الاسم الأول للمستخدم'
    },
    last_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'الاسم الأخير للمستخدم'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'رقم الهاتف (إذا شاركه المستخدم)'
    },
    subscribed_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'تاريخ الاشتراك'
    },
    last_active: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'آخر تفاعل مع البوت'
    },
    is_blocked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'هل قام المستخدم بحظر البوت؟'
    }
}, {
    tableName: 'telegram_subscribers',
    timestamps: false,
    indexes: [
        { fields: ['bot_id'], name: 'idx_bot_id' },
        { fields: ['chat_id'], name: 'idx_chat_id' },
        { fields: ['chat_id', 'bot_id'], name: 'idx_chat_bot', unique: true },
        { fields: ['is_blocked'], name: 'idx_is_blocked' },
        { fields: ['last_active'], name: 'idx_last_active' }
    ]
});

/**
 * تسجيل أو تحديث مشترك جديد
 */
TelegramSubscriber.registerOrUpdate = async function(botId, chatId, userInfo) {
    const [subscriber, created] = await this.findOrCreate({
        where: { bot_id: botId, chat_id: chatId },
        defaults: {
            bot_id: botId,
            chat_id: chatId,
            username: userInfo.username,
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            subscribed_at: new Date(),
            last_active: new Date(),
            is_blocked: false
        }
    });
    
    if (!created) {
        await subscriber.update({
            username: userInfo.username || subscriber.username,
            first_name: userInfo.first_name || subscriber.first_name,
            last_name: userInfo.last_name || subscriber.last_name,
            last_active: new Date(),
            is_blocked: false
        });
    }
    
    return subscriber;
};

/**
 * تحديث آخر نشاط للمشترك
 */
TelegramSubscriber.prototype.updateActivity = async function() {
    this.last_active = new Date();
    await this.save();
};

/**
 * تسجيل أن المستخدم حظر البوت
 */
TelegramSubscriber.prototype.markAsBlocked = async function() {
    this.is_blocked = true;
    await this.save();
};

/**
 * الحصول على جميع المشتركين النشطين لبوت معين
 */
TelegramSubscriber.getActiveByBot = async function(botId) {
    return await this.findAll({
        where: {
            bot_id: botId,
            is_blocked: false
        },
        order: [['last_active', 'DESC']]
    });
};

/**
 * الحصول على عدد المشتركين النشطين لبوت معين
 */
TelegramSubscriber.getCountByBot = async function(botId) {
    return await this.count({
        where: {
            bot_id: botId,
            is_blocked: false
        }
    });
};

/**
 * الحصول على المشتركين النشطين خلال آخر 7 أيام
 */
TelegramSubscriber.getActiveLastWeek = async function(botId) {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return await this.findAll({
        where: {
            bot_id: botId,
            is_blocked: false,
            last_active: { [Op.gte]: weekAgo }
        }
    });
};

/**
 * الحصول على المشتركين الذين حظروا البوت
 */
TelegramSubscriber.getBlockedByBot = async function(botId) {
    return await this.findAll({
        where: {
            bot_id: botId,
            is_blocked: true
        }
    });
};

/**
 * إرسال رسالة لجميع المشتركين (يتم استخدامها من خدمة البوت)
 */
TelegramSubscriber.prototype.getDisplayName = function() {
    if (this.first_name) {
        return this.last_name ? `${this.first_name} ${this.last_name}` : this.first_name;
    }
    return this.username || this.chat_id.toString();
};

/**
 * حذف المشتركين غير النشطين (أكثر من 90 يوماً)
 */
TelegramSubscriber.deleteInactive = async function(days = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return await this.destroy({
        where: {
            last_active: { [Op.lt]: cutoffDate },
            is_blocked: true
        }
    });
};

module.exports = TelegramSubscriber;