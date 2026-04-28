const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// إعدادات أساسية
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.BASE_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// الملفات الثابتة
app.use('/public', express.static(path.join(__dirname, 'src/public')));

// محرك القوالب
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// ============================================================
// استيراد واجهات API (سيرفرليس فانكشنز)
// ============================================================
app.use('/api/auth', require('./api/auth'));
app.use('/api/users', require('./api/users'));
app.use('/api/bots', require('./api/bots'));
app.use('/api/catalog', require('./api/catalog'));
app.use('/api/payments', require('./api/payments'));
app.use('/api/admin', require('./api/admin'));

// ============================================================
// صفحات الموقع الرئيسي
// ============================================================
app.get('/', (req, res) => {
    res.render('main-website/index', { title: 'آفاق اليمن', user: null });
});

app.get('/services', (req, res) => {
    res.render('main-website/services', { title: 'خدماتنا - آفاق اليمن', user: null });
});

app.get('/pricing', (req, res) => {
    res.render('main-website/pricing', { title: 'الأسعار - آفاق اليمن', user: null });
});

app.get('/help-center', (req, res) => {
    res.render('main-website/help-center', { title: 'مركز المساعدة - آفاق اليمن', user: null });
});

app.get('/contact', (req, res) => {
    res.render('main-website/contact', { title: 'اتصل بنا - آفاق اليمن', user: null });
});

app.get('/privacy', (req, res) => {
    res.render('main-website/privacy', { title: 'سياسة الخصوصية - آفاق اليمن', user: null });
});

app.get('/terms', (req, res) => {
    res.render('main-website/terms', { title: 'شروط الاستخدام - آفاق اليمن', user: null });
});

// لوحة التحكم
app.get('/admin', (req, res) => {
    res.render('admin-dashboard/index', { title: 'لوحة التحكم - آفاق اليمن', user: null });
});

// صحة النظام
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// معالجة 404
app.use((req, res) => {
    res.status(404).render('error', { title: '404', message: 'الصفحة غير موجودة', user: null });
});

module.exports = app;