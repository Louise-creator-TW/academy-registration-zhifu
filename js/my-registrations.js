// 我的報名頁面 JavaScript

let myRegistrations = [];
let currentUser = null;

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    // 檢查登入狀態
    if (!AuthManager.requireLogin()) {
        return;
    }
    
    currentUser = AuthManager.getCurrentUser();
    if (currentUser) {
        displayUserInfo();
        loadMyRegistrations();
    }
});

// 顯示用戶資訊
function displayUserInfo() {
    const userInfoCard = document.getElementById('userInfoCard');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userMobile = document.getElementById('userMobile');
    
    if (currentUser) {
        userInfoCard.style.display = 'block';
        userAvatar.src = currentUser.picture_url || '/images/default-avatar.png';
        userName.textContent = currentUser.display_name;
        userMobile.textContent = currentUser.mobile ? `手機：${currentUser.mobile}` : '';
    }
}

// 載入我的報名記錄
async function loadMyRegistrations() {
    try {
        const response = await fetch('tables/registrations?limit=1000&sort=-registration_date');
        const result = await response.json();
        
        // 篩選出當前用戶的報名記錄
        myRegistrations = result.data.filter(r => 
            r.line_user_id === currentUser.line_user_id
        );
        
        displayRegistrations();
    } catch (error) {
        console.error('載入報名記錄失敗:', error);
        showAlert('無法載入報名記錄，請稍後再試', 'error');
    }
}

// 顯示報名記錄
function displayRegistrations() {
    const container = document.getElementById('registrationsContainer');
    
    if (myRegistrations.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-inbox" style="font-size: 4rem; color: #7f8c8d; margin-bottom: 1rem;"></i>
                <h3 style="color: #7f8c8d; margin-bottom: 1rem;">目前沒有報名記錄</h3>
                <p style="color: #95a5a6; margin-bottom: 2rem;">趕快去報名您喜歡的課程吧！</p>
                <a href="registration.html" class="btn btn-primary">
                    <i class="fas fa-clipboard-list"></i> 前往報名
                </a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="registrations-list">
            ${myRegistrations.map(reg => createRegistrationCard(reg)).join('')}
        </div>
    `;
}

// 建立報名卡片
function createRegistrationCard(registration) {
    const date = new Date(registration.registration_date);
    const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    
    const paymentStatusClass = {
        '未繳費': 'badge-warning',
        '已繳費': 'badge-success',
        '已確認': 'badge-success'
    }[registration.payment_status] || 'badge-warning';
    
    return `
        <div class="registration-card">
            <div class="registration-card-header">
                <h3>${registration.course_name}</h3>
                <span class="badge ${paymentStatusClass}">
                    ${registration.payment_status || '未繳費'}
                </span>
            </div>
            <div class="registration-card-body">
                <div class="registration-info-grid">
                    <div class="registration-info-item">
                        <i class="fas fa-calendar-alt"></i>
                        <span>報名日期：${formattedDate}</span>
                    </div>
                    <div class="registration-info-item">
                        <i class="fas fa-credit-card"></i>
                        <span>繳費方式：${registration.payment_method}</span>
                    </div>
                    ${registration.payment_method === '轉帳繳費' && registration.account_last5 ? `
                    <div class="registration-info-item">
                        <i class="fas fa-hashtag"></i>
                        <span>帳號後5碼：${registration.account_last5}</span>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="registration-card-footer">
                <button class="btn btn-primary" onclick='showRegistrationDetail(${JSON.stringify(registration)})'>
                    <i class="fas fa-eye"></i> 查看詳細
                </button>
            </div>
        </div>
    `;
}

// 顯示報名詳細資料
function showRegistrationDetail(registration) {
    const date = new Date(registration.registration_date);
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    
    const paymentStatusClass = {
        '未繳費': 'badge-warning',
        '已繳費': 'badge-success',
        '已確認': 'badge-success'
    }[registration.payment_status] || 'badge-warning';
    
    let bankInfo = '';
    if (registration.payment_method === '轉帳繳費' && typeof BANK_ACCOUNT_INFO !== 'undefined') {
        const info = BANK_ACCOUNT_INFO.getDisplayInfo();
        bankInfo = `
            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-university"></i> 銀行轉帳資訊
                </h4>
                <div class="bank-info-card">
                    <h5 style="color: white !important; margin-bottom: 1rem;">
                        <i class="fas fa-university"></i> ${info.title}
                    </h5>
                    <div class="bank-details">
                        ${info.details.map(item => `
                            <div class="bank-detail-item">
                                <strong>${item.label}：</strong>
                                <span>${item.value}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="bank-notes">
                        <h6><i class="fas fa-exclamation-circle"></i> 匯款注意事項</h6>
                        <ul>
                            ${info.notes.map(note => `<li>${note}</li>`).join('')}
                        </ul>
                    </div>
                    ${registration.account_last5 ? `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.2);">
                        <strong style="color: rgba(255,255,255,0.9);">您填寫的帳號後5碼：</strong>
                        <span style="color: white; font-size: 1.2rem; font-weight: bold;">${registration.account_last5}</span>
                    </div>
                    ` : ''}
                </div>
            </section>
        `;
    }
    
    const content = `
        <div style="display: grid; gap: 1.5rem;">
            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-book"></i> 課程資訊
                </h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">課程名稱：</strong>
                        <span>${registration.course_name}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">報名日期：</strong>
                        <span>${formattedDate}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">繳費狀態：</strong>
                        <span class="badge ${paymentStatusClass}">${registration.payment_status || '未繳費'}</span>
                    </div>
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-user"></i> 報名資料
                </h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">姓名：</strong>
                        <span>${registration.name}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">性別：</strong>
                        <span>${registration.gender}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">年齡區段：</strong>
                        <span>${registration.age_range}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">手機號碼：</strong>
                        <span>${registration.mobile}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">宗教信仰：</strong>
                        <span>${registration.religion}</span>
                    </div>
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-exclamation-triangle"></i> 緊急聯絡人
                </h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">聯絡人姓名：</strong>
                        <span>${registration.emergency_contact}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">聯絡人電話：</strong>
                        <span>${registration.emergency_phone}</span>
                    </div>
                </div>
            </section>

            ${bankInfo}

            ${registration.notes ? `
            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-sticky-note"></i> 備註
                </h4>
                <div style="padding: 1rem; background: #f8f9fa; border-radius: 4px; white-space: pre-wrap;">
                    ${registration.notes}
                </div>
            </section>
            ` : ''}
        </div>
    `;
    
    document.getElementById('detailContent').innerHTML = content;
    document.getElementById('detailModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉詳細資料 Modal
function closeDetailModal() {
    document.getElementById('detailModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 點擊 Modal 外部關閉
document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDetailModal();
    }
});

// 顯示提示訊息
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-info';
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
    alert.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(alert);
    
    // 3秒後自動移除
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-20px)';
        alert.style.transition = 'all 0.3s ease';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}
