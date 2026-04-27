/**
 * البوت الرئيسي لشركة آفاق اليمن
 * باستخدام مكتبة grammY
 */

const { Bot, session, InlineKeyboard } = require('grammy');
const { User, AISetting, Subscription, SubscriptionPlan } = require('../models');
const { sendVerificationEmail, sendPaymentConfirmationEmail } = require('./emailService');
const crypto = require('crypto');

// إنشاء البوت
const bot = new Bot(process.env.MAIN_BOT_TOKEN);

// إدارة الجلسات
bot.use(session({
    initial: () => ({
        step: 'start',
        email: null,
        verificationCode: null,
        companyName: null,
        companyLogo: null,
        businessType: null,
        companyDescription: null,
        tempPassword: null
    })
}));

// ============================================================
// نقطة البداية /start
// ============================================================
bot.command('start', async (ctx) => {
    const telegramId = ctx.from.id;
    
    // التحقق من وجود المستخدم
    const user = await User.findOne({ where: { telegram_id: telegramId } });
    
    if (user) {
        // مستخدم موجود
        if (user.status === 'active') {
            ctx.session.step = 'main_menu';
            await showMainMenu(ctx, user);
        } else if (user.status === 'suspended') {
            await ctx.reply('❌ تم تعليق حسابك. يرجى التواصل مع الدعم.');
        } else if (user.status === 'deleted') {
            await ctx.reply('❌ حسابك محذوف. لا يمكن استعادته.');
        }
    } else {
        // مستخدم جديد - عرض سياسة الخصوصية
        const privacyPolicy = await getPrivacyPolicy();
        
        const keyboard = new InlineKeyboard()
            .text('✅ موافق', 'accept_privacy')
            .text('❌ غير موافق', 'reject_privacy');
        
        await ctx.reply(
            `🌟 *مرحباً بك في آفاق اليمن*\n\n` +
            `المنصة المتكاملة لإدارة أعمالك الرقمية.\n\n` +
            `*سياسة الخصوصية:*\n${privacyPolicy}\n\n` +
            `هل توافق على سياسة الخصوصية؟`,
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    }
});

// ============================================================
// معالجة الموافقة على سياسة الخصوصية
// ============================================================
bot.callbackQuery('accept_privacy', async (ctx) => {
    await ctx.answerCallbackQuery();
    ctx.session.step = 'ask_email';
    await ctx.reply(
        '📧 *إنشاء حساب جديد*\n\n' +
        'أدخل بريدك الإلكتروني:',
        { parse_mode: 'Markdown' }
    );
});

bot.callbackQuery('reject_privacy', async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
        '❌ لا يمكنك استخدام خدماتنا دون الموافقة على سياسة الخصوصية.\n\n' +
        'إذا غيرت رأيك، يمكنك الضغط على /start مرة أخرى.'
    );
});

