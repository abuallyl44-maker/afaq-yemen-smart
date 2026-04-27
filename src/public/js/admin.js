/**
 * آفاق اليمن - سكريبت لوحة التحكم
 */

document.addEventListener('DOMContentLoaded', function() {
    initAdminMenu();
    initDataTables();
    initCharts();
    initPaymentActions();
    initUserActions();
});

// القائمة الجانبية
function initAdminMenu() {
    const currentPath = window.location.pathname;
    const menuLinks = document.querySelectorAll('.admin-menu-link');
    
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });
}

// الجداول
function initDataTables() {
    const tables = document.querySelectorAll('.data-table');
    tables.forEach(table => {
        addSearchToTable(table);
        addSortToTable(table);
    });
}

// إضافة بحث للجدول
function addSearchToTable(table) {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'بحث...';
    searchInput.className = 'form-control';
    searchInput.style.width = '250px';
    searchInput.style.marginBottom = '15px';
    
    const header = table.closest('.admin-card')?.querySelector('.admin-card-header');
    if (header) {
        header.appendChild(searchInput);
        
        searchInput.addEventListener('keyup', function() {
            const searchTerm = this.value.toLowerCase();
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

// إضافة ترتيب للجدول
function addSortToTable(table) {
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
        header.style.cursor = 'pointer';
        header.addEventListener('click', () => {
            sortTable(table, index);
        });
    });
}

// ترتيب الجدول
function sortTable(table, column) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const isAsc = table.dataset.sortAsc === 'true';
    
    rows.sort((a, b) => {
        const aVal = a.cells[column].textContent;
        const bVal = b.cells[column].textContent;
        return isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    
    rows.forEach(row => tbody.appendChild(row));
    table.dataset.sortAsc = !isAsc;
}

// الرسوم البيانية
function initCharts() {
    const charts = document.querySelectorAll('[data-chart]');
    charts.forEach(chart => {
        const type = chart.dataset.chart;
        const data = JSON.parse(chart.dataset.data || '{}');
        
        if (typeof Chart !== 'undefined') {
            new Chart(chart, {
                type: type,
                data: data,
                options: { responsive: true }
            });
        }
    });
}

// إجراءات الدفع
function initPaymentActions() {
    // تأكيد الدفع
    document.querySelectorAll('.btn-confirm-payment').forEach(btn => {
        btn.addEventListener('click', async function() {
            const paymentId = this.dataset.paymentId;
            const planId = prompt('يرجى إدخال معرف الخطة (plan_id):');
            
            if (planId) {
                try {
                    await apiCall(`/api/payments/admin/confirm/${paymentId}`, {
                        method: 'POST',
                        body: JSON.stringify({ plan_id: parseInt(planId) })
                    });
                    showNotification('تم تأكيد الدفع بنجاح', 'success');
                    location.reload();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        });
    });
    
    // رفض الدفع
    document.querySelectorAll('.btn-reject-payment').forEach(btn => {
        btn.addEventListener('click', async function() {
            const paymentId = this.dataset.paymentId;
            const reason = prompt('يرجى إدخال سبب الرفض:');
            
            if (reason) {
                try {
                    await apiCall(`/api/payments/admin/reject/${paymentId}`, {
                        method: 'POST',
                        body: JSON.stringify({ reason })
                    });
                    showNotification('تم رفض الدفع', 'success');
                    location.reload();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        });
    });
}

// إجراءات المستخدمين
function initUserActions() {
    // تعليق/تفعيل المستخدم
    document.querySelectorAll('.btn-toggle-user').forEach(btn => {
        btn.addEventListener('click', async function() {
            const userId = this.dataset.userId;
            const currentStatus = this.dataset.status;
            const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
            const action = newStatus === 'active' ? 'تفعيل' : 'تعليق';
            
            if (confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) {
                try {
                    await apiCall(`/api/admin/users/${userId}/status`, {
                        method: 'PUT',
                        body: JSON.stringify({ status: newStatus })
                    });
                    showNotification(`تم ${action} المستخدم بنجاح`, 'success');
                    location.reload();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            }
        });
    });
    
    // حذف المستخدم
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', function() {
            const userId = this.dataset.userId;
            confirmDelete(`/api/admin/users/${userId}`, 'هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع.');
        });
    });
}

// تحديث الإحصائيات (AJAX)
async function refreshStats() {
    try {
        const data = await apiCall('/api/admin/stats');
        
        document.querySelectorAll('.stat-users').forEach(el => {
            el.textContent = data.total_users;
        });
        
        document.querySelectorAll('.stat-bots').forEach(el => {
            el.textContent = data.total_bots;
        });
        
        document.querySelectorAll('.stat-revenue').forEach(el => {
            el.textContent = data.total_revenue + ' ريال';
        });
    } catch (error) {
        console.error('Failed to refresh stats:', error);
    }
}

// تصدير البيانات
function exportData(type) {
    window.location.href = `/api/admin/export/${type}?token=${localStorage.getItem('token')}`;
}