/**
 * نموذج استخدام الرسائل (MessageUsage)
 * لتتبع عدد الرسائل التي يرسلها ويستقبلها كل مستخدم
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessageUsage = sequelize.define('MessageUsage', {
    usage_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    bot_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    bot_type: {
        type: DataTypes.ENUM('whatsapp', 'telegram'),
        allowNull: true
    },
    month: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: () => new Date().toISOString().slice(0, 7) + '-01'
    },
    message_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'message_usage',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'bot_id', 'bot_type', 'month']
        },
        {
            fields: ['user_id', 'month']
        }
    ]
});

/**
 * زيادة عدد الرسائل للمستخدم
 * @param {number} userId - معرف المستخدم
 * @param {string} botType - نوع البوت
 * @param {number} botId - معرف البوت (اختياري)
 */
MessageUsage.incrementCount = async function(userId, botType, botId = null) {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    
    const [usage, created] = await this.findOrCreate({
        where: {
            user_id: userId,
            bot_type: botType,
            bot_id: botId,
            month: currentMonth
        },
        defaults: {
            user_id: userId,
            bot_type: botType,
            bot_id: botId,
            month: currentMonth,
            message_count: 0
        }
    });
    
    usage.message_count += 1;
    usage.updated_at = new Date();
    await usage.save();
    
    return usage.message_count;
};

/**
 * الحصول على عدد الرسائل للمستخدم في الشهر الحالي
 * @param {number} userId - معرف المستخدم
 */
MessageUsage.getCurrentMonthCount = async function(userId) {
    const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
    
    const usage = await this.findOne({
        where: {
            user_id: userId,
            month: currentMonth
        },
        attributes: [[sequelize.fn('SUM', sequelize.col('message_count')), 'total']]
    });
    
    return parseInt(usage?.dataValues?.total || 0);
};

/**
 * إعادة تعيين عداد الرسائل لبداية الشهر الجديد
 */
MessageUsage.resetMonthlyCounters = async function() {
    // هذه الوظيفة تستخدم في المهام المجدولة
    console.log('Monthly message counters will be reset via cron job');
};

module.exports = MessageUsage;