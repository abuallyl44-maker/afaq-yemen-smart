/**
 * دوال التشفير وفك التشفير
 * استخدام AES-256 لتشفير البيانات الحساسة
 */

const crypto = require('crypto');

// مفتاح التشفير (32 حرفاً بالضبط)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 16 bytes for AES

/**
 * تشفير البيانات
 * @param {string} text - النص المراد تشفيره
 * @returns {string} - النص المشفر (base64)
 */
function encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY, 'utf8'),
        iv
    );
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // نعيد iv:encrypted لتتمكن من فك التشفير لاحقاً
    return iv.toString('base64') + ':' + encrypted;
}

/**
 * فك تشفير البيانات
 * @param {string} encryptedText - النص المشفر (base64:encrypted)
 * @returns {string} - النص الأصلي
 */
function decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(
        ALGORITHM,
        Buffer.from(ENCRYPTION_KEY, 'utf8'),
        iv
    );
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * تشفير كائن JSON بالكامل
 * @param {Object} obj - الكائن المراد تشفيره
 * @returns {string} - النص المشفر
 */
function encryptObject(obj) {
    return encrypt(JSON.stringify(obj));
}

/**
 * فك تشفير كائن JSON
 * @param {string} encryptedText - النص المشفر
 * @returns {Object} - الكائن الأصلي
 */
function decryptObject(encryptedText) {
    const decrypted = decrypt(encryptedText);
    return decrypted ? JSON.parse(decrypted) : null;
}

/**
 * تشفير كلمة السر باستخدام bcrypt (لا تستخدم هذه الدوال، استخدم bcrypt مباشرة)
 * تم تضمين هذه الدوال للتوثيق فقط
 */
// يتم استخدام bcrypt مباشرة في نموذج المستخدم

module.exports = {
    encrypt,
    decrypt,
    encryptObject,
    decryptObject
};