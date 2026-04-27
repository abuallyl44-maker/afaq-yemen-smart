/**
 * نموذج تذاكر الدعم (SupportTicket)
 * لإدارة استفسارات وشكاوى المستخدمين
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupportTicket = sequelize.define('SupportTicket', {
    ticket_id: {
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
    subject: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('استفسار', 'مشكلة تقنية', 'شكوى', 'اقتراح'),
        defaultValue: 'استفسار'
    },
    status: {
        type: DataTypes.ENUM('open', 'in_progress', 'closed'),
        defaultValue: 'open'
    },
    admin_reply: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    replied_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    closed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'support_tickets',
    timestamps: false,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['status'] },
        { fields: ['created_at'] }
    ]
});

/**
 * إغلاق التذكرة
 */
SupportTicket.prototype.close = async function(reply = null) {
    if (reply) {
        this.admin_reply = reply;
        this.replied_at = new Date();
    }
    this.status = 'closed';
    this.closed_at = new Date();
    await this.save();
};

/**
 * تحديث حالة التذكرة إلى قيد المعالجة
 */
SupportTicket.prototype.startProcessing = async function() {
    this.status = 'in_progress';
    await this.save();
};

module.exports = SupportTicket;