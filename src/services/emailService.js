/**
 * خدمة إرسال البريد الإلكتروني
 */

const nodemailer = require('nodemailer');

// إنشاء transporter
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT),
            secure: process.env.EMAIL_PORT === '465',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
    }
    return transporter;
}

/**
 * إرسال بريد التحقق
 */
async function sendVerificationEmail(to, code) {
    try {
        const transporter = getTransporter();
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: to,
            subject: 'رمز التحقق - آفاق اليمن',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">آفاق اليمن</h2>
                    <p>شكراً لتسجيلك في منصة آفاق اليمن.</p>
                    <p>رمز التحقق الخاص بك هو:</p>
                    <div style="font-size: 32px; font-weight: bold; padding: 20px; background-color: #f4f4f4; text-align: center; letter-spacing: 5px;">
                        ${code}
                    </div>
                    <p>هذا الرمز صالح لمدة 10 دقائق.</p>
                    <p>إذا لم تقم بطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">© 2024 آفاق اليمن - جميع الحقوق محفوظة</p>
                </div>
            `
        });
        console.log(`Verification email sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
}

/**
 * إرسال إشعار تأكيد الدفع
 */
async function sendPaymentConfirmationEmail(to, amount, planName, endDate) {
    try {
        const transporter = getTransporter();
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: to,
            subject: 'تم تأكيد دفعتك - آفاق اليمن',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #007bff;">آفاق اليمن</h2>
                    <p>✅ تم تأكيد دفعتك بنجاح!</p>
                    <div style="padding: 20px; background-color: #f4f4f4;">
                        <p><strong>المبلغ:</strong> ${amount} ريال</p>
                        <p><strong>الخطة:</strong> ${planName}</p>
                        <p><strong>تنتهي في:</strong> ${endDate}</p>
                    </div>
                    <p>شكراً لثقتك بنا!</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">© 2024 آفاق اليمن - جميع الحقوق محفوظة</p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
}

/**
 * إرسال إشعار رفض الدفع
 */
async function sendPaymentRejectionEmail(to, amount, reason) {
    try {
        const transporter = getTransporter();
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to: to,
            subject: 'تعذر تأكيد دفعتك - آفاق اليمن',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #dc3545;">آفاق اليمن</h2>
                    <p>❌ لم نتمكن من تأكيد دفعتك.</p>
                    <div style="padding: 20px; background-color: #f4f4f4;">
                        <p><strong>السبب:</strong> ${reason}</p>
                        <p><strong>المبلغ:</strong> ${amount} ريال</p>
                    </div>
                    <p>يرجى المحاولة مرة أخرى أو التواصل مع الدعم.</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">© 2024 آفاق اليمن - جميع الحقوق محفوظة</p>
                </div>
            `
        });
        return true;
    } catch (error) {
        console.error('Email sending failed:', error);
        return false;
    }
}

module.exports = {
    sendVerificationEmail,
    sendPaymentConfirmationEmail,
    sendPaymentRejectionEmail
};