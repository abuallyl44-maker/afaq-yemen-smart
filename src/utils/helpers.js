/**
 * دوال مساعدة عامة (Helpers)
 * تحتوي على دوال شائعة الاستخدام في جميع أنحاء النظام
 */

const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');

/**
 * إنشاء معرف فريد (UUID)
 * @returns {string} معرف فريد
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * إنشاء رمز عشوائي
 * @param {number} length - طول الرمز
 * @returns {string} رمز عشوائي
 */
function generateRandomCode(length = 6) {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
}

/**
 * إنشاء رمز مرجعي فريد
 * @param {string} prefix - بادئة الرمز
 * @returns {string} رمز مرجعي
 */
function generateReferenceCode(prefix = 'REF') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

/**
 * تأخير التنفيذ (بالميلي ثانية)
 * @param {number} ms - عدد الميلي ثانية
 * @returns {Promise}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * تنسيق التاريخ للعرض باللغة العربية
 * @param {Date} date - التاريخ
 * @param {string} format - صيغة التنسيق
 * @returns {string}
 */
function formatArabicDate(date, format = 'full') {
    const d = new Date(date);
    
    const months = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    const year = d.getFullYear();
    const month = months[d.getMonth()];
    const day = d.getDate();
    const dayName = days[d.getDay()];
    
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    if (format === 'date') {
        return `${day} ${month} ${year}`;
    } else if (format === 'time') {
        return `${hours}:${minutes}:${seconds}`;
    } else if (format === 'datetime') {
        return `${day} ${month} ${year} - ${hours}:${minutes}`;
    }
    return `${dayName}، ${day} ${month} ${year} - ${hours}:${minutes}`;
}

/**
 * التحقق من صحة البريد الإلكتروني
 * @param {string} email - البريد الإلكتروني
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * التحقق من صحة رقم الهاتف
 * @param {string} phone - رقم الهاتف
 * @returns {boolean}
 */
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
}

/**
 * التحقق من صحة الرابط (URL)
 * @param {string} url - الرابط
 * @returns {boolean}
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * قص النص إلى طول محدد
 * @param {string} text - النص
 * @param {number} maxLength - الحد الأقصى للطول
 * @returns {string}
 */
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

/**
 * إزالة علامات HTML من النص
 * @param {string} text - النص
 * @returns {string}
 */
function stripHtml(text) {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '');
}

/**
 * تحويل النص إلى slug صالح للرابط
 * @param {string} text - النص
 * @returns {string}
 */
function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * حذف الملف إذا كان موجوداً
 * @param {string} filePath - مسار الملف
 * @returns {Promise<boolean>}
 */
async function deleteFileIfExists(filePath) {
    try {
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Delete file error:', error);
        return false;
    }
}

/**
 * الحصول على حجم الملف بالميغابايت
 * @param {string} filePath - مسار الملف
 * @returns {Promise<number>}
 */
async function getFileSizeMB(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return stats.size / (1024 * 1024);
    } catch {
        return 0;
    }
}

/**
 * نسخ مجلد بشكل متكرر
 * @param {string} src - المسار المصدر
 * @param {string} dest - المسار الهدف
 * @returns {Promise}
 */
async function copyDirectoryRecursive(src, dest) {
    await fs.ensureDir(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectoryRecursive(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

/**
 * الحصول على عنوان IP الحقيقي للعميل
 * @param {Object} req - طلب Express
 * @returns {string}
 */
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.socket.remoteAddress || 
           req.ip;
}

/**
 * تأكيد الأرقام كـ (en) للحفاظ على التنسيق
 * @param {string} text - النص
 * @returns {string}
 */
function normalizeNumbers(text) {
    if (!text) return '';
    const arabicNumbers = /[٠١٢٣٤٥٦٧٨٩]/g;
    const englishNumbers = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    return text.replace(arabicNumbers, match => englishNumbers[match]);
}

module.exports = {
    generateUUID,
    generateRandomCode,
    generateReferenceCode,
    sleep,
    formatArabicDate,
    isValidEmail,
    isValidPhone,
    isValidUrl,
    truncateText,
    stripHtml,
    slugify,
    deleteFileIfExists,
    getFileSizeMB,
    copyDirectoryRecursive,
    getClientIp,
    normalizeNumbers
};