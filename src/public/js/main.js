/**
 * آفاق اليمن - السكريبت الرئيسي
 */

// انتظار تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    initMobileMenu();
    initForms();
    initNotifications();
});

// القائمة المتجاوبة
function initMobileMenu() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
}

// النماذج
function initForms() {
    // منع إرسال النموذج الفارغ
    const forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!validateForm(this)) {
                e.preventDefault();
            }
        });
    });
}

// التحقق من النموذج
function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            showError(field, 'هذا الحقل مطلوب');
            isValid = false;
        } else {
            clearError(field);
        }
    });
    
    return isValid;
}

// عرض الخطأ
function showError(field, message) {
    clearError(field);
    field.classList.add('is-invalid');
    const error = document.createElement('div');
    error.className = 'invalid-feedback';
    error.textContent = message;
    field.parentNode.appendChild(error);
}

// مسح الخطأ
function clearError(field) {
    field.classList.remove('is-invalid');
    const error = field.parentNode.querySelector('.invalid-feedback');
    if (error) error.remove();
}

// الإشعارات
function initNotifications() {
    // إخفاء الإشعار تلقائياً بعد 5 ثوانٍ
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.transition = 'opacity 0.5s';
            alert.style.opacity = '0';
            setTimeout(() => alert.remove(), 500);
        }, 5000);
    });
}

// عرض إشعار
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.padding = '15px 20px';
    notification.style.borderRadius = '8px';
    notification.style.backgroundColor = type === 'success' ? '#28a745' : '#dc3545';
    notification.style.color = 'white';
    notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 5000);
}

// وظيفة مساعدة لـ API
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            ...options
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'حدث خطأ');
        }
        
        return await response.json();
    } catch (error) {
        showNotification(error.message, 'error');
        throw error;
    }
}

// تأكيد الحذف
function confirmDelete(url, message = 'هل أنت متأكد من حذف هذا العنصر؟') {
    if (confirm(message)) {
        apiCall(url, { method: 'DELETE' })
            .then(() => {
                showNotification('تم الحذف بنجاح', 'success');
                location.reload();
            })
            .catch(() => {});
    }
}

// تصدير للاستخدام العام
window.apiCall = apiCall;
window.showNotification = showNotification;
window.confirmDelete = confirmDelete;
