/**
 * آفاق اليمن - النقطة الدخول الرئيسية للتطبيق
 * بسم الله الرحمن الرحيم
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
const fs = require('fs-extra');

// ============================================================
// استيراد النماذج (Models)
// ============================================================
const sequelize = require('./config/database');

const User = require('./models/User');
const Subscription = require('./models/Subscription');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const PaymentRequest = require('./models/PaymentRequest');
const WhatsAppBot = require('./models/WhatsAppBot');
const WhatsAppSession = require('./models/WhatsAppSession');
const TelegramBot = require('./models/TelegramBot');
const TelegramSubscriber = require('./models/TelegramSubscriber');
const ClientWebsite = require('./models/ClientWebsite');
const CatalogItem = require('./models/CatalogItem');
const AISetting = require('./models/AISetting');
const MessageUsage = require('./models/MessageUsage');
const SupportTicket = require('./models/SupportTicket');
const PasswordResetRequest = require('./models/PasswordResetRequest');
const Notification = require('./models/Notification');
const DeleteEditTrackingSetting = require('./models/DeleteEditTrackingSetting');
const AdminLog = require('./models/AdminLog');

// ============================================================
// تعريف العلاقات بين الجداول
// ============================================================

// User -> Subscriptions
User.hasMany(Subscription, { foreignKey: 'user_id', as: 'subscriptions' });
Subscription.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> PaymentRequests
User.hasMany(PaymentRequest, { foreignKey: 'user_id', as: 'payments' });
PaymentRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> WhatsAppBots
User.hasMany(WhatsAppBot, { foreignKey: 'user_id', as: 'whatsapp_bots' });
WhatsAppBot.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// WhatsAppBot -> WhatsAppSessions
WhatsAppBot.hasMany(WhatsAppSession, { foreignKey: 'bot_id', as: 'sessions' });
WhatsAppSession.belongsTo(WhatsAppBot, { foreignKey: 'bot_id', as: 'bot' });

// User -> TelegramBots
User.hasMany(TelegramBot, { foreignKey: 'user_id', as: 'telegram_bots' });
TelegramBot.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// TelegramBot -> TelegramSubscribers
TelegramBot.hasMany(TelegramSubscriber, { foreignKey: 'bot_id', as: 'subscribers' });
TelegramSubscriber.belongsTo(TelegramBot, { foreignKey: 'bot_id', as: 'bot' });

// User -> ClientWebsites
User.hasMany(ClientWebsite, { foreignKey: 'user_id', as: 'websites' });
ClientWebsite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> CatalogItems
User.hasMany(CatalogItem, { foreignKey: 'user_id', as: 'catalog_items' });
CatalogItem.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> AISettings
User.hasOne(AISetting, { foreignKey: 'user_id', as: 'ai_settings' });
AISetting.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> MessageUsage
User.hasMany(MessageUsage, { foreignKey: 'user_id', as: 'message_usage' });
MessageUsage.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> SupportTickets
User.hasMany(SupportTicket, { foreignKey: 'user_id', as: 'support_tickets' });
SupportTicket.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> PasswordResetRequests
User.hasMany(PasswordResetRequest, { foreignKey: 'user_id', as: 'reset_requests' });
PasswordResetRequest.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User -> Notifications
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// WhatsAppBot -> DeleteEditTrackingSetting
WhatsAppBot.hasOne(DeleteEditTrackingSetting, { foreignKey: 'bot_id', as: 'tracking_settings' });
DeleteEditTrackingSetting.belongsTo(WhatsAppBot, { foreignKey: 'bot_id', as: 'bot' });

// User -> AdminLogs (للمشرفين فقط)
User.hasMany(AdminLog, { foreignKey: 'admin_id', as: 'admin_logs' });
AdminLog.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });

// ============================================================
// استيراد الخدمات والمسارات
// ============================================================
const { startMainBot } = require('./services/telegramBot');
const { startCronJobs } = require('./services/cronJobs');
const { setupBackupService } = require('./services/backupService');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const botRoutes = require('./routes/bots');
const websiteRoutes = require('./routes/websites');
const catalogRoutes = require('./routes/catalog');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');

// ============================================================
// إنشاء تطبيق Express
// ============================================================
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// إعدادات الأمان
// ============================================================

// حماية الرؤوس
app.use(helmet({
    contentSecurityPolicy: false,
}));

// منع CORS
app.use(cors({
    origin: process.env.APP_URL,
    credentials: true
}));

// تحديد معدل الطلبات (Rate Limiting)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// جلسات أكثر أماناً
app.use(session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

// ============================================================
// إعدادات المعالجة
// ============================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// الملفات الثابتة
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// محرك القوالب (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================================================
// المسارات
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bots', botRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/webhooks', webhookRoutes);

// الصفحات الرئيسية (الموقع الرئيسي)
app.get('/', (req, res) => {
    res.render('main-website/index', {
        title: 'آفاق اليمن - المنصة المتكاملة لإدارة الأعمال الرقمية',
        user: req.session.user || null
    });
});

app.get('/services', (req, res) => {
    res.render('main-website/services', {
        title: 'خدماتنا - آفاق اليمن',
        user: req.session.user || null
    });
});

app.get('/pricing', (req, res) => {
    res.render('main-website/pricing', {
        title: 'الأسعار - آفاق اليمن',
        user: req.session.user || null
    });
});

app.get('/help-center', (req, res) => {
    res.render('main-website/help-center', {
        title: 'مركز المساعدة - آفاق اليمن',
        user: req.session.user || null
    });
});

app.get('/blog', (req, res) => {
    res.render('main-website/blog', {
        title: 'المدونة - آفاق اليمن',
        user: req.session.user || null
    });
});

app.get('/contact', (req, res) => {
    res.render('main-website/contact', {
        title: 'اتصل بنا - آفاق اليمن',
        user: req.session.user || null
    });
});

app.get('/privacy', (req, res) => {
    res.render('main-website/privacy', {
        title: 'سياسة الخصوصية - آفاق اليمن',
        user: req.session.user || null
    });
});

app.get('/terms', (req, res) => {
    res.render('main-website/terms', {
        title: 'شروط الاستخدام - آفاق اليمن',
        user: req.session.user || null
    });
});

app.get('/admin', (req, res) => {
    res.render('admin-dashboard/index', {
        title: 'لوحة التحكم - آفاق اليمن',
        user: req.session.user || null
    });
});

// مسار الصحة (Health Check)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================================
// معالجة الأخطاء
// ============================================================

app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - صفحة غير موجودة',
        message: 'عذراً، الصفحة التي تبحث عنها غير موجودة.',
        user: req.session.user || null
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).render('error', {
        title: '500 - خطأ في الخادم',
        message: 'عذراً، حدث خطأ داخلي في الخادم. يرجى المحاولة لاحقاً.',
        user: req.session.user || null
    });
});

// ============================================================
// تشغيل التطبيق
// ============================================================

async function startServer() {
    try {
        await fs.ensureDir(process.env.UPLOADS_PATH);
        await fs.ensureDir(process.env.BACKUPS_PATH);
        await fs.ensureDir(process.env.LOGS_PATH);
        await fs.ensureDir(process.env.SITES_PATH);

        await sequelize.authenticate();
        console.log('✅ Database connected successfully');

        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('✅ Database models synchronized');
        }

        await startMainBot();
        console.log('✅ Main Telegram bot started');

        startCronJobs();
        console.log('✅ Cron jobs scheduled');

        setupBackupService();
        console.log('✅ Backup service initialized');

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`🌐 Website: ${process.env.APP_URL}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();