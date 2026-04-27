const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// التأكد من وجود المجلدات
const uploadsDir = path.join(__dirname, '../../uploads');
const logosDir = path.join(uploadsDir, 'logos');
const heroDir = path.join(uploadsDir, 'hero');
const imagesDir = path.join(uploadsDir, 'images');

fs.ensureDirSync(logosDir);
fs.ensureDirSync(heroDir);
fs.ensureDirSync(imagesDir);

// تكوين تخزين الشعارات
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, logosDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `logo-${req.user?.user_id || 'temp'}-${uniqueSuffix}${ext}`);
    }
});

// تكوين تخزين صور الخلفية
const heroStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, heroDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `hero-${req.user?.user_id || 'temp'}-${uniqueSuffix}${ext}`);
    }
});

// تكوين تخزين الصور العامة
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, imagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `img-${uniqueSuffix}${ext}`);
    }
});

// فلترة الملفات (السماح فقط بالصور)
const imageFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('نوع الملف غير مدعوم. يرجى رفع صورة فقط'), false);
    }
};

// رفع الشعار
const uploadLogo = multer({
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
});

// رفع صورة الخلفية
const uploadHero = multer({
    storage: heroStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: imageFilter
});

// رفع صور عامة
const uploadImage = multer({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: imageFilter
});

// رفع صور متعددة
const uploadImages = multer({
    storage: imageStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB لكل صورة
    fileFilter: imageFilter
}).array('images', 10);

module.exports = {
    uploadLogo,
    uploadHero,
    uploadImage,
    uploadImages
};