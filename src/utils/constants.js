/**
 * الثوابت العامة للنظام (Constants)
 * تحتوي على القيم الثابتة المستخدمة في جميع أنحاء النظام
 */

// أنواع المستخدمين
const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin',
    SUPPORT: 'support',
    CONTENT_EDITOR: 'content_editor'
};

// حالات المستخدم
const USER_STATUS = {
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    DELETED: 'deleted'
};

// حالات الاشتراك
const SUBSCRIPTION_STATUS = {
    ACTIVE: 'active',
    EXPIRED: 'expired',
    PENDING: 'pending',
    CANCELLED: 'cancelled'
};

// حالات طلبات الدفع
const PAYMENT_STATUS = {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    REJECTED: 'rejected'
};

// شركات الحوالات المالية
const MONEY_TRANSFER_COMPANIES = {
    HAZMI: 'حزمي',
    AL_SAREE: 'السريع',
    YEMEN_EXPRESS: 'يمن إكسبرس',
    OTHER: 'أخرى'
};

// أنواع عناصر الكتالوج
const CATALOG_TYPES = {
    SERVICE: 'service',
    PRODUCT: 'product',
    OFFER: 'offer',
    AD: 'ad',
    AUTO_REPLY: 'auto_reply',
    STORY: 'story'
};

// أنواع الردود الآلية
const AUTO_REPLY_MATCH_TYPES = {
    CONTAINS: 'contains',
    EXACT: 'exact',
    STARTS_WITH: 'starts_with',
    REGEX: 'regex'
};

// أنواع نبرة الذكاء الاصطناعي
const AI_TONES = {
    FORMAL: 'رسمي',
    FRIENDLY: 'ودود',
    NEUTRAL: 'محايد',
    PERSUASIVE: 'محفز للشراء'
};

// حالات البوتات
const BOT_STATUS = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    PENDING: 'pending',
    EXPIRED: 'expired'
};

// حالات المواقع
const WEBSITE_STATUS = {
    ACTIVE: 'active',
    BUILDING: 'building',
    DISABLED: 'disabled',
    TRIAL: 'trial'
};

// أنواع تذاكر الدعم
const TICKET_TYPES = {
    INQUIRY: 'استفسار',
    TECHNICAL: 'مشكلة تقنية',
    COMPLAINT: 'شكوى',
    SUGGESTION: 'اقتراح'
};

// حالات تذاكر الدعم
const TICKET_STATUS = {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    CLOSED: 'closed'
};

// أنواع الإشعارات
const NOTIFICATION_TYPES = {
    PAYMENT_CONFIRMED: 'payment_confirmed',
    PAYMENT_REJECTED: 'payment_rejected',
    SESSION_EXPIRED: 'session_expired',
    SUBSCRIPTION_EXPIRED: 'subscription_expired',
    SUBSCRIPTION_EXPIRING: 'subscription_expiring',
    LIMIT_EXCEEDED: 'limit_exceeded',
    BOT_CREATED: 'bot_created',
    WEBSITE_CREATED: 'website_created',
    NEW_USER: 'new_user'
};

// أنواع المنصات للحالات الترويجية
const STORY_PLATFORMS = {
    WHATSAPP: 'whatsapp',
    TELEGRAM: 'telegram',
    BOTH: 'both'
};

// أنواع وسائط الحالات
const STORY_MEDIA_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video'
};

// أقصى حجم للملفات (بالميغابايت)
const MAX_FILE_SIZES = {
    LOGO: 5,      // 5 MB
    HERO: 10,     // 10 MB
    IMAGE: 5,     // 5 MB
    VIDEO: 50     // 50 MB
};

// أنواع الملفات المسموحة
const ALLOWED_MIME_TYPES = {
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    VIDEOS: ['video/mp4', 'video/mpeg', 'video/webm']
};

// الحدود الافتراضية للمستخدمين المجانيين
const FREE_TIER_LIMITS = {
    MAX_MESSAGES: 1000,
    MAX_BOTS: 1,
    MAX_WHATSAPP_BOTS: 1,
    MAX_TELEGRAM_BOTS: 1,
    HAS_WEBSITE: false,
    HAS_AI: false,
    HAS_CUSTOM_DOMAIN: false,
    PRIORITY_SUPPORT: false
};

// المهل الزمنية الافتراضية
const DEFAULT_TIMEOUTS = {
    WEBSITE_TRIAL_DAYS: 2,
    PAYMENT_WAITING_HOURS: 48,
    VERIFICATION_CODE_MINUTES: 10,
    PASSWORD_RESET_MINUTES: 30,
    SESSION_CACHE_SECONDS: 3600,
    JWT_EXPIRES_DAYS: 7
};

// رسائل الخطأ العامة
const ERROR_MESSAGES = {
    UNAUTHORIZED: 'غير مصرح به. يرجى تسجيل الدخول',
    FORBIDDEN: 'ليس لديك صلاحية للوصول إلى هذا المورد',
    NOT_FOUND: 'المورد غير موجود',
    BAD_REQUEST: 'طلب غير صالح',
    INTERNAL_ERROR: 'حدث خطأ داخلي في الخادم',
    VALIDATION_ERROR: 'بيانات غير صالحة',
    RATE_LIMIT: 'لقد تجاوزت عدد الطلبات المسموح بها. يرجى المحاولة لاحقاً'
};

// رسائل النجاح العامة
const SUCCESS_MESSAGES = {
    CREATED: 'تم الإنشاء بنجاح',
    UPDATED: 'تم التحديث بنجاح',
    DELETED: 'تم الحذف بنجاح',
    ACTIVATED: 'تم التفعيل بنجاح',
    DEACTIVATED: 'تم الإلغاء بنجاح'
};

// إعدادات الترقيم
const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
};

// تعابير منتظمة (Regular Expressions)
const REGEX = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
    HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
    PASSWORD: /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
    TRANSFER_NUMBER_HAZMI: /^\d{8,12}$/,
    TRANSFER_NUMBER_AL_SAREE: /^\d{10,14}$/,
    TRANSFER_NUMBER_YEMEN_EXPRESS: /^\d{12}$/
};

module.exports = {
    USER_ROLES,
    USER_STATUS,
    SUBSCRIPTION_STATUS,
    PAYMENT_STATUS,
    MONEY_TRANSFER_COMPANIES,
    CATALOG_TYPES,
    AUTO_REPLY_MATCH_TYPES,
    AI_TONES,
    BOT_STATUS,
    WEBSITE_STATUS,
    TICKET_TYPES,
    TICKET_STATUS,
    NOTIFICATION_TYPES,
    STORY_PLATFORMS,
    STORY_MEDIA_TYPES,
    MAX_FILE_SIZES,
    ALLOWED_MIME_TYPES,
    FREE_TIER_LIMITS,
    DEFAULT_TIMEOUTS,
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    PAGINATION,
    REGEX
};