// ============================================================
// إنشاء حساب جديد (جمع البريد الإلكتروني)
// ============================================================
bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    const step = ctx.session.step;
    
    if (step === 'ask_email') {
        // التحقق من صحة البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(text)) {
            await ctx.reply('❌ البريد الإلكتروني غير صحيح. يرجى المحاولة مرة أخرى:');
            return;
        }
        
        // التحقق من عدم وجود البريد مسبقاً
        const existingUser = await User.findOne({ where: { email: text } });
        if (existingUser) {
            await ctx.reply('❌ هذا البريد الإلكتروني مسجل بالفعل. يرجى استخدام بريد آخر أو تسجيل الدخول.');
            return;
        }
        
        ctx.session.email = text;
        ctx.session.step = 'ask_password';
        await ctx.reply(
            '🔑 *أدخل كلمة السر*\n\n' +
            'متطلبات كلمة السر:\n' +
            '• 8 أحرف على الأقل\n' +
            '• حرف كبير واحد على الأقل\n' +
            '• رقم واحد على الأقل\n' +
            '• رمز خاص واحد على الأقل (@, #, $, %)\n\n' +
            'أدخل كلمة السر:',
            { parse_mode: 'Markdown' }
        );
        
    } else if (step === 'ask_password') {
        // التحقق من قوة كلمة السر
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(text)) {
            await ctx.reply(
                '❌ كلمة السر لا تستوفي المتطلبات:\n' +
                '• 8 أحرف على الأقل\n' +
                '• حرف كبير واحد على الأقل\n' +
                '• رقم واحد على الأقل\n' +
                '• رمز خاص واحد على الأقل\n\n' +
                'يرجى المحاولة مرة أخرى:'
            );
            return;
        }
        
        // إنشاء كود تحقق عشوائي
        const verificationCode = crypto.randomInt(100000, 999999).toString();
        ctx.session.tempPassword = text;
        ctx.session.verificationCode = verificationCode;
        
        // إرسال كود التحقق إلى البريد الإلكتروني
        await sendVerificationEmail(ctx.session.email, verificationCode);
        
        ctx.session.step = 'verify_code';
        await ctx.reply(
            '📧 *تم إرسال رمز التحقق*\n\n' +
            `تم إرسال رمز التحقق إلى ${ctx.session.email}\n` +
            'يرجى إدخال الرمز (6 أرقام):',
            { parse_mode: 'Markdown' }
        );
        
    } else if (step === 'verify_code') {
        if (text === ctx.session.verificationCode) {
            // إنشاء المستخدم
            const user = await User.create({
                telegram_id: ctx.from.id,
                email: ctx.session.email,
                password_hash: ctx.session.tempPassword,
                is_verified: true,
                status: 'active'
            });
            
            // إعدادات المؤسسة
            ctx.session.userId = user.user_id;
            ctx.session.step = 'company_name';
            await ctx.reply(
                '✅ *تم إنشاء حسابك بنجاح!*\n\n' +
                '🏢 *الآن، قم بإعداد معلومات مؤسستك*\n\n' +
                'الخطوة 1/4: أدخل اسم مؤسستك:',
                { parse_mode: 'Markdown' }
            );
        } else {
            await ctx.reply('❌ رمز التحقق غير صحيح. يرجى المحاولة مرة أخرى:');
        }
        
    } else if (step === 'company_name') {
        ctx.session.companyName = text;
        ctx.session.step = 'company_logo';
        await ctx.reply(
            '📷 *الخطوة 2/4: أرسل شعار مؤسستك*\n\n' +
            'يرجى إرسال صورة الشعار (يمكنك إرسالها كصورة):',
            { parse_mode: 'Markdown' }
        );
        
    } else if (step === 'company_description') {
        if (text.length < 50) {
            await ctx.reply('❌ الوصف قصير جداً. يرجى كتابة وصف لا يقل عن 50 حرفاً:');
            return;
        }
        if (text.length > 5000) {
            await ctx.reply('❌ الوصف طويل جداً. يرجى اختصار الوصف إلى 5000 حرف كحد أقصى:');
            return;
        }
        
        ctx.session.companyDescription = text;
        
        // حفظ جميع بيانات المؤسسة
        await User.update({
            company_name: ctx.session.companyName,
            company_logo: ctx.session.companyLogo,
            business_type: ctx.session.businessType,
            company_description: ctx.session.companyDescription
        }, {
            where: { user_id: ctx.session.userId }
        });
        
        // إنشاء إعدادات الذكاء الاصطناعي الافتراضية
        await AISetting.create({
            user_id: ctx.session.userId,
            is_enabled: true
        });
        
        ctx.session.step = 'main_menu';
        const user = await User.findByPk(ctx.session.userId);
        await showMainMenu(ctx, user);
    }
});

// ============================================================
// معالجة الصور (الشعار)
// ============================================================
bot.on('message:photo', async (ctx) => {
    if (ctx.session.step === 'company_logo') {
        // الحصول على أكبر صورة
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        const file = await ctx.api.getFile(photo.file_id);
        const photoUrl = `https://api.telegram.org/file/bot${process.env.MAIN_BOT_TOKEN}/${file.file_path}`;
        
        ctx.session.companyLogo = photoUrl;
        ctx.session.step = 'business_type';
        
        const keyboard = new InlineKeyboard()
            .text('أعمال إلكترونية', 'type_online')
            .text('تجارية', 'type_commercial')
            .text('خدمات إلكترونية', 'type_eservices')
            .text('برمجية', 'type_software')
            .text('أخرى', 'type_other');
        
        await ctx.reply(
            '✅ *تم استلام الشعار*\n\n' +
            '🏷️ *الخطوة 3/4: اختر نوع نشاط مؤسستك:*',
            { parse_mode: 'Markdown', reply_markup: keyboard }
        );
    }
});

