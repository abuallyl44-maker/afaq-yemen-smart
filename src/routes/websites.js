const express = require('express');
const { authenticate } = require('../middleware/auth');
const { ClientWebsite, User, CatalogItem } = require('../models');
const { buildClientWebsite, deleteClientWebsite } = require('../services/websiteBuilderService');
const router = express.Router();

/**
 * GET /api/websites
 * قائمة مواقع العملاء للمستخدم
 */
router.get('/', authenticate, async (req, res) => {
    try {
        const websites = await ClientWebsite.findAll({
            where: { user_id: req.user.user_id }
        });
        res.json(websites);
    } catch (error) {
        console.error('Get websites error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/websites
 * إنشاء موقع جديد
 */
router.post('/', authenticate, async (req, res) => {
    try {
        const { template_name, primary_color, hero_image } = req.body;
        
        // التحقق من الاشتراك (هل يسمح بموقع؟)
        // TODO: التحقق من خطة الاشتراك
        
        // إنشاء نطاق فرعي (أو مجلد)
        const subdomain = `${req.user.company_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user'}_${req.user.user_id}`;
        
        const website = await ClientWebsite.create({
            user_id: req.user.user_id,
            subdomain,
            template_name: template_name || 'afaq-default',
            primary_color: primary_color || req.user.primary_color || '#007bff',
            hero_image: hero_image || req.user.hero_image,
            status: 'trial',
            trial_end_date: new Date(Date.now() + (process.env.WEBSITE_TRIAL_DAYS || 2) * 24 * 60 * 60 * 1000)
        });
        
        // بناء الموقع الفعلي
        await buildClientWebsite(website.site_id);
        
        res.status(201).json(website);
    } catch (error) {
        console.error('Create website error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * GET /api/websites/:siteId
 * تفاصيل موقع معين
 */
router.get('/:siteId', authenticate, async (req, res) => {
    try {
        const { siteId } = req.params;
        
        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });
        
        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }
        
        // رابط الموقع
        const siteUrl = `${process.env.APP_URL}/sites/${website.subdomain}`;
        
        res.json({ ...website.toJSON(), url: siteUrl });
    } catch (error) {
        console.error('Get website error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * PUT /api/websites/:siteId
 * تحديث إعدادات الموقع
 */
router.put('/:siteId', authenticate, async (req, res) => {
    try {
        const { siteId } = req.params;
        const { primary_color, hero_image, status } = req.body;
        
        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });
        
        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }
        
        await website.update({ primary_color, hero_image, status });
        
        // إعادة بناء الموقع بعد التحديث
        await buildClientWebsite(website.site_id);
        
        res.json(website);
    } catch (error) {
        console.error('Update website error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * DELETE /api/websites/:siteId
 * حذف الموقع
 */
router.delete('/:siteId', authenticate, async (req, res) => {
    try {
        const { siteId } = req.params;
        
        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });
        
        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }
        
        // حذف الموقع الفعلي من السيرفر
        await deleteClientWebsite(website.subdomain);
        
        await website.destroy();
        
        res.json({ message: 'تم حذف الموقع بنجاح' });
    } catch (error) {
        console.error('Delete website error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

module.exports = router;