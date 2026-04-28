/**
 * نموذج إعدادات مراقبة التعديل والحذف (DeleteEditTrackingSetting)
 * لإدارة ميزة مراقبة التعديل والحذف في بوتات واتساب
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DeleteEditTrackingSetting = sequelize.define('DeleteEditTrackingSetting', {
    setting_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    bot_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'whatsapp_bots',
            key: 'bot_id'
        },
        unique: true
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    notify_to_type: {
        type: DataTypes.ENUM('group', 'contact'),
        defaultValue: 'group'
    },
    notify_target_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    track_deletes: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    track_edits: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    include_original: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    custom_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '⚠️ تنبيه: تم تعديل أو حذف رسالة في المحادثة'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'delete_edit_tracking_settings',
    timestamps: false
});

/**
 * تفعيل أو تعطيل المراقبة
 */
DeleteEditTrackingSetting.prototype.toggle = async function() {
    this.is_enabled = !this.is_enabled;
    this.updated_at = new Date();
    await this.save();
    return this.is_enabled;
};

/**
 * بناء رسالة التنبيه
 */
DeleteEditTrackingSetting.prototype.buildAlertMessage = function(eventData) {
    let message = this.custom_message + '\n\n';
    message += `📅 التاريخ: ${new Date().toLocaleString('ar')}\n`;
    message += `👤 المرسل: ${eventData.sender || 'غير معروف'}\n`;
    message += `📝 نوع الحدث: ${eventData.type === 'delete' ? 'حذف' : 'تعديل'}\n`;
    
    if (this.include_original && eventData.original_text) {
        message += `\n📄 النص الأصلي: "${eventData.original_text}"\n`;
    }
    
    if (eventData.type === 'edit' && eventData.new_text) {
        message += `\n📝 النص الجديد: "${eventData.new_text}"\n`;
    }
    
    message += `\n⚠️ ملاحظة: لا يمكن استعادة الرسالة المحذوفة أو منع تعديلها. هذا التنبيه هو للإشعار فقط.`;
    
    return message;
};

module.exports = DeleteEditTrackingSetting;