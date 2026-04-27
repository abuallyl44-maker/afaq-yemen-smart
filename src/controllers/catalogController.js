/**
 * وحدة تحكم الكتالوج (Catalog Controller)
 * المسؤول عن: إدارة الخدمات، المنتجات، العروض، الإعلانات، الردود الآلية، الحالات
 */

const { CatalogItem, User } = require('../models');
const { Op } = require('sequelize');
const { rebuildAllClientWebsites } = require('../services/websiteBuilderService');

/**
 * الحصول على جميع عناصر الكتالوج
 * GET /api/catalog
 */
exports.getAllItems = async (req, res) => {
    try {
        const items = await CatalogItem.findAll({
            where: { user_id: req.user.user_id },
            order: [['type', 'ASC'], ['order_index', 'ASC'], ['created_at', 'DESC']]
        });
        res.json({ success: true, items });
    } catch (error) {
        console.error('Get catalog error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على عناصر الكتالوج حسب النوع
 * GET /api/catalog/:type
 */
exports.getItemsByType = async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['service', 'product', 'offer', 'ad', 'auto_reply', 'story'];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'نوع غير صالح' });
        }
        
        const items = await CatalogItem.findAll({
            where: { user_id: req.user.user_id, type },
            order: [['order_index', 'ASC'], ['created_at', 'DESC']]
        });
        res.json({ success: true, items });
    } catch (error) {
        console.error('Get catalog by type error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إضافة خدمة جديدة
 * POST /api/catalog/services
 */
exports.addService = async (req, res) => {
    try {
        const { name, description, price, price_type, image, duration, features } = req.body;
        
        if (!name || name.trim().length < 3) {
            return res.status(400).json({ error: 'اسم الخدمة مطلوب' });
        }
        
        const service = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'service',
            name: name.trim(),
            description: description || '',
            price: price || 0,
            image: image || null,
            is_active: true
        });
        
        // إعادة بناء موقع العميل
        await rebuildAllClientWebsites(req.user.user_id);
        
        res.status(201).json({ success: true, item: service });
    } catch (error) {
        console.error('Add service error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إضافة منتج جديد
 * POST /api/catalog/products
 */
exports.addProduct = async (req, res) => {
    try {
        const { name, description, price, compare_price, images, stock_quantity, sku, category } = req.body;
        
        if (!name || name.trim().length < 3) {
            return res.status(400).json({ error: 'اسم المنتج مطلوب' });
        }
        
        const product = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'product',
            name: name.trim(),
            description: description || '',
            price: price || 0,
            image: images?.[0] || null,
            is_active: true
        });
        
        await rebuildAllClientWebsites(req.user.user_id);
        
        res.status(201).json({ success: true, item: product });
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إضافة عرض ترويجي جديد
 * POST /api/catalog/offers
 */
exports.addOffer = async (req, res) => {
    try {
        const { title, description, discount_type, discount_value, image, coupon_code, start_date, end_date, applicable_on } = req.body;
        
        if (!title || !discount_value) {
            return res.status(400).json({ error: 'عنوان العرض وقيمة الخصم مطلوبان' });
        }
        
        const offer = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'offer',
            name: title.trim(),
            description: description || '',
            discount: discount_value,
            image: image || null,
            start_date: start_date ? new Date(start_date) : new Date(),
            end_date: end_date ? new Date(end_date) : null,
            is_active: true
        });
        
        await rebuildAllClientWebsites(req.user.user_id);
        
        res.status(201).json({ success: true, item: offer });
    } catch (error) {
        console.error('Add offer error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إضافة إعلان جديد
 * POST /api/catalog/ads
 */
exports.addAd = async (req, res) => {
    try {
        const { title, content, type, image, target_url, start_date, end_date, display_location } = req.body;
        
        if (!title || !target_url) {
            return res.status(400).json({ error: 'عنوان الإعلان والرابط مطلوبان' });
        }
        
        const ad = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'ad',
            name: title.trim(),
            description: content || '',
            image: image || null,
            target_url,
            start_date: start_date ? new Date(start_date) : new Date(),
            end_date: end_date ? new Date(end_date) : null,
            is_active: true
        });
        
        await rebuildAllClientWebsites(req.user.user_id);
        
        res.status(201).json({ success: true, item: ad });
    } catch (error) {
        console.error('Add ad error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إضافة رد آلي جديد
 * POST /api/catalog/auto-replies
 */
exports.addAutoReply = async (req, res) => {
    try {
        const { trigger_keyword, match_type, reply_type, reply_content, priority } = req.body;
        
        if (!trigger_keyword || !reply_content) {
            return res.status(400).json({ error: 'الكلمة المفتاحية ومحتوى الرد مطلوبان' });
        }
        
        const autoReply = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'auto_reply',
            name: trigger_keyword.trim(),
            trigger_keyword: trigger_keyword.trim(),
            reply_content,
            is_active: true
        });
        
        res.status(201).json({ success: true, item: autoReply });
    } catch (error) {
        console.error('Add auto reply error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إضافة حالة ترويجية جديدة
 * POST /api/catalog/stories
 */
exports.addStory = async (req, res) => {
    try {
        const { platform, media_type, media_content, caption, start_date, end_date } = req.body;
        
        if (!media_content) {
            return res.status(400).json({ error: 'محتوى الحالة مطلوب' });
        }
        
        const story = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'story',
            name: caption || 'حالة ترويجية',
            description: media_content,
            platform: platform || 'both',
            media_type: media_type || 'text',
            start_date: start_date ? new Date(start_date) : new Date(),
            end_date: end_date ? new Date(end_date) : null,
            is_active: true
        });
        
        res.status(201).json({ success: true, item: story });
    } catch (error) {
        console.error('Add story error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث عنصر في الكتالوج
 * PUT /api/catalog/:itemId
 */
exports.updateItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const updates = req.body;
        
        const item = await CatalogItem.findOne({
            where: { item_id: itemId, user_id: req.user.user_id }
        });
        
        if (!item) {
            return res.status(404).json({ error: 'العنصر غير موجود' });
        }
        
        // منع تحديث الحقول الحساسة
        delete updates.item_id;
        delete updates.user_id;
        delete updates.created_at;
        
        await item.update(updates);
        
        // إعادة بناء موقع العميل إذا كان التحديث يؤثر على الموقع
        if (['service', 'product', 'offer', 'ad'].includes(item.type)) {
            await rebuildAllClientWebsites(req.user.user_id);
        }
        
        res.json({ success: true, item });
    } catch (error) {
        console.error('Update catalog item error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * حذف عنصر من الكتالوج
 * DELETE /api/catalog/:itemId
 */
exports.deleteItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        
        const item = await CatalogItem.findOne({
            where: { item_id: itemId, user_id: req.user.user_id }
        });
        
        if (!item) {
            return res.status(404).json({ error: 'العنصر غير موجود' });
        }
        
        const itemType = item.type;
        await item.destroy();
        
        if (['service', 'product', 'offer', 'ad'].includes(itemType)) {
            await rebuildAllClientWebsites(req.user.user_id);
        }
        
        res.json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (error) {
        console.error('Delete catalog item error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إعادة ترتيب العناصر
 * POST /api/catalog/reorder
 */
exports.reorderItems = async (req, res) => {
    try {
        const { items } = req.body; // [{ item_id, order_index }]
        
        for (const item of items) {
            await CatalogItem.update(
                { order_index: item.order_index },
                { where: { item_id: item.item_id, user_id: req.user.user_id } }
            );
        }
        
        await rebuildAllClientWebsites(req.user.user_id);
        
        res.json({ success: true, message: 'تم تحديث الترتيب بنجاح' });
    } catch (error) {
        console.error('Reorder catalog error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تفعيل/تعطيل عنصر
 * POST /api/catalog/:itemId/toggle
 */
exports.toggleItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        
        const item = await CatalogItem.findOne({
            where: { item_id: itemId, user_id: req.user.user_id }
        });
        
        if (!item) {
            return res.status(404).json({ error: 'العنصر غير موجود' });
        }
        
        await item.update({ is_active: !item.is_active });
        
        if (['service', 'product', 'offer', 'ad'].includes(item.type)) {
            await rebuildAllClientWebsites(req.user.user_id);
        }
        
        res.json({ 
            success: true, 
            message: item.is_active ? 'تم تفعيل العنصر' : 'تم تعطيل العنصر',
            is_active: item.is_active
        });
    } catch (error) {
        console.error('Toggle catalog item error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};