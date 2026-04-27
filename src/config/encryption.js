/**
 * إعدادات التشفير (Encryption Configuration)
 * المسؤول عن: إدارة مفاتيح التشفير وخوارزميات AES-256
 */

const crypto = require('crypto');

// مفتاح التشفير من متغيرات البيئة (32 حرفاً بالضبط)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // 16 bytes for AES

/**
 * التحقق من صحة مفتاح التشفير
 */
function validateEncryptionKey() {
    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY is not set in environment variables');
    }
    if (ENCRYPTION_KEY.length !== 32) {
        throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    return true;
}

/**
 * الحصول على مفتاح التشفير كـ Buffer
 */
function getEncryptionKey() {
    validateEncryptionKey();
    return Buffer.from(ENCRYPTION_KEY, 'utf8');
}

/**
 * تشفير النص
 * @param {string} text - النص المراد تشفيره
 * @returns {string} النص المشفر (base64:encrypted)
 */
function encrypt(text) {
    if (!text) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // إرجاع iv:encrypted لفك التشفير لاحقاً
    return iv.toString('base64') + ':' + encrypted;
}

/**
 * فك تشفير النص
 * @param {string} encryptedText - النص المشفر (base64:encrypted)
 * @returns {string} النص الأصلي
 */
function decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * تشفير كائن JSON
 * @param {Object} obj - الكائن المراد تشفيره
 * @returns {string} النص المشفر
 */
function encryptObject(obj) {
    if (!obj) return null;
    return encrypt(JSON.stringify(obj));
}

/**
 * فك تشفير كائن JSON
 * @param {string} encryptedText - النص المشفر
 * @returns {Object} الكائن الأصلي
 */
function decryptObject(encryptedText) {
    const decrypted = decrypt(encryptedText);
    if (!decrypted) return null;
    try {
        return JSON.parse(decrypted);
    } catch (e) {
        return null;
    }
}

/**
 * إنشاء مفتاح تشفير عشوائي جديد (32 حرفاً)
 * @returns {string} مفتاح عشوائي
 */
function generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * تشفير نص باستخدام مفتاح مؤقت (للاستخدام لمرة واحدة)
 * @param {string} text - النص المراد تشفيره
 * @param {string} tempKey - المفتاح المؤقت
 * @returns {string} النص المشفر
 */
function encryptWithTempKey(text, tempKey) {
    if (!text || !tempKey) return null;
    
    const key = Buffer.from(tempKey.padEnd(32, '0').slice(0, 32), 'utf8');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    return iv.toString('base64') + ':' + encrypted;
}

/**
 * فك تشفير نص باستخدام مفتاح مؤقت
 * @param {string} encryptedText - النص المشفر
 * @param {string} tempKey - المفتاح المؤقت
 * @returns {string} النص الأصلي
 */
function decryptWithTempKey(encryptedText, tempKey) {
    if (!encryptedText || !tempKey) return null;
    
    const key = Buffer.from(tempKey.padEnd(32, '0').slice(0, 32), 'utf8');
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return null;
    
    const iv = Buffer.from(parts[0], 'base64');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

/**
 * حساب Hash للنص (غير قابل للفك)
 * @param {string} text - النص المراد هاشه
 * @returns {string} الهاش
 */
function hash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

/**
 * التحقق من صحة الهاش
 * @param {string} text - النص الأصلي
 * @param {string} hash - الهاش المخزن
 * @returns {boolean} صحة الهاش
 */
function verifyHash(text, hash) {
    return crypto.createHash('sha256').update(text).digest('hex') === hash;
}

module.exports = {
    encrypt,
    decrypt,
    encryptObject,
    decryptObject,
    generateEncryptionKey,
    encryptWithTempKey,
    decryptWithTempKey,
    hash,
    verifyHash,
    validateEncryptionKey
};