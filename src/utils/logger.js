/**
 * أدوات تسجيل الأحداث (Logger Utilities)
 */

const { AdminLog } = require('../models');

/**
 * تسجيل إجراء مشرف في قاعدة البيانات
 * @param {Object} logData - بيانات السجل
 */
async function logAdminAction(logData) {
    try {
        await AdminLog.create({
            admin_id: logData.admin_id,
            action: logData.action,
            target_id: logData.target_id,
            target_type: logData.target_type,
            details: logData.details ? JSON.stringify(logData.details) : null,
            ip_address: logData.ip_address,
            created_at: new Date()
        });
    } catch (error) {
        console.error('Log admin action error:', error);
    }
}

/**
 * تنسيق التاريخ للعرض
 */
function formatDate(date, format = 'datetime') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');

    if (format === 'date') {
        return `${year}-${month}-${day}`;
    } else if (format === 'time') {
        return `${hours}:${minutes}:${seconds}`;
    }
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * إنشاء معرف فريد
 */
function generateUniqueId(prefix = '') {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * التحقق من صحة رقم الهاتف
 */
function validatePhoneNumber(phone) {
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
    return phoneRegex.test(phone);
}

/**
 * التحقق من صحة الرابط (URL)
 */
function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * قص النص إلى طول محدد
 */
function truncateText(text, maxLength = 100) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

module.exports = {
    logAdminAction,
    formatDate,
    generateUniqueId,
    validatePhoneNumber,
    validateUrl,
    truncateText
};