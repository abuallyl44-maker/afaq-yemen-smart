/**
 * نموذج سجل حركات المشرفين (AdminLog)
 * لتسجيل جميع إجراءات المشرفين في النظام
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminLog = sequelize.define('AdminLog', {
    log_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    admin_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    action: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    target_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    target_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('details');
            if (!rawValue) return null;
            try {
                return JSON.parse(rawValue);
            } catch {
                return rawValue;
            }
        },
        set(value) {
            if (typeof value === 'object') {
                this.setDataValue('details', JSON.stringify(value));
            } else {
                this.setDataValue('details', value);
            }
        }
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'admin_logs',
    timestamps: false,
    indexes: [
        { fields: ['admin_id'] },
        { fields: ['action'] },
        { fields: ['created_at'] },
        { fields: ['target_id', 'target_type'] }
    ]
});

/**
 * تسجيل إجراء جديد
 */
AdminLog.log = async function(adminId, action, targetId = null, targetType = null, details = null, ipAddress = null) {
    return await this.create({
        admin_id: adminId,
        action,
        target_id: targetId,
        target_type: targetType,
        details,
        ip_address: ipAddress,
        created_at: new Date()
    });
};

/**
 * الحصول على سجل إجراءات مشرف معين
 */
AdminLog.getAdminLogs = async function(adminId, limit = 100, offset = 0) {
    return await this.findAndCountAll({
        where: { admin_id: adminId },
        order: [['created_at', 'DESC']],
        limit,
        offset
    });
};

/**
 * الحصول على سجل الإجراءات حسب النوع
 */
AdminLog.getActionsByType = async function(action, limit = 100, offset = 0) {
    return await this.findAndCountAll({
        where: { action },
        order: [['created_at', 'DESC']],
        limit,
        offset
    });
};

module.exports = AdminLog;