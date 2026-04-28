const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

const AISetting = sequelize.define('AISetting', {
    ai_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'user_id'
        }
    },
    is_enabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    ai_provider: {
        type: DataTypes.ENUM('openrouter', 'openai', 'local'),
        defaultValue: 'openrouter'
    },
    api_key: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('api_key');
            return rawValue ? decrypt(rawValue) : null;
        },
        set(value) {
            this.setDataValue('api_key', value ? encrypt(value) : null);
        }
    },
    model_name: {
        type: DataTypes.STRING(100),
        defaultValue: 'meta-llama/llama-3.2-3b-instruct:free'
    },
    tone: {
        type: DataTypes.ENUM('رسمي', 'ودود', 'محايد', 'محفز للشراء'),
        defaultValue: 'ودود'
    },
    max_tokens: {
        type: DataTypes.INTEGER,
        defaultValue: 500
    },
    temperature: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0.7
    },
    analyze_intent: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    use_product_images: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    auto_stories: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    fallback_message: {
        type: DataTypes.TEXT,
        defaultValue: 'عذراً، حدث خطأ. يرجى المحاولة لاحقاً أو التواصل مع الدعم.'
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
    tableName: 'ai_settings',
    timestamps: false
});

module.exports = AISetting;