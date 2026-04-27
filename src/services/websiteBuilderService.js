/**
 * خدمة بناء المواقع الإلكترونية للعملاء
 */

const fs = require('fs-extra');
const path = require('path');
const ejs = require('ejs');
const { User, CatalogItem, ClientWebsite, AISetting } = require('../models');
const { Op } = require('sequelize');

/**
 * بناء موقع العميل
 */
async function buildClientWebsite(siteId) {
    try {
        const website = await ClientWebsite.findByPk(siteId);
        if (!website) {
            throw new Error(`Website ${siteId} not found`);
        }
        
        const user = await User.findByPk(website.user_id);
        if (!user) {
            throw new Error(`User ${website.user_id} not found`);
        }
        
        // جلب بيانات الكتالوج
        const services = await CatalogItem.findAll({
            where: { user_id: user.user_id, type: 'service', is_active: true },
            order: [['order_index', 'ASC']]
        });
        
        const products = await CatalogItem.findAll({
            where: { user_id: user.user_id, type: 'product', is_active: true },
            order: [['order_index', 'ASC']]
        });
        
        const offers = await CatalogItem.findAll({
            where: {
                user_id: user.user_id,
                type: 'offer',
                is_active: true,
                [Op.or]: [
                    { end_date: { [Op.gte]: new Date() } },
                    { end_date: null }
                ]
            },
            order: [['created_at', 'DESC']]
        });
        
        const ads = await CatalogItem.findAll({
            where: {
                user_id: user.user_id,
                type: 'ad',
                is_active: true,
                [Op.or]: [
                    { end_date: { [Op.gte]: new Date() } },
                    { end_date: null }
                ]
            }
        });
        
        const aiSettings = await AISetting.findOne({ where: { user_id: user.user_id } });
        
        // إنشاء مجلد الموقع
        const siteDir = path.join(process.env.SITES_PATH, website.subdomain);
        await fs.ensureDir(siteDir);
        await fs.ensureDir(path.join(siteDir, 'css'));
        await fs.ensureDir(path.join(siteDir, 'js'));
        await fs.ensureDir(path.join(siteDir, 'images'));
        
        // نسخ الملفات الثابتة (إذا كانت موجودة)
        const publicCss = path.join(__dirname, '../public/css');
        const publicJs = path.join(__dirname, '../public/js');
        
        if (await fs.pathExists(publicCss)) {
            await fs.copy(publicCss, path.join(siteDir, 'css'));
        }
        if (await fs.pathExists(publicJs)) {
            await fs.copy(publicJs, path.join(siteDir, 'js'));
        }
        
        // توليد HTML
        const html = await ejs.renderFile(path.join(__dirname, '../views/client-website/index.ejs'), {
            company: user,
            website,
            services,
            products,
            offers,
            ads,
            ai_enabled: aiSettings?.is_enabled || false,
            app_url: process.env.APP_URL,
            year: new Date().getFullYear()
        });
        
        // حفظ الملف
        await fs.writeFile(path.join(siteDir, 'index.html'), html);
        
        // تحديث حالة الموقع
        await website.update({ status: 'active' });
        
        console.log(`Website built for ${website.subdomain}`);
        return true;
    } catch (error) {
        console.error('Build website error:', error);
        return false;
    }
}

/**
 * حذف موقع العميل
 */
async function deleteClientWebsite(subdomain) {
    try {
        const siteDir = path.join(process.env.SITES_PATH, subdomain);
        if (await fs.pathExists(siteDir)) {
            await fs.remove(siteDir);
        }
        return true;
    } catch (error) {
        console.error('Delete website error:', error);
        return false;
    }
}

/**
 * إعادة بناء جميع مواقع العملاء (للتحديثات الشاملة)
 */
async function rebuildAllClientWebsites() {
    const websites = await ClientWebsite.findAll({ where: { status: 'active' } });
    for (const website of websites) {
        await buildClientWebsite(website.site_id);
    }
}

module.exports = {
    buildClientWebsite,
    deleteClientWebsite,
    rebuildAllClientWebsites
};