const express = require('express');
const { authenticate } = require('../middleware/auth');
const { CatalogItem } = require('../models');
const { Op } = require('sequelize');
const router = express.Router();

/**
 * GET /api/catalog
 * جلب جميع عناصر الكتالوج للمستخدم الحالي
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const items = await CatalogItem.findAll({
            where: { user_id: req.user.user_id },
            order: [['type', 'ASC'], ['order_index', 'ASC'], ['created_at', 'DESC']]
        });
        res.json(items);
    } catch (error) {
        console.error('Get catalog error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * GET /api/catalog/:type
 * جلب عناصر الكتالوج حسب النوع
 */
router.get('/:type', authenticate, async (req, res) => {
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
        res.json(items);
    } catch (error) {
        console.error('Get catalog by type error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/catalog/services
 * إضافة خدمة جديدة
 */
router.post('/services', authenticate, async (req, res) => {
    try {
        const { name, description, price, price_type, image, duration, features } = req.body;
        
        const service = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'service',
            name,
            description,
            price: price || 0,
            image: image || null,
            is_active: true
        });
        
        res.status(201).json(service);
    } catch (error) {
        console.error('Add service error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/catalog/products
 * إضافة منتج جديد
 */
router.post('/products', authenticate, async (req, res) => {
    try {
        const { name, description, price, compare_price, images, stock_quantity, sku, category } = req.body;
        
        const product = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'product',
            name,
            description,
            price: price || 0,
            image: images?.[0] || null,
            // تخزين البيانات الإضافية في description أو حقول مخصصة
            is_active: true
        });
        
        res.status(201).json(product);
    } catch (error) {
        console.error('Add product error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/catalog/offers
 * إضافة عرض ترويجي جديد
 */
router.post('/offers', authenticate, async (req, res) => {
    try {
        const { title, description, discount_type, discount_value, image, coupon_code, start_date, end_date, applicable_on } = req.body;
        
        const offer = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'offer',
            name: title,
            description,
            discount: discount_value,
            image: image || null,
            start_date: start_date ? new Date(start_date) : null,
            end_date: end_date ? new Date(end_date) : null,
            is_active: true
        });
        
        res.status(201).json(offer);
    } catch (error) {
        console.error('Add offer error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/catalog/ads
 * إضافة إعلان جديد
 */
router.post('/ads', authenticate, async (req, res) => {
    try {
        const { title, content, type, image, target_url, start_date, end_date, display_location } = req.body;
        
        const ad = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'ad',
            name: title,
            description: content,
            image: image || null,
            target_url,
            start_date: start_date ? new Date(start_date) : null,
            end_date: end_date ? new Date(end_date) : null,
            is_active: true
        });
        
        res.status(201).json(ad);
    } catch (error) {
        console.error('Add ad error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/catalog/auto-replies
 * إضافة رد آلي جديد
 */
router.post('/auto-replies', authenticate, async (req, res) => {
    try {
        const { trigger_keyword, match_type, reply_type, reply_content, priority } = req.body;
        
        const autoReply = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'auto_reply',
            name: trigger_keyword,
            trigger_keyword,
            reply_content,
            is_active: true
        });
        
        res.status(201).json(autoReply);
    } catch (error) {
        console.error('Add auto reply error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/catalog/stories
 * إضافة حالة ترويجية جديدة
 */
router.post('/stories', authenticate, async (req, res) => {
    try {
        const { platform, media_type, media_content, caption, start_date, end_date } = req.body;
        
        const story = await CatalogItem.create({
            user_id: req.user.user_id,
            type: 'story',
            name: caption || 'حالة ترويجية',
            description: media_content,
            platform,
            media_type,
            start_date: start_date ? new Date(start_date) : new Date(),
            end_date: end_date ? new Date(end_date) : null,
            is_active: true
        });
        
        res.status(201).json(story);
    } catch (error) {
        console.error('Add story error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * PUT /api/catalog/:itemId
 * تحديث عنصر في الكتالوج
 */
router.put('/:itemId', authenticate, async (req, res) => {
    try {
        const { itemId } = req.params;
        const updates = req.body;
        
        const item = await CatalogItem.findOne({
            where: { item_id: itemId, user_id: req.user.user_id }
        });
        
        if (!item) {
            return res.status(404).json({ error: 'العنصر غير موجود' });
        }
        
        await item.update(updates);
        
        res.json(item);
    } catch (error) {
        console.error('Update catalog item error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * DELETE /api/catalog/:itemId
 * حذف عنصر من الكتالوج
 */
router.delete('/:itemId', authenticate, async (req, res) => {
    try {
        const { itemId } = req.params;
        
        const item = await CatalogItem.findOne({
            where: { item_id: itemId, user_id: req.user.user_id }
        });
        
        if (!item) {
            return res.status(404).json({ error: 'العنصر غير موجود' });
        }
        
        await item.destroy();
        
        res.json({ message: 'تم الحذف بنجاح' });
    } catch (error) {
        console.error('Delete catalog item error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/catalog/reorder
 * إعادة ترتيب العناصر
 */
router.post('/reorder', authenticate, async (req, res) => {
    try {
        const { items } = req.body; // [{ item_id, order_index }]
        
        for (const item of items) {
            await CatalogItem.update(
                { order_index: item.order_index },
                { where: { item_id: item.item_id, user_id: req.user.user_id } }
            );
        }
        
        res.json({ message: 'تم تحديث الترتيب بنجاح' });
    } catch (error) {
        console.error('Reorder catalog error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

module.exports = router;