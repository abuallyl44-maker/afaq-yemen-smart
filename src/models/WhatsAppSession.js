const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

const WhatsAppSession = sequelize.define('WhatsAppSession', {
    session_id: {
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
        }
    },
    session_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    session_data: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('session_data');
            return rawValue ? decrypt(rawValue) : null;
        },
        set(value) {
            this.setDataValue('session_data', value ? encrypt(value) : null);
        }
    },
    phone_number: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    is_valid: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_active: {
        type: DataTypes.DATE,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'whatsapp_sessions',
    timestamps: false
});

module.exports = WhatsAppSession;