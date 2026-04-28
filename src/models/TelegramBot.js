const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

const TelegramBotModel = sequelize.define('TelegramBot', {
    bot_id: {
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
    bot_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    bot_token: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('bot_token');
            return rawValue ? decrypt(rawValue) : null;
        },
        set(value) {
            this.setDataValue('bot_token', value ? encrypt(value) : null);
        }
    },
    bot_username: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'paused', 'pending'),
        defaultValue: 'pending'
    },
    welcome_message: {
        type: DataTypes.TEXT,
        allowNull: true
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
    tableName: 'telegram_bots',
    timestamps: false
});

module.exports = TelegramBotModel;