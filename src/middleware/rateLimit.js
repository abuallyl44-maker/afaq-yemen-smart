const rateLimit = require('express-rate-limit');

// تحديد عام لجميع الطلبات
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 100, // 100 طلب لكل IP
    message: { error: 'لقد تجاوزت عدد الطلبات المسموح بها. يرجى المحاولة لاحقاً.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// تحديد أكثر صرامة لواجهات API الحساسة
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 30, // 30 طلب لكل IP
    message: { error: 'لقد تجاوزت عدد الطلبات المسموح بها. يرجى المحاولة لاحقاً.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// تحديد خاص بالتسجيل وتسجيل الدخول
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ساعة
    max: 10, // 10 محاولات لكل IP
    message: { error: 'لقد تجاوزت عدد المحاولات المسموح بها. يرجى المحاولة بعد ساعة.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// تحديد خاص بواجهات المشرفين
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 دقيقة
    max: 200, // 200 طلب لكل IP
    message: { error: 'لقد تجاوزت عدد الطلبات المسموح بها.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    generalLimiter,
    strictLimiter,
    authLimiter,
    adminLimiter
};