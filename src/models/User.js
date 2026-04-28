const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const User = sequelize.define('User', {
    user_id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    telegram_id: {
        type: DataTypes.BIGINT,
        unique: true,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    is_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    verification_code: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    code_expiry: {
        type: DataTypes.DATE,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'suspended', 'deleted'),
        defaultValue: 'active'
    },
    role: {
        type: DataTypes.ENUM('user', 'admin', 'support', 'content_editor'),
        defaultValue: 'user'
    },
    company_name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    company_logo: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    company_description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    business_type: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    hero_image: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    primary_color: {
        type: DataTypes.STRING(7),
        defaultValue: '#007bff'
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    current_subscription_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    },
    ip_address: {
        type: DataTypes.STRING(45),
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: false,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password_hash) {
                user.password_hash = await bcrypt.hash(user.password_hash, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password_hash')) {
                user.password_hash = await bcrypt.hash(user.password_hash, 10);
            }
        }
    }
});

// دالة للتحقق من كلمة السر
User.prototype.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password_hash);
};

module.exports = User;