// ============================================================
// معالجة نوع النشاط
// ============================================================
bot.callbackQuery(/type_(.+)/, async (ctx) => {
    const typeMap = {
        online: 'أعمال إلكترونية',
        commercial: 'تجارية',
        eservices: 'خدمات إلكترونية',
        software: 'برمجية',
        other: 'أخرى'
    };
    
    ctx.session.businessType = typeMap[ctx.match[1]] || ctx.match[1];
    ctx.session.step = 'company_description';
    
    await ctx.answerCallbackQuery();
    await ctx.reply(
        '📝 *الخطوة 4/4: أدخل وصفاً لمؤسستك*\n\n' +
        'اكتب وصفاً تفصيلياً لمؤسستك (50-5000 حرف):\n\n' +
        'مثال: نقدم خدمات...',
        { parse_mode: 'Markdown' }
    );
});

// ============================================================
// عرض القائمة الرئيسية
// ============================================================
async function showMainMenu(ctx, user) {
    // جلب معلومات الاشتراك
    const subscription = await Subscription.findOne({
        where: { user_id: user.user_id, status: 'active' },
        include: [{ model: SubscriptionPlan, as: 'plan' }]
    });
    
    const planName = subscription?.plan?.name || 'مجاني';
    const endDate = subscription?.end_date ? new Date(subscription.end_date).toLocaleDateString('ar') : 'غير محدود';
    
    // جلب عدد الرسائل المستخدمة هذا الشهر
    const currentMonth = new Date().toISOString().slice(0, 7);
    const messageUsage = await MessageUsage.findOne({
        where: { user_id: user.user_id, month: currentMonth }
    });
    const messageCount = messageUsage?.message_count || 0;
    const messageLimit = subscription?.plan?.max_messages || process.env.FREE_MESSAGE_LIMIT;
    
    const keyboard = new InlineKeyboard()
        .text('🤖 إنشاء بوت واتساب', 'create_whatsapp')
        .text('🤖 إنشاء بوت تيليجرام', 'create_telegram')
        .row()
        .text('🌐 إنشاء موقع', 'create_website')
        .text('📋 كتالوج المؤسسة', 'catalog')
        .row()
        .text('💳 الاشتراك والدفع', 'subscription')
        .text('📊 التقارير', 'reports')
        .row()
        .text('⚙️ إعدادات الحساب', 'settings')
        .text('❓ الدعم والمساعدة', 'support')
        .row()
        .text('🔔 الإشعارات', 'notifications');
    
    await ctx.reply(
        `🤖 *آفاق اليمن - البوت الرئيسي*\n\n` +
        `👤 *مرحباً، ${user.company_name || user.email}*\n` +
        `📊 *حسابك:* ${planName}\n` +
        `📅 *ينتهي في:* ${endDate}\n` +
        `💬 *الرسائل هذا الشهر:* ${messageCount} / ${messageLimit}\n\n` +
        `اختر الخدمة التي تريدها:`,
        { parse_mode: 'Markdown', reply_markup: keyboard }
    );
}

/**
 * الحصول على نص سياسة الخصوصية من قاعدة البيانات
 */
async function getPrivacyPolicy() {
    // يمكن جلب النص من جدول system_settings
    return `نحن في آفاق اليمن نلتزم بحماية بياناتك.\n` +
           `• لن نقوم بمشاركة بياناتك مع أي طرف ثالث.\n` +
           `• يمكنك حذف حسابك في أي وقت.\n` +
           `• يتم تشفير جميع بياناتك الحساسة.\n` +
           `• للاطلاع على السياسة الكاملة: ${process.env.APP_URL}/privacy`;
}

// بدء البوت
async function startMainBot() {
    try {
        await bot.init();
        // استخدام webhook أو polling حسب البيئة
        if (process.env.NODE_ENV === 'production') {
            // تعيين webhook
            await bot.api.setWebhook(`${process.env.APP_URL}/webhooks/telegram/${process.env.MAIN_BOT_TOKEN}`);
        } else {
            // استخدام polling للتطوير
            bot.start();
        }
        console.log('✅ Main Telegram bot started');
    } catch (error) {
        console.error('Failed to start main bot:', error);
    }
}

module.exports = { startMainBot, bot };