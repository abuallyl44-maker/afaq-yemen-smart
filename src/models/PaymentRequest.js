const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PaymentRequest = sequelize.define('PaymentRequest', {
    payment_id: {
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
    subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    company: {
        type: DataTypes.ENUM('حزمي', 'السريع', 'يمن إكسبرس', 'أخرى'),
        allowNull: false
    },
    transfer_number: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    sender_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('pending', 'confirmed', 'rejected'),
        defaultValue: 'pending'
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    admin_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    requested_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    confirmed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rejected_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'payment_requests',
    timestamps: false
});

module.exports = PaymentRequest;