/**
 * ميدل وير صلاحيات المشرفين (Admin Authentication Middleware)
 * المسؤول عن: التحقق من صلاحيات المشرفين وأنواعهم المختلفة
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * التحقق من أن المستخدم مشرف عام (Admin)
 * @param {Object} req - طلب Express
 * @param {Object} res - رد Express
 * @param {Function} next - الدالة التالية
 */
async function requireAdmin(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'غير مصرح به. يرجى تسجيل الدخول' 
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user || user.status !== 'active') {
            return res.status(401).json({ 
                success: false, 
                error: 'المستخدم غير موجود أو غير نشط' 
            });
        }
        
        if (user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'ليس لديك صلاحية للوصول إلى هذا المورد' 
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        return res.status(401).json({ 
            success: false, 
            error: 'توكن غير صالح أو منتهي الصلاحية' 
        });
    }
}

/**
 * التحقق من أن المستخدم مشرف مالي (Financial Admin)
 * يمكنه إدارة المدفوعات فقط
 * @param {Object} req - طلب Express
 * @param {Object} res - رد Express
 * @param {Function} next - الدالة التالية
 */
async function requireFinancialAdmin(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'غير مصرح به. يرجى تسجيل الدخول' 
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user || user.status !== 'active') {
            return res.status(401).json({ 
                success: false, 
                error: 'المستخدم غير موجود أو غير نشط' 
            });
        }
        
        const allowedRoles = ['admin', 'financial_admin'];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ 
                success: false, 
                error: 'ليس لديك صلاحية للوصول إلى هذا المورد' 
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Financial admin auth error:', error);
        return res.status(401).json({ 
            success: false, 
            error: 'توكن غير صالح أو منتهي الصلاحية' 
        });
    }
}

/**
 * التحقق من أن المستخدم مشرف دعم فني (Support Admin)
 * يمكنه إدارة تذاكر الدعم فقط
 * @param {Object} req - طلب Express
 * @param {Object} res - رد Express
 * @param {Function} next - الدالة التالية
 */
async function requireSupportAdmin(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'غير مصرح به. يرجى تسجيل الدخول' 
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user || user.status !== 'active') {
            return res.status(401).json({ 
                success: false, 
                error: 'المستخدم غير موجود أو غير نشط' 
            });
        }
        
        const allowedRoles = ['admin', 'support_admin'];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ 
                success: false, 
                error: 'ليس لديك صلاحية للوصول إلى هذا المورد' 
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Support admin auth error:', error);
        return res.status(401).json({ 
            success: false, 
            error: 'توكن غير صالح أو منتهي الصلاحية' 
        });
    }
}

/**
 * التحقق من أن المستخدم محرر محتوى (Content Editor)
 * يمكنه إدارة المحتوى فقط
 * @param {Object} req - طلب Express
 * @param {Object} res - رد Express
 * @param {Function} next - الدالة التالية
 */
async function requireContentEditor(req, res, next) {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'غير مصرح به. يرجى تسجيل الدخول' 
            });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user || user.status !== 'active') {
            return res.status(401).json({ 
                success: false, 
                error: 'المستخدم غير موجود أو غير نشط' 
            });
        }
        
        const allowedRoles = ['admin', 'content_editor'];
        if (!allowedRoles.includes(user.role)) {
            return res.status(403).json({ 
                success: false, 
                error: 'ليس لديك صلاحية للوصول إلى هذا المورد' 
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        console.error('Content editor auth error:', error);
        return res.status(401).json({ 
            success: false, 
            error: 'توكن غير صالح أو منتهي الصلاحية' 
        });
    }
}

/**
 * التحقق من أن المستخدم إما مالك المورد أو مشرف
 * @param {Function} getResourceUserId - دالة لجلب معرف مالك المورد من الطلب
 * @returns {Function} ميدل وير
 */
function requireOwnerOrAdmin(getResourceUserId) {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            
            if (!token) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'غير مصرح به. يرجى تسجيل الدخول' 
                });
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findByPk(decoded.userId);
            
            if (!user || user.status !== 'active') {
                return res.status(401).json({ 
                    success: false, 
                    error: 'المستخدم غير موجود أو غير نشط' 
                });
            }
            
            // إذا كان المشرف، يسمح له بالوصول
            if (user.role === 'admin') {
                req.user = user;
                return next();
            }
            
            // التحقق من ملكية المورد
            const resourceUserId = await getResourceUserId(req);
            if (user.user_id === resourceUserId) {
                req.user = user;
                return next();
            }
            
            return res.status(403).json({ 
                success: false, 
                error: 'ليس لديك صلاحية للوصول إلى هذا المورد' 
            });
        } catch (error) {
            console.error('Owner or admin auth error:', error);
            return res.status(401).json({ 
                success: false, 
                error: 'توكن غير صالح أو منتهي الصلاحية' 
            });
        }
    };
}

/**
 * دالة مساعدة للحصول على معرف المستخدم من البوت
 * @param {Object} req - طلب Express
 * @returns {Promise<number>} معرف المستخدم
 */
async function getUserIdFromBot(req) {
    const { botId } = req.params;
    const { WhatsAppBot, TelegramBot } = require('../models');
    
    let bot = await WhatsAppBot.findByPk(botId);
    if (!bot) {
        bot = await TelegramBot.findByPk(botId);
    }
    
    return bot ? bot.user_id : null;
}

/**
 * دالة مساعدة للحصول على معرف المستخدم من الموقع
 * @param {Object} req - طلب Express
 * @returns {Promise<number>} معرف المستخدم
 */
async function getUserIdFromWebsite(req) {
    const { siteId } = req.params;
    const { ClientWebsite } = require('../models');
    
    const site = await ClientWebsite.findByPk(siteId);
    return site ? site.user_id : null;
}

// إنشاء ميدل وير مسبق للتطبيق على البوتات
const requireBotOwnerOrAdmin = requireOwnerOrAdmin(getUserIdFromBot);

// إنشاء ميدل وير مسبق للتطبيق على المواقع
const requireWebsiteOwnerOrAdmin = requireOwnerOrAdmin(getUserIdFromWebsite);

module.exports = {
    requireAdmin,
    requireFinancialAdmin,
    requireSupportAdmin,
    requireContentEditor,
    requireOwnerOrAdmin,
    requireBotOwnerOrAdmin,
    requireWebsiteOwnerOrAdmin
};