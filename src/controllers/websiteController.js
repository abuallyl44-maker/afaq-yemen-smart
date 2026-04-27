/**
 * وحدة تحكم المواقع الإلكترونية للعملاء (Website Controller)
 * المسؤول عن: إنشاء وإدارة المواقع الإلكترونية للعملاء
 */

const { ClientWebsite, User, SubscriptionPlan, Subscription } = require('../models');
const { buildClientWebsite, deleteClientWebsite, rebuildAllClientWebsites } = require('../services/websiteBuilderService');
const { sendTelegramNotification } = require('../services/notificationService');
const { Op } = require('sequelize');

/**
 * الحصول على جميع مواقع المستخدم
 * GET /api/websites
 */
exports.getWebsites = async (req, res) => {
    try {
        const websites = await ClientWebsite.findAll({
            where: { user_id: req.user.user_id },
            order: [['created_at', 'DESC']]
        });

        // إضافة الرابط الكامل لكل موقع
        const websitesWithUrl = websites.map(site => ({
            ...site.toJSON(),
            url: site.getSiteUrl(),
            trial_days_left: site.getTrialDaysLeft()
        }));

        res.json({ success: true, websites: websitesWithUrl });
    } catch (error) {
        console.error('Get websites error:', error);
        res.status(500).json({ error: 'حدث خطأ في جلب المواقع' });
    }
};

/**
 * إنشاء موقع جديد
 * POST /api/websites
 */
exports.createWebsite = async (req, res) => {
    try {
        const { template_name, primary_color, hero_image } = req.body;

        // التحقق من الاشتراك (هل يسمح بموقع؟)
        const subscription = await Subscription.findOne({
            where: { user_id: req.user.user_id, status: 'active' },
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });

        const hasWebsiteAccess = subscription?.plan?.has_website || false;
        const websiteCount = await ClientWebsite.count({ where: { user_id: req.user.user_id } });

        // إذا كان المستخدم ليس لديه اشتراك مدفوع ولديه بالفعل موقع
        if (!hasWebsiteAccess && websiteCount > 0) {
            return res.status(403).json({
                error: 'لا يمكنك إنشاء موقع إضافي. يرجى الترقية إلى خطة مدفوعة.'
            });
        }

        // إنشاء نطاق فرعي
        const companySlug = req.user.company_name
            ? req.user.company_name.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)
            : `user-${req.user.user_id}`;
        
        const subdomain = `${companySlug}-${Date.now()}`;

        const trialDays = parseInt(process.env.WEBSITE_TRIAL_DAYS) || 2;
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + trialDays);

        const website = await ClientWebsite.create({
            user_id: req.user.user_id,
            subdomain,
            template_name: template_name || 'afaq-default',
            primary_color: primary_color || req.user.primary_color || '#007bff',
            hero_image: hero_image || req.user.hero_image,
            status: hasWebsiteAccess ? 'active' : 'trial',
            trial_end_date: hasWebsiteAccess ? null : trialEndDate,
            created_at: new Date(),
            updated_at: new Date()
        });

        // بناء الموقع
        await buildClientWebsite(website.site_id);

        // تسجيل النشاط
        await sendTelegramNotification(process.env.ADMIN_GROUP_ID, {
            title: '🌐 موقع جديد',
            message: `المستخدم: ${req.user.email}\nاسم الموقع: ${subdomain}\nالحالة: ${hasWebsiteAccess ? 'نشط' : 'تجريبي'}\nالتاريخ: ${new Date().toLocaleString('ar')}`
        });

        res.status(201).json({
            success: true,
            message: hasWebsiteAccess ? 'تم إنشاء الموقع بنجاح' : `تم إنشاء موقع تجريبي لمدة ${trialDays} أيام`,
            website: {
                ...website.toJSON(),
                url: website.getSiteUrl(),
                trial_days_left: website.getTrialDaysLeft()
            }
        });
    } catch (error) {
        console.error('Create website error:', error);
        res.status(500).json({ error: 'حدث خطأ في إنشاء الموقع' });
    }
};

/**
 * الحصول على تفاصيل موقع معين
 * GET /api/websites/:siteId
 */
