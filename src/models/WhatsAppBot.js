const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const WhatsAppBot = sequelize.define('WhatsAppBot', {
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
    status: {
        type: DataTypes.ENUM('active', 'paused', 'pending', 'expired'),
        defaultValue: 'pending'
    },
    delete_tracking: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
    tableName: 'whatsapp_bots',
    timestamps: false
});

module.exports = WhatsAppBot;