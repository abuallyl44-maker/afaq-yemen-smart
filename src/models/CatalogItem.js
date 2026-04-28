const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CatalogItem = sequelize.define('CatalogItem', {
    item_id: {
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
        type: DataTypes.ENUM('service', 'product', 'offer', 'ad', 'auto_reply', 'story'),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    image: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    trigger_keyword: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    reply_content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    discount: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: true
    },
    target_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    platform: {
        type: DataTypes.ENUM('whatsapp', 'telegram', 'website', 'both'),
        allowNull: true
    },
    media_type: {
        type: DataTypes.ENUM('text', 'image', 'video'),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    order_index: {
        type: DataTypes.INTEGER,
        defaultValue: 0
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
    tableName: 'catalog_items',
    timestamps: false
});

module.exports = CatalogItem;