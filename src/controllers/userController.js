/**
 * وحدة تحكم المستخدمين (User Controller)
 * المسؤول عن: إدارة معلومات المستخدمين، إعدادات المؤسسة
 */

const { User, Subscription, WhatsAppBot, TelegramBot, ClientWebsite, CatalogItem, AISetting } = require('../models');
const { uploadToLocal, deleteFile } = require('../utils/fileUpload');
const { rebuildAllClientWebsites } = require('../services/websiteBuilderService');

/**
 * الحصول على معلومات المستخدم الحالي
 * GET /api/users/me
 */
exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.user_id, {
            attributes: { exclude: ['password_hash', 'verification_code', 'code_expiry'] }
        });

        // جلب الاشتراك الحالي
        const subscription = await Subscription.findOne({
            where: { user_id: req.user.user_id, status: 'active' }
        });

        // إحصائيات سريعة
        const whatsappCount = await WhatsAppBot.count({ where: { user_id: req.user.user_id } });
        const telegramCount = await TelegramBot.count({ where: { user_id: req.user.user_id } });
        const websiteCount = await ClientWebsite.count({ where: { user_id: req.user.user_id } });

        res.json({
            success: true,
            user,
            subscription,
            stats: {
                whatsapp_bots: whatsappCount,
                telegram_bots: telegramCount,
                websites: websiteCount
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث معلومات المستخدم
 * PUT /api/users/me
 */
exports.updateMe = async (req, res) => {
    try {
        const allowedFields = [
            'company_name', 'company_logo', 'company_description', 
            'business_type', 'hero_image', 'primary_color', 'phone'
        ];
        const updateData = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        await req.user.update(updateData);

        // إعادة بناء مواقع العملاء إذا تغيرت معلومات المؤسسة
        if (updateData.company_name || updateData.company_logo || updateData.company_description) {
            await rebuildAllClientWebsites(req.user.user_id);
        }

        res.json({
            success: true,
            message: 'تم تحديث المعلومات بنجاح',
            user: req.user
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * رفع شعار المؤسسة
 * POST /api/users/me/logo
 */
exports.uploadLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لا توجد صورة مرفوعة' });
        }

        // حذف الشعار القديم إذا وجد
        if (req.user.company_logo) {
            await deleteFile(req.user.company_logo);
        }

        const logoUrl = `/uploads/logos/${req.file.filename}`;
        await req.user.update({ company_logo: logoUrl });

        res.json({
            success: true,
            message: 'تم رفع الشعار بنجاح',
            logo_url: logoUrl
        });
    } catch (error) {
        console.error('Upload logo error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * رفع صورة الخلفية (Hero)
 * POST /api/users/me/hero
 */
exports.uploadHero = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'لا توجد صورة مرفوعة' });
        }

        // حذف الصورة القديمة إذا وجدت
        if (req.user.hero_image) {
            await deleteFile(req.user.hero_image);
        }

        const heroUrl = `/uploads/hero/${req.file.filename}`;
        await req.user.update({ hero_image: heroUrl });

        // إعادة بناء مواقع العملاء
        await rebuildAllClientWebsites(req.user.user_id);

        res.json({
            success: true,
            message: 'تم رفع الصورة بنجاح',
            hero_url: heroUrl
        });
    } catch (error) {
        console.error('Upload hero error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * حذف حساب المستخدم نهائياً
 * DELETE /api/users/me
 */
exports.deleteAccount = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // حذف جميع البوتات والجلسات
        const whatsappBots = await WhatsAppBot.findAll({ where: { user_id: userId } });
        for (const bot of whatsappBots) {
            await WhatsAppSession.destroy({ where: { bot_id: bot.bot_id } });
            await bot.destroy();
        }

        // حذف بوتات تيليجرام
        await TelegramBot.destroy({ where: { user_id: userId } });

        // حذف المواقع
        const websites = await ClientWebsite.findAll({ where: { user_id: userId } });
        for (const website of websites) {
            await deleteClientWebsite(website.subdomain);
            await website.destroy();
        }

        // حذف الكتالوج
        await CatalogItem.destroy({ where: { user_id: userId } });

        // حذف إعدادات الذكاء الاصطناعي
        await AISetting.destroy({ where: { user_id: userId } });

        // حذف الاشتراكات
        await Subscription.destroy({ where: { user_id: userId } });

        // حذف المستخدم
        await req.user.update({ 
            status: 'deleted',
            email: `deleted_${userId}_${Date.now()}@deleted.com`,
            company_name: null
        });

        res.json({ success: true, message: 'تم حذف الحساب بنجاح' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * الحصول على إعدادات المستخدم
 * GET /api/users/me/settings
 */
exports.getSettings = async (req, res) => {
    try {
        const aiSettings = await AISetting.findOne({ 
            where: { user_id: req.user.user_id },
            attributes: { exclude: ['api_key'] }
        });

        res.json({
            success: true,
            user: {
                company_name: req.user.company_name,
                business_type: req.user.business_type,
                primary_color: req.user.primary_color,
                phone: req.user.phone
            },
            ai_settings: aiSettings
        });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث إعدادات المستخدم
 * PUT /api/users/me/settings
 */
exports.updateSettings = async (req, res) => {
    try {
        const { primary_color, phone, business_type } = req.body;

        await req.user.update({ primary_color, phone, business_type });

        // إعادة بناء مواقع العملاء
        await rebuildAllClientWebsites(req.user.user_id);

        res.json({
            success: true,
            message: 'تم تحديث الإعدادات بنجاح'
        });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};