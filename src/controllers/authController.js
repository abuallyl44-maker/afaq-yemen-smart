/**
 * وحدة تحكم المصادقة (Authentication Controller)
 * المسؤول عن: تسجيل المستخدمين، تسجيل الدخول، التحقق، استرداد كلمة السر
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, PasswordResetRequest, AdminLog } = require('../models');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { logAdminAction } = require('../utils/logger');

/**
 * تسجيل مستخدم جديد
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
    try {
        const { email, password, telegram_id } = req.body;

        // التحقق من وجود البريد
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
        }

        // إنشاء كود تحقق عشوائي
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const codeExpiry = new Date();
        codeExpiry.setMinutes(codeExpiry.getMinutes() + 10);

        // إنشاء المستخدم
        const user = await User.create({
            email,
            password_hash: password,
            telegram_id: telegram_id || null,
            verification_code: verificationCode,
            code_expiry: codeExpiry,
            is_verified: false,
            status: 'active',
            role: 'user'
        });

        // إرسال كود التحقق
        await sendVerificationEmail(email, verificationCode);

        res.status(201).json({
            success: true,
            message: 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني.',
            user_id: user.user_id
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء التسجيل' });
    }
};

/**
 * التحقق من البريد الإلكتروني
 * POST /api/auth/verify
 */
exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        if (user.is_verified) {
            return res.status(400).json({ error: 'البريد الإلكتروني مؤكد بالفعل' });
        }

        if (user.verification_code !== code) {
            return res.status(400).json({ error: 'رمز التحقق غير صحيح' });
        }

        if (new Date() > user.code_expiry) {
            return res.status(400).json({ error: 'انتهت صلاحية رمز التحقق' });
        }

        await user.update({
            is_verified: true,
            verification_code: null,
            code_expiry: null
        });

        // إنشاء JWT
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'تم تأكيد البريد الإلكتروني بنجاح',
            token,
            user: {
                id: user.user_id,
                email: user.email,
                role: user.role,
                is_verified: user.is_verified,
                company_name: user.company_name
            }
        });
    } catch (error) {
        console.error('Verify email error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء التحقق' });
    }
};

/**
 * تسجيل الدخول
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة السر غير صحيحة' });
        }

        if (!user.is_verified) {
            return res.status(401).json({ error: 'يرجى تأكيد بريدك الإلكتروني أولاً' });
        }

        if (user.status !== 'active') {
            return res.status(401).json({ error: 'حسابك غير نشط. يرجى التواصل مع الدعم' });
        }

        const isValid = await user.comparePassword(password);
        if (!isValid) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة السر غير صحيحة' });
        }

        // تحديث آخر تسجيل دخول
        await user.update({
            last_login: new Date(),
            ip_address: req.ip
        });

        const token = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({
            success: true,
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user.user_id,
                email: user.email,
                role: user.role,
                company_name: user.company_name,
                company_logo: user.company_logo,
                business_type: user.business_type,
                is_verified: user.is_verified
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
    }
};

/**
 * طلب استرداد كلمة السر
 * POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            // عدم الإفصاح عن وجود المستخدم لأسباب أمنية
            return res.json({ 
                success: true, 
                message: 'إذا كان البريد مسجلاً، ستتلقى تعليمات إعادة التعيين' 
            });
        }

        // إنشاء طلب استرداد
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const codeExpiry = new Date();
        codeExpiry.setMinutes(codeExpiry.getMinutes() + 30);

        await PasswordResetRequest.create({
            user_id: user.user_id,
            email: user.email,
            verification_code: verificationCode,
            code_expiry: codeExpiry,
            status: 'pending'
        });

        // إرسال الكود إلى البريد
        await sendPasswordResetEmail(email, verificationCode);

        // تسجيل في سجل المشرفين
        await logAdminAction({
            admin_id: null,
            action: 'password_reset_request',
            target_id: user.user_id,
            target_type: 'user',
            details: { email: user.email },
            ip_address: req.ip
        });

        res.json({ 
            success: true, 
            message: 'إذا كان البريد مسجلاً، ستتلقى تعليمات إعادة التعيين' 
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * إعادة تعيين كلمة السر (للمستخدم العادي)
 * POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;

        const resetRequest = await PasswordResetRequest.findOne({
            where: { email, verification_code: code, status: 'pending' }
        });

        if (!resetRequest) {
            return res.status(400).json({ error: 'طلب غير صالح' });
        }

        if (new Date() > resetRequest.code_expiry) {
            return res.status(400).json({ error: 'انتهت صلاحية الرابط' });
        }

        const user = await User.findByPk(resetRequest.user_id);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        // تحديث كلمة السر
        await user.update({ password_hash: newPassword });
        await resetRequest.update({ status: 'approved' });

        res.json({ success: true, message: 'تم تغيير كلمة السر بنجاح' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تحديث التوكن (Refresh Token)
 * POST /api/auth/refresh
 */
exports.refreshToken = async (req, res) => {
    try {
        const { token } = req.body;
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ error: 'توكن غير صالح' });
        }

        const user = await User.findByPk(decoded.userId);
        if (!user || user.status !== 'active') {
            return res.status(401).json({ error: 'مستخدم غير صالح' });
        }

        const newToken = jwt.sign(
            { userId: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.json({ success: true, token: newToken });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ error: 'توكن غير صالح' });
    }
};

/**
 * تسجيل الخروج
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
    try {
        // في حالة استخدام JWT، لا حاجة لحذف التوكن من الخادم
        // فقط العميل يحذف التوكن من التخزين المحلي
        res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};

/**
 * تغيير كلمة السر (للمستخدم المسجل)
 * POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.user_id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ error: 'المستخدم غير موجود' });
        }

        const isValid = await user.comparePassword(oldPassword);
        if (!isValid) {
            return res.status(400).json({ error: 'كلمة السر القديمة غير صحيحة' });
        }

        await user.update({ password_hash: newPassword });

        res.json({ success: true, message: 'تم تغيير كلمة السر بنجاح' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
};