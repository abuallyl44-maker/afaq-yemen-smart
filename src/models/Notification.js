/**
 * نموذج الإشعارات (Notification)
 * لتخزين وإدارة إشعارات المستخدمين
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
    notification_id: {
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
    type: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    sent_via_telegram: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    sent_via_email: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'notifications',
    timestamps: false,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['is_read'] },
        { fields: ['created_at'] }
    ]
});

/**
 * تحديد الإشعار كمقروء
 */
Notification.prototype.markAsRead = async function() {
    this.is_read = true;
    await this.save();
};

/**
 * تحديد جميع إشعارات المستخدم كمقروءة
 */
Notification.markAllAsRead = async function(userId) {
    await this.update(
        { is_read: true },
        { where: { user_id: userId, is_read: false } }
    );
};

/**
 * حذف الإشعارات القديمة (أكثر من 30 يوماً)
 */
Notification.deleteOldNotifications = async function(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    await this.destroy({
        where: {
            created_at: { [Op.lt]: cutoffDate },
            is_read: true
        }
    });
};

module.exports = Notification;