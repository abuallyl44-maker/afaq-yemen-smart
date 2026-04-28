const { body, validationResult } = require('express-validator');

/**
 * معالج أخطاء التحقق
 */
const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        res.status(400).json({ 
            error: 'بيانات غير صالحة', 
            details: errors.array().map(e => ({ field: e.param, message: e.msg }))
        });
    };
};

// قواعد التحقق من التسجيل
const registerValidation = [
    body('email')
        .isEmail().withMessage('البريد الإلكتروني غير صالح')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 8 }).withMessage('كلمة السر يجب أن تكون 8 أحرف على الأقل')
        .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])/).withMessage('كلمة السر يجب أن تحتوي على حرف كبير ورقم ورمز خاص'),
    body('telegram_id')
        .optional()
        .isNumeric().withMessage('معرف تيليجرام غير صالح')
];

// قواعد التحقق من تسجيل الدخول
const loginValidation = [
    body('email')
        .isEmail().withMessage('البريد الإلكتروني غير صالح')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('كلمة السر مطلوبة')
];

// قواعد التحقق من تغيير كلمة السر
const changePasswordValidation = [
    body('oldPassword')
        .notEmpty().withMessage('كلمة السر القديمة مطلوبة'),
    body('newPassword')
        .isLength({ min: 8 }).withMessage('كلمة السر الجديدة يجب أن تكون 8 أحرف على الأقل')
        .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])/).withMessage('كلمة السر يجب أن تحتوي على حرف كبير ورقم ورمز خاص')
];

// قواعد التحقق من تحديث المستخدم
const updateUserValidation = [
    body('company_name')
        .optional()
        .isLength({ min: 3, max: 255 }).withMessage('اسم المؤسسة يجب أن يكون بين 3 و255 حرفاً'),
    body('business_type')
        .optional()
        .isLength({ max: 100 }).withMessage('نوع النشاط طويل جداً'),
    body('phone')
        .optional()
        .matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/).withMessage('رقم الهاتف غير صالح')
];

// قواعد التحقق من إنشاء بوت
const createBotValidation = [
    body('bot_name')
        .notEmpty().withMessage('اسم البوت مطلوب')
        .isLength({ min: 3, max: 255 }).withMessage('اسم البوت يجب أن يكون بين 3 و255 حرفاً')
];

// قواعد التحقق من تحديث البوت
const updateBotValidation = [
    body('bot_name')
        .optional()
        .isLength({ min: 3, max: 255 }).withMessage('اسم البوت يجب أن يكون بين 3 و255 حرفاً'),
    body('delete_tracking')
        .optional()
        .isBoolean().withMessage('يجب أن تكون القيمة true/false')
];

// قواعد التحقق من عناصر الكتالوج
const catalogItemValidation = [
    body('name')
        .notEmpty().withMessage('الاسم مطلوب')
        .isLength({ min: 3, max: 255 }).withMessage('الاسم يجب أن يكون بين 3 و255 حرفاً'),
    body('price')
        .optional()
        .isNumeric().withMessage('السعر يجب أن يكون رقماً')
];

module.exports = {
    validate,
    registerValidation,
    loginValidation,
    changePasswordValidation,
    updateUserValidation,
    createBotValidation,
    updateBotValidation,
    catalogItemValidation
};