/**
 * نموذج طلبات استرداد الحساب (PasswordResetRequest)
 * لإدارة طلبات نسيان كلمة السر
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PasswordResetRequest = sequelize.define('PasswordResetRequest', {
    request_id: {
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
    email: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    verification_code: {
        type: DataTypes.STRING(10),
        allowNull: false
    },
    code_expiry: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending'
    },
    admin_decision: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    admin_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    temporary_password: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    resolved_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'password_reset_requests',
    timestamps: false,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['email'] },
        { fields: ['status'] },
        { fields: ['code_expiry'] }
    ]
});

/**
 * التحقق من صلاحية الكود
 */
PasswordResetRequest.prototype.isCodeValid = function() {
    return this.status === 'pending' && new Date() < this.code_expiry;
};

/**
 * الموافقة على الطلب
 */
PasswordResetRequest.prototype.approve = async function(temporaryPassword, adminNotes = null) {
    this.status = 'approved';
    this.temporary_password = temporaryPassword;
    if (adminNotes) this.admin_notes = adminNotes;
    this.resolved_at = new Date();
    await this.save();
};

/**
 * رفض الطلب
 */
PasswordResetRequest.prototype.reject = async function(reason, adminNotes = null) {
    this.status = 'rejected';
    this.admin_decision = reason;
    if (adminNotes) this.admin_notes = adminNotes;
    this.resolved_at = new Date();
    await this.save();
};

module.exports = PasswordResetRequest;