exports.getWebsite = async (req, res) => {
    try {
        const { siteId } = req.params;

        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });

        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        res.json({
            success: true,
            website: {
                ...website.toJSON(),
                url: website.getSiteUrl(),
                trial_days_left: website.getTrialDaysLeft(),
                is_trial: website.isTrial()
            }
        });
    } catch (error) {
        console.error('Get website error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث إعدادات الموقع
 * PUT /api/websites/:siteId
 */
exports.updateWebsite = async (req, res) => {
    try {
        const { siteId } = req.params;
        const { template_name, primary_color, hero_image } = req.body;

        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });

        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        const updateData = {};
        if (template_name) updateData.template_name = template_name;
        if (primary_color) updateData.primary_color = primary_color;
        if (hero_image) updateData.hero_image = hero_image;
        updateData.updated_at = new Date();

        await website.update(updateData);

        // إعادة بناء الموقع بعد التحديث
        await buildClientWebsite(website.site_id);

        res.json({
            success: true,
            message: 'تم تحديث الموقع بنجاح',
            website: {
                ...website.toJSON(),
                url: website.getSiteUrl()
            }
        });
    } catch (error) {
        console.error('Update website error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * ربط نطاق مخصص
 * POST /api/websites/:siteId/custom-domain
 */
exports.setCustomDomain = async (req, res) => {
    try {
        const { siteId } = req.params;
        const { domain } = req.body;

        if (!domain) {
            return res.status(400).json({ error: 'النطاق المخصص مطلوب' });
        }

        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });

        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        // التحقق من الاشتراك (هل يسمح بنطاق مخصص؟)
        const subscription = await Subscription.findOne({
            where: { user_id: req.user.user_id, status: 'active' },
            include: [{ model: SubscriptionPlan, as: 'plan' }]
        });

        const hasCustomDomain = subscription?.plan?.has_custom_domain || false;

        if (!hasCustomDomain) {
            return res.status(403).json({
                error: 'النطاقات المخصصة غير متوفرة في خطتك الحالية. يرجى الترقية.'
            });
        }

        await website.setCustomDomain(domain);
        await buildClientWebsite(website.site_id);

        res.json({
            success: true,
            message: 'تم ربط النطاق المخصص بنجاح',
            website: {
                ...website.toJSON(),
                url: website.getSiteUrl()
            }
        });
    } catch (error) {
        console.error('Set custom domain error:', error);
        res.status(500).json({ error: error.message || 'حدث خطأ' });
    }
};

/**
 * إزالة النطاق المخصص
 * DELETE /api/websites/:siteId/custom-domain
 */
exports.removeCustomDomain = async (req, res) => {
    try {
        const { siteId } = req.params;

        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });

        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        await website.removeCustomDomain();
        await buildClientWebsite(website.site_id);

        res.json({
            success: true,
            message: 'تم إزالة النطاق المخصص بنجاح',
            website: {
                ...website.toJSON(),
                url: website.getSiteUrl()
            }
        });
    } catch (error) {
        console.error('Remove custom domain error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تبديل حالة الموقع (تفعيل/تعطيل)
 * POST /api/websites/:siteId/toggle
 */
exports.toggleWebsite = async (req, res) => {
    try {
        const { siteId } = req.params;

        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });

        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        if (website.status === 'active') {
            await website.disable();
        } else if (website.status === 'disabled') {
            await website.activate();
        } else {
            return res.status(400).json({ error: 'لا يمكن تبديل حالة هذا الموقع' });
        }

        res.json({
            success: true,
            message: website.status === 'active' ? 'تم تفعيل الموقع' : 'تم تعطيل الموقع',
            status: website.status
        });
    } catch (error) {
        console.error('Toggle website error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * حذف الموقع
 * DELETE /api/websites/:siteId
 */
exports.deleteWebsite = async (req, res) => {
    try {
        const { siteId } = req.params;

        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });

        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        await website.deleteWithFiles();

        res.json({ success: true, message: 'تم حذف الموقع بنجاح' });
    } catch (error) {
        console.error('Delete website error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إعادة بناء موقع معين
 * POST /api/websites/:siteId/rebuild
 */
exports.rebuildWebsite = async (req, res) => {
    try {
        const { siteId } = req.params;

        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });

        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        await buildClientWebsite(website.site_id);

        res.json({ success: true, message: 'تم إعادة بناء الموقع بنجاح' });
    } catch (error) {
        console.error('Rebuild website error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على إحصائيات الموقع
 * GET /api/websites/:siteId/stats
 */
exports.getWebsiteStats = async (req, res) => {
    try {
        const { siteId } = req.params;

        const website = await ClientWebsite.findOne({
            where: { site_id: siteId, user_id: req.user.user_id }
        });

        if (!website) {
            return res.status(404).json({ error: 'الموقع غير موجود' });
        }

        // هنا يمكن إضافة إحصائيات حقيقية (زيارات، مشاهدات، إلخ)
        res.json({
            success: true,
            stats: {
                visits: 0, // سيتم إضافة تكامل مع Google Analytics أو عداد مخصص
                pages: 1,
                last_built: website.updated_at,
                status: website.status,
                trial_days_left: website.getTrialDaysLeft()
            }
        });
    } catch (error) {
        console.error('Get website stats error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

module.exports = exports;