/**
 * دوال التحقق من صحة البيانات (Validation Utilities)
 * تحتوي على دوال للتحقق من صحة المدخلات المختلفة في النظام
 */

const validator = require('validator');
const { REGEX, MAX_FILE_SIZES, ALLOWED_MIME_TYPES } = require('./constants');

/**
 * التحقق من صحة البريد الإلكتروني
 * @param {string} email - البريد الإلكتروني
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateEmail(email) {
    if (!email) {
        return { isValid: false, error: 'البريد الإلكتروني مطلوب' };
    }
    
    if (!validator.isEmail(email)) {
        return { isValid: false, error: 'البريد الإلكتروني غير صالح' };
    }
    
    if (email.length > 255) {
        return { isValid: false, error: 'البريد الإلكتروني طويل جداً (الحد الأقصى 255 حرفاً)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة كلمة السر
 * @param {string} password - كلمة السر
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validatePassword(password) {
    if (!password) {
        return { isValid: false, error: 'كلمة السر مطلوبة' };
    }
    
    if (password.length < 8) {
        return { isValid: false, error: 'كلمة السر يجب أن تكون 8 أحرف على الأقل' };
    }
    
    if (password.length > 255) {
        return { isValid: false, error: 'كلمة السر طويلة جداً (الحد الأقصى 255 حرفاً)' };
    }
    
    if (!REGEX.PASSWORD.test(password)) {
        return { 
            isValid: false, 
            error: 'كلمة السر يجب أن تحتوي على حرف كبير واحد على الأقل، رقم واحد على الأقل، ورمز خاص واحد على الأقل (@, $, !, %, *, #, ?, &)' 
        };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من تطابق كلمتي السر
 * @param {string} password - كلمة السر
 * @param {string} confirmPassword - تأكيد كلمة السر
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validatePasswordMatch(password, confirmPassword) {
    if (password !== confirmPassword) {
        return { isValid: false, error: 'كلمتا السر غير متطابقتين' };
    }
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة رقم الهاتف
 * @param {string} phone - رقم الهاتف
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validatePhone(phone) {
    if (!phone) {
        return { isValid: true, error: null }; // رقم الهاتف اختياري
    }
    
    if (!REGEX.PHONE.test(phone)) {
        return { isValid: false, error: 'رقم الهاتف غير صالح' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة اسم المؤسسة
 * @param {string} name - اسم المؤسسة
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateCompanyName(name) {
    if (!name) {
        return { isValid: false, error: 'اسم المؤسسة مطلوب' };
    }
    
    if (name.length < 3) {
        return { isValid: false, error: 'اسم المؤسسة يجب أن يكون 3 أحرف على الأقل' };
    }
    
    if (name.length > 255) {
        return { isValid: false, error: 'اسم المؤسسة طويل جداً (الحد الأقصى 255 حرفاً)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة وصف المؤسسة
 * @param {string} description - وصف المؤسسة
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateCompanyDescription(description) {
    if (!description) {
        return { isValid: false, error: 'وصف المؤسسة مطلوب' };
    }
    
    if (description.length < 50) {
        return { isValid: false, error: 'وصف المؤسسة يجب أن يكون 50 حرفاً على الأقل' };
    }
    
    if (description.length > 5000) {
        return { isValid: false, error: 'وصف المؤسسة طويل جداً (الحد الأقصى 5000 حرف)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة نوع النشاط
 * @param {string} businessType - نوع النشاط
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateBusinessType(businessType) {
    if (!businessType) {
        return { isValid: false, error: 'نوع النشاط مطلوب' };
    }
    
    if (businessType.length > 100) {
        return { isValid: false, error: 'نوع النشاط طويل جداً (الحد الأقصى 100 حرف)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة اسم البوت
 * @param {string} botName - اسم البوت
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateBotName(botName) {
    if (!botName) {
        return { isValid: false, error: 'اسم البوت مطلوب' };
    }
    
    if (botName.length < 3) {
        return { isValid: false, error: 'اسم البوت يجب أن يكون 3 أحرف على الأقل' };
    }
    
    if (botName.length > 255) {
        return { isValid: false, error: 'اسم البوت طويل جداً (الحد الأقصى 255 حرفاً)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة توكن بوت تيليجرام
 * @param {string} token - التوكن
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateTelegramToken(token) {
    if (!token) {
        return { isValid: false, error: 'توكن البوت مطلوب' };
    }
    
    // تنسيق التوكن: رقم: نص
    const tokenRegex = /^\d+:[A-Za-z0-9_-]+$/;
    if (!tokenRegex.test(token)) {
        return { isValid: false, error: 'توكن البوت غير صالح' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة اسم مستخدم تيليجرام
 * @param {string} username - اسم المستخدم
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateTelegramUsername(username) {
    if (!username) {
        return { isValid: false, error: 'اسم مستخدم البوت مطلوب' };
    }
    
    // إزالة @ إذا وجدت
    const cleanUsername = username.replace('@', '');
    
    if (cleanUsername.length < 5) {
        return { isValid: false, error: 'اسم المستخدم يجب أن يكون 5 أحرف على الأقل' };
    }
    
    if (cleanUsername.length > 32) {
        return { isValid: false, error: 'اسم المستخدم طويل جداً (الحد الأقصى 32 حرفاً)' };
    }
    
    const usernameRegex = /^[A-Za-z0-9_]+$/;
    if (!usernameRegex.test(cleanUsername)) {
        return { isValid: false, error: 'اسم المستخدم يمكن أن يحتوي فقط على أحرف وأرقام وشرطة سفلية' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة رقم الحوالة حسب الشركة
 * @param {string} company - اسم الشركة
 * @param {string} transferNumber - رقم الحوالة
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateTransferNumber(company, transferNumber) {
    if (!transferNumber) {
        return { isValid: false, error: 'رقم الحوالة مطلوب' };
    }
    
    const numberStr = transferNumber.toString();
    
    switch (company) {
        case 'حزمي':
            if (!REGEX.TRANSFER_NUMBER_HAZMI.test(numberStr)) {
                return { isValid: false, error: 'رقم الحوالة لشركة حزمي يجب أن يكون 8-12 رقماً' };
            }
            break;
        case 'السريع':
            if (!REGEX.TRANSFER_NUMBER_AL_SAREE.test(numberStr)) {
                return { isValid: false, error: 'رقم الحوالة لشركة السريع يجب أن يكون 10-14 رقماً' };
            }
            break;
        case 'يمن إكسبرس':
            if (!REGEX.TRANSFER_NUMBER_YEMEN_EXPRESS.test(numberStr)) {
                return { isValid: false, error: 'رقم الحوالة لشركة يمن إكسبرس يجب أن يكون 12 رقماً' };
            }
            break;
        default:
            // شركات أخرى، لا تحقق (يمكن تخصيص لاحقاً)
            break;
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة اسم المرسل
 * @param {string} senderName - اسم المرسل
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateSenderName(senderName) {
    if (!senderName) {
        return { isValid: false, error: 'اسم المرسل مطلوب' };
    }
    
    if (senderName.length < 3) {
        return { isValid: false, error: 'اسم المرسل يجب أن يكون 3 أحرف على الأقل' };
    }
    
    if (senderName.length > 255) {
        return { isValid: false, error: 'اسم المرسل طويل جداً (الحد الأقصى 255 حرفاً)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة المبلغ
 * @param {number} amount - المبلغ
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateAmount(amount) {
    if (amount === undefined || amount === null) {
        return { isValid: false, error: 'المبلغ مطلوب' };
    }
    
    const numAmount = Number(amount);
    if (isNaN(numAmount)) {
        return { isValid: false, error: 'المبلغ يجب أن يكون رقماً' };
    }
    
    if (numAmount <= 0) {
        return { isValid: false, error: 'المبلغ يجب أن يكون أكبر من صفر' };
    }
    
    if (numAmount > 1000000) {
        return { isValid: false, error: 'المبلغ كبير جداً (الحد الأقصى 1,000,000 ريال)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة اللون (HEX)
 * @param {string} color - اللون بصيغة HEX
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateHexColor(color) {
    if (!color) {
        return { isValid: true, error: null }; // اختياري
    }
    
    if (!REGEX.HEX_COLOR.test(color)) {
        return { isValid: false, error: 'اللون يجب أن يكون بصيغة HEX صالحة (مثل #FF5733)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة الرابط (URL)
 * @param {string} url - الرابط
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateUrl(url) {
    if (!url) {
        return { isValid: true, error: null }; // اختياري
    }
    
    if (!validator.isURL(url, { require_protocol: true })) {
        return { isValid: false, error: 'الرابط غير صالح (يجب أن يبدأ بـ http:// أو https://)' };
    }
    
    if (url.length > 2048) {
        return { isValid: false, error: 'الرابط طويل جداً' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة اسم المنتج/الخدمة
 * @param {string} name - الاسم
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateItemName(name) {
    if (!name) {
        return { isValid: false, error: 'الاسم مطلوب' };
    }
    
    if (name.length < 3) {
        return { isValid: false, error: 'الاسم يجب أن يكون 3 أحرف على الأقل' };
    }
    
    if (name.length > 255) {
        return { isValid: false, error: 'الاسم طويل جداً (الحد الأقصى 255 حرفاً)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة رفع الملف
 * @param {Object} file - ملف (من multer)
 * @param {string} type - نوع الملف ('logo', 'hero', 'image')
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateFileUpload(file, type = 'image') {
    if (!file) {
        return { isValid: false, error: 'الملف مطلوب' };
    }
    
    let maxSize;
    let allowedTypes;
    
    switch (type) {
        case 'logo':
            maxSize = MAX_FILE_SIZES.LOGO * 1024 * 1024;
            allowedTypes = ALLOWED_MIME_TYPES.IMAGES;
            break;
        case 'hero':
            maxSize = MAX_FILE_SIZES.HERO * 1024 * 1024;
            allowedTypes = ALLOWED_MIME_TYPES.IMAGES;
            break;
        default:
            maxSize = MAX_FILE_SIZES.IMAGE * 1024 * 1024;
            allowedTypes = ALLOWED_MIME_TYPES.IMAGES;
    }
    
    if (file.size > maxSize) {
        return { isValid: false, error: `حجم الملف كبير جداً (الحد الأقصى ${maxSize / (1024 * 1024)} ميغابايت)` };
    }
    
    if (!allowedTypes.includes(file.mimetype)) {
        return { isValid: false, error: 'نوع الملف غير مدعوم. يرجى رفع صورة فقط (JPEG, PNG, GIF, WebP)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة محتوى الرسالة
 * @param {string} message - الرسالة
 * @param {number} maxLength - الحد الأقصى للطول
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateMessage(message, maxLength = 4096) {
    if (!message) {
        return { isValid: false, error: 'الرسالة مطلوبة' };
    }
    
    if (message.length > maxLength) {
        return { isValid: false, error: `الرسالة طويلة جداً (الحد الأقصى ${maxLength} حرفاً)` };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة التاريخ
 * @param {string|Date} date - التاريخ
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateDate(date) {
    if (!date) {
        return { isValid: true, error: null };
    }
    
    const d = new Date(date);
    if (isNaN(d.getTime())) {
        return { isValid: false, error: 'التاريخ غير صالح' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة كلمة المفتاحية للرد الآلي
 * @param {string} keyword - الكلمة المفتاحية
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateTriggerKeyword(keyword) {
    if (!keyword) {
        return { isValid: false, error: 'الكلمة المفتاحية مطلوبة' };
    }
    
    if (keyword.length < 2) {
        return { isValid: false, error: 'الكلمة المفتاحية يجب أن تكون حرفين على الأقل' };
    }
    
    if (keyword.length > 100) {
        return { isValid: false, error: 'الكلمة المفتاحية طويلة جداً (الحد الأقصى 100 حرف)' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة نسبة الخصم
 * @param {number} discount - نسبة الخصم
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateDiscount(discount) {
    if (discount === undefined || discount === null) {
        return { isValid: false, error: 'نسبة الخصم مطلوبة' };
    }
    
    const numDiscount = Number(discount);
    if (isNaN(numDiscount)) {
        return { isValid: false, error: 'نسبة الخصم يجب أن تكون رقماً' };
    }
    
    if (numDiscount < 0) {
        return { isValid: false, error: 'نسبة الخصم لا يمكن أن تكون سالبة' };
    }
    
    if (numDiscount > 100) {
        return { isValid: false, error: 'نسبة الخصم لا يمكن أن تتجاوز 100%' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة معرف المستخدم
 * @param {number} userId - معرف المستخدم
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateUserId(userId) {
    if (!userId) {
        return { isValid: false, error: 'معرف المستخدم مطلوب' };
    }
    
    const numId = Number(userId);
    if (isNaN(numId) || !Number.isInteger(numId) || numId <= 0) {
        return { isValid: false, error: 'معرف المستخدم غير صالح' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة معرف البوت
 * @param {number} botId - معرف البوت
 * @returns {Object} { isValid: boolean, error: string|null }
 */
