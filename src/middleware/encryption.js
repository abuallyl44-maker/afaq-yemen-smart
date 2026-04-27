/**
 * ميدل وير التشفير (Encryption Middleware)
 * المسؤول عن: تشفير/فك تشفير البيانات الحساسة في الطلبات والردود
 */

const { encrypt, decrypt } = require('../config/encryption');

/**
 * تشفير بيانات الرد قبل إرسالها
 * @param {Object} req - طلب Express
 * @param {Object} res - رد Express
 * @param {Function} next - الدالة التالية
 */
function encryptResponse(req, res, next) {
    // حفظ الدالة الأصلية
    const originalJson = res.json;
    
    // استبدال الدالة لتشفير الرد
    res.json = function(data) {
        // التحقق مما إذا كان الطلب يتطلب تشفير الرد
        const shouldEncrypt = req.headers['x-encrypt-response'] === 'true';
        
        if (shouldEncrypt && data && typeof data === 'object') {
            // تشفير البيانات الحساسة في الرد
            if (data.token) {
                data.token = encrypt(data.token);
            }
            if (data.session_data) {
                data.session_data = encrypt(JSON.stringify(data.session_data));
            }
        }
        
        // استدعاء الدالة الأصلية
        return originalJson.call(this, data);
    };
    
    next();
}

/**
 * فك تشفير بيانات الطلب قبل المعالجة
 * @param {Object} req - طلب Express
 * @param {Object} res - رد Express
 * @param {Function} next - الدالة التالية
 */
function decryptRequest(req, res, next) {
    // التحقق مما إذا كانت البيانات مشفرة
    const isEncrypted = req.headers['x-encrypted'] === 'true';
    
    if (isEncrypted && req.body) {
        try {
            // فك تشفير الحقول الحساسة
            if (req.body.session_data) {
                req.body.session_data = JSON.parse(decrypt(req.body.session_data));
            }
            if (req.body.bot_token) {
                req.body.bot_token = decrypt(req.body.bot_token);
            }
            if (req.body.api_key) {
                req.body.api_key = decrypt(req.body.api_key);
            }
        } catch (error) {
            console.error('Decryption error:', error);
            return res.status(400).json({ 
                success: false, 
                error: 'فشل في فك تشفير البيانات' 
            });
        }
    }
    
    next();
}

/**
 * تشفير معلمات المسار (URL parameters)
 * @param {Array} params - قائمة المعلمات المراد تشفيرها
 * @returns {Function} ميدل وير
 */
function encryptParams(params = []) {
    return (req, res, next) => {
        for (const param of params) {
            if (req.params[param]) {
                req.params[param] = encrypt(req.params[param]);
            }
        }
        next();
    };
}

/**
 * فك تشفير معلمات المسار (URL parameters)
 * @param {Array} params - قائمة المعلمات المراد فك تشفيرها
 * @returns {Function} ميدل وير
 */
function decryptParams(params = []) {
    return (req, res, next) => {
        for (const param of params) {
            if (req.params[param]) {
                try {
                    req.params[param] = decrypt(req.params[param]);
                } catch (error) {
                    return res.status(400).json({ 
                        success: false, 
                        error: `فشل في فك تشفير المعامل ${param}` 
                    });
                }
            }
        }
        next();
    };
}

/**
 * التحقق من صحة التشفير للطلب
 * @param {Object} req - طلب Express
 * @param {Object} res - رد Express
 * @param {Function} next - الدالة التالية
 */
function requireEncryption(req, res, next) {
    const isEncrypted = req.headers['x-encrypted'] === 'true';
    const shouldEncrypt = req.headers['x-encrypt-request'] === 'true';
    
    if (shouldEncrypt && !isEncrypted) {
        return res.status(400).json({ 
            success: false, 
            error: 'الطلب يجب أن يكون مشفراً' 
        });
    }
    
    next();
}

/**
 * إضافة رؤوس التشفير إلى الرد
 * @param {Object} req - طلب Express
 * @param {Object} res - رد Express
 * @param {Function} next - الدالة التالية
 */
function addEncryptionHeaders(req, res, next) {
    // إضافة رأس يشير إلى أن الخادم يدعم التشفير
    res.setHeader('X-Encryption-Supported', 'AES-256-CBC');
    res.setHeader('X-Encryption-Version', '1.0');
    next();
}

module.exports = {
    encryptResponse,
    decryptRequest,
    encryptParams,
    decryptParams,
    requireEncryption,
    addEncryptionHeaders
};