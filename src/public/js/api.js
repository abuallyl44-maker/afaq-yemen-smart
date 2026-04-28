/**
 * آفاق اليمن - دوال API
 */

const API_BASE = '/api';

// تخزين التوكن
let authToken = localStorage.getItem('token');

// تعيين التوكن
function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('token', token);
    } else {
        localStorage.removeItem('token');
    }
}

// طلب HTTP عام
async function request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    const response = await fetch(url, {
        ...options,
        headers
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'حدث خطأ في الطلب');
    }
    
    return response.json();
}

// طرق HTTP
const api = {
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, data) => request(endpoint, { method: 'POST', body: JSON.stringify(data) }),
    put: (endpoint, data) => request(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (endpoint) => request(endpoint, { method: 'DELETE' })
};

// ============================================================
// واجهات المصادقة
// ============================================================

async function register(email, password, telegramId = null) {
    return api.post('/auth/register', { email, password, telegram_id: telegramId });
}

async function verifyEmail(email, code) {
    return api.post('/auth/verify', { email, code });
}

async function login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.token) {
        setAuthToken(response.token);
    }
    return response;
}

async function logout() {
    setAuthToken(null);
    return api.post('/auth/logout');
}

async function forgotPassword(email) {
    return api.post('/auth/forgot-password', { email });
}

async function resetPassword(email, code, newPassword) {
    return api.post('/auth/reset-password', { email, code, newPassword });
}

async function changePassword(oldPassword, newPassword) {
    return api.post('/auth/change-password', { oldPassword, newPassword });
}

// ============================================================
// واجهات المستخدمين
// ============================================================

async function getMe() {
    return api.get('/users/me');
}

async function updateMe(data) {
    return api.put('/users/me', data);
}

async function deleteAccount() {
    return api.delete('/users/me');
}

// ============================================================
// واجهات البوتات
// ============================================================

async function getWhatsAppBots() {
    return api.get('/bots/whatsapp');
}

async function createWhatsAppBot(botName) {
    return api.post('/bots/whatsapp', { bot_name: botName });
}

async function getQRCode(botId) {
    return api.get(`/bots/whatsapp/${botId}/qr`);
}

async function addWhatsAppSession(botId, sessionName, phoneNumber) {
    return api.post(`/bots/whatsapp/${botId}/session`, { session_name: sessionName, phone_number: phoneNumber });
}

async function deleteWhatsAppBot(botId) {
    return api.delete(`/bots/whatsapp/${botId}`);
}

async function getTelegramBots() {
    return api.get('/bots/telegram');
}

async function createTelegramBot(botName, botToken, botUsername, welcomeMessage) {
    return api.post('/bots/telegram', { bot_name: botName, bot_token: botToken, bot_username: botUsername, welcome_message: welcomeMessage });
}

async function deleteTelegramBot(botId) {
    return api.delete(`/bots/telegram/${botId}`);
}

// ============================================================
// واجهات الكتالوج
// ============================================================

async function getCatalog() {
    return api.get('/catalog');
}

async function addService(data) {
    return api.post('/catalog/services', data);
}

async function addProduct(data) {
    return api.post('/catalog/products', data);
}

async function addOffer(data) {
    return api.post('/catalog/offers', data);
}

async function addAd(data) {
    return api.post('/catalog/ads', data);
}

async function addAutoReply(data) {
    return api.post('/catalog/auto-replies', data);
}

async function updateCatalogItem(itemId, data) {
    return api.put(`/catalog/${itemId}`, data);
}

async function deleteCatalogItem(itemId) {
    return api.delete(`/catalog/${itemId}`);
}

// ============================================================
// واجهات الاشتراكات والدفع
// ============================================================

async function getPlans() {
    return api.get('/payments/plans');
}

async function getMyPlan() {
    return api.get('/payments/my-plan');
}

async function requestPayment(planId, company, transferNumber, senderName) {
    return api.post('/payments/request', { plan_id: planId, company, transfer_number: transferNumber, sender_name: senderName });
}

async function getMyRequests() {
    return api.get('/payments/my-requests');
}

// تصدير جميع الدوال
window.AfaqAPI = {
    setAuthToken,
    register,
    verifyEmail,
    login,
    logout,
    forgotPassword,
    resetPassword,
    changePassword,
    getMe,
    updateMe,
    deleteAccount,
    getWhatsAppBots,
    createWhatsAppBot,
    getQRCode,
    addWhatsAppSession,
    deleteWhatsAppBot,
    getTelegramBots,
    createTelegramBot,
    deleteTelegramBot,
    getCatalog,
    addService,
    addProduct,
    addOffer,
    addAd,
    addAutoReply,
    updateCatalogItem,
    deleteCatalogItem,
    getPlans,
    getMyPlan,
    requestPayment,
    getMyRequests
};