function validateBotId(botId) {
    if (!botId) {
        return { isValid: false, error: 'معرف البوت مطلوب' };
    }
    
    const numId = Number(botId);
    if (isNaN(numId) || !Number.isInteger(numId) || numId <= 0) {
        return { isValid: false, error: 'معرف البوت غير صالح' };
    }
    
    return { isValid: true, error: null };
}

/**
 * التحقق من صحة رقم الصفحة
 * @param {number} page - رقم الصفحة
 * @returns {number} رقم الصفحة الصالح
 */
function sanitizePageNumber(page) {
    const numPage = Number(page);
    if (isNaN(numPage) || numPage < 1) {
        return 1;
    }
    return numPage;
}

/**
 * التحقق من صحة عدد العناصر في الصفحة
 * @param {number} limit - عدد العناصر
 * @param {number} maxLimit - الحد الأقصى
 * @returns {number} العدد الصالح
 */
function sanitizeLimit(limit, maxLimit = 100) {
    const numLimit = Number(limit);
    if (isNaN(numLimit) || numLimit < 1) {
        return 20;
    }
    if (numLimit > maxLimit) {
        return maxLimit;
    }
    return numLimit;
}

module.exports = {
    validateEmail,
    validatePassword,
    validatePasswordMatch,
    validatePhone,
    validateCompanyName,
    validateCompanyDescription,
    validateBusinessType,
    validateBotName,
    validateTelegramToken,
    validateTelegramUsername,
    validateTransferNumber,
    validateSenderName,
    validateAmount,
    validateHexColor,
    validateUrl,
    validateItemName,
    validateFileUpload,
    validateMessage,
    validateDate,
    validateTriggerKeyword,
    validateDiscount,
    validateUserId,
    validateBotId,
    sanitizePageNumber,
    sanitizeLimit
};