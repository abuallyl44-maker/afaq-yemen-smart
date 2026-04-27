const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, PasswordResetRequest } = require('../models');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const router = express.Router();

/**
 * POST /api/auth/register
 * تسجيل مستخدم جديد
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // التحقق من وجود البريد
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'البريد الإلكتروني مسجل بالفعل' });
        }

        // إنشاء كود تحقق
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        const codeExpiry = new Date();
        codeExpiry.setMinutes(codeExpiry.getMinutes() + 10);

        // إنشاء المستخدم
        const user = await User.create({
            email,
            password_hash: password,
            verification_code: verificationCode,
            code_expiry: codeExpiry,
            is_verified: false,
            status: 'active'
        });

        // إرسال كود التحقق
        await sendVerificationEmail(email, verificationCode);

        res.status(201).json({
            message: 'تم إنشاء الحساب بنجاح. يرجى التحقق من بريدك الإلكتروني.',
            userId: user.user_id
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء التسجيل' });
    }
});

/**
 * POST /api/auth/verify
 * التحقق من البريد الإلكتروني
 */
router.post('/verify', async (req, res) => {
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
            message: 'تم تأكيد البريد الإلكتروني بنجاح',
            token,
            user: {
                id: user.user_id,
                email: user.email,
                role: user.role,
                company_name: user.company_name
            }
        });
    } catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء التحقق' });
    }
});

/**
 * POST /api/auth/login
 * تسجيل الدخول
 */
router.post('/login', async (req, res) => {
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
            message: 'تم تسجيل الدخول بنجاح',
            token,
            user: {
                id: user.user_id,
                email: user.email,
                role: user.role,
                company_name: user.company_name,
                company_logo: user.company_logo,
                business_type: user.business_type
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تسجيل الدخول' });
    }
});

/**
 * POST /api/auth/forgot-password
 * طلب استرداد كلمة السر
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ where: { email } });
        if (!user) {
            // عدم الإفصاح عن وجود المستخدم لأسباب أمنية
            return res.json({ message: 'إذا كان البريد مسجلاً، ستتلقى تعليمات إعادة التعيين' });
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

        res.json({ message: 'إذا كان البريد مسجلاً، ستتلقى تعليمات إعادة التعيين' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

/**
 * POST /api/auth/reset-password
 * إعادة تعيين كلمة السر (بعد موافقة المشرف)
 */
router.post('/reset-password', async (req, res) => {
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

        res.json({ message: 'تم تغيير كلمة السر بنجاح' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'حدث خطأ' });
    }
});

module.exports = router;