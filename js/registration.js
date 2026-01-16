// 報名頁面 JavaScript (最終修正版)

let courses = [];
let selectedCourse = null;

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    loadCourses();
});

// 切換帳號欄位和銀行資訊顯示
function toggleAccountField() {
    const paymentMethod = document.getElementById('paymentMethod')?.value;
    const accountFieldGroup = document.getElementById('accountFieldGroup');
    const accountInput = document.getElementById('accountLast5');
    const bankInfoDisplay = document.getElementById('bankInfoDisplay');
    const bankInfoContent = document.getElementById('bankInfoContent');
    
    if (!accountFieldGroup) return; // 安全檢查

    if (paymentMethod === '轉帳繳費') {
        accountFieldGroup.style.display = 'block';
        if(accountInput) accountInput.required = true;
        if(bankInfoDisplay) bankInfoDisplay.style.display = 'block';
        
        // 顯示銀行帳戶資訊
        if (typeof BANK_ACCOUNT_INFO !== 'undefined' && bankInfoContent) {
            const info = BANK_ACCOUNT_INFO.getDisplayInfo();
            bankInfoContent.innerHTML = `
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
            `;
        }
    } else {
        accountFieldGroup.style.display = 'none';
        if(accountInput) {
            accountInput.required = false;
            accountInput.value = '';
        }
        if(bankInfoDisplay) bankInfoDisplay.style.display = 'none';
    }
}

// 切換代理報名資訊顯示
function toggleProxyRegistrationInfo() {
    const isProxyCheckbox = document.getElementById('isProxyRegistration');
    const proxyInfo = document.getElementById('proxyRegistrationInfo');
    
    if (isProxyCheckbox && proxyInfo) {
        if (isProxyCheckbox.checked) {
            proxyInfo.style.display = 'block';
        } else {
            proxyInfo.style.display = 'none';
        }
    }
}

// 載入課程列表
async function loadCourses() {
    try {
        console.log('📥 載入課程列表...');
        const result = await ApiHelper.get('api/courses', { limit: 100 });
        console.log('✅ 課程載入成功:', result);
        // 相容性處理：有些API直接回傳陣列，有些回傳 {data: []}
        courses = Array.isArray(result) ? result : (result.data || []);
        displayCourses();
    } catch (error) {
        console.error('❌ 載入課程失敗:', error);
        showAlert('無法載入課程資料，請稍後再試', 'error');
    }
}

// 顯示課程列表
function displayCourses() {
    const container = document.getElementById('coursesContainer');
    if (!container) return;
    
    if (courses.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; grid-column: 1/-1;">
                <i class="fas fa-info-circle" style="font-size: 3rem; color: #7f8c8d; margin-bottom: 1rem;"></i>
                <p style="color: #7f8c8d; font-size: 1.2rem;">目前尚無開設課程</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = courses.map(course => {
        const isFull = course.is_full || course.current_enrolled >= course.capacity;
        const availableSeats = course.capacity - course.current_enrolled;
        
        return `
            <div class="course-card">
                <div class="course-header">
                    <h3>${course.name}</h3>
                    <p class="teacher"><i class="fas fa-chalkboard-teacher"></i> ${course.teacher}</p>
                </div>
                <div class="course-body">
                    <div class="course-info">
                        <div class="course-info-item">
                            <i class="fas fa-clock"></i>
                            <span>${course.time}</span>
                        </div>
                        <div class="course-info-item">
                            <i class="fas fa-dollar-sign"></i>
                            <span>費用：NT$ ${course.cost.toLocaleString()}</span>
                        </div>
                        <div class="course-info-item">
                            <i class="fas fa-users"></i>
                            <span>名額：${course.current_enrolled} / ${course.capacity}</span>
                        </div>
                    </div>
                    <div class="course-footer">
                        <span class="enrollment-status ${isFull ? 'full' : 'available'}">
                            ${isFull ? '<i class="fas fa-times-circle"></i> 已額滿' : `<i class="fas fa-check-circle"></i> 尚有 ${availableSeats} 名額`}
                        </span>
                        <button class="btn btn-primary" onclick="openRegistrationForm('${course.id}')" ${isFull ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i> ${isFull ? '已額滿' : '我要報名'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 開啟報名表單
async function openRegistrationForm(courseId) {
    if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
        if (confirm('報名課程需要先登入，是否使用 LINE 登入？')) {
            AuthManager.lineLogin();
        }
        return;
    }
    
    selectedCourse = courses.find(c => c.id === courseId);
    if (!selectedCourse) return;
    
    // 檢查是否已報名過
    const user = AuthManager.getCurrentUser();
    if (user) {
        try {
            // 使用正確的 API 路徑檢查
            const checkResult = await ApiHelper.get('api/registrations', { limit: 1000 });
            const records = Array.isArray(checkResult) ? checkResult : (checkResult.data || []);
            
            // 只檢查「非代理報名」的記錄
            const isRegistered = records.some(r => 
                r.line_user_id === user.line_user_id && 
                r.course_id === courseId &&
                r.is_proxy_registration === false
            );
            
            if (isRegistered) {
                showAlert('您已經報名過此課程了！如需幫他人報名，請勾選「替別人報名」選項。', 'error');
                return;
            }
        } catch (error) {
            console.error('檢查重複報名失敗:', error);
        }
    }
    
    // 安全填入課程資訊
    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
    setVal('courseId', selectedCourse.id);
    setVal('courseName', selectedCourse.name);
    setVal('displayCourseName', selectedCourse.name);
    
    // 重置表單
    const form = document.getElementById('registrationForm');
    if (form) form.reset();
    
    // 重設隱藏欄位
    setVal('courseId', selectedCourse.id);
    setVal('courseName', selectedCourse.name);
    setVal('displayCourseName', selectedCourse.name);
    
    // 重置代理選項
    const isProxyEl = document.getElementById('isProxyRegistration');
    const proxyInfoEl = document.getElementById('proxyRegistrationInfo');
    if(isProxyEl) isProxyEl.checked = false;
    if(proxyInfoEl) proxyInfoEl.style.display = 'none';
    
    // ✅ 這裡是我幫您加上安全檢查的地方，防止報錯
    if (user && user.mobile) {
        const mobileInput = document.getElementById('mobile');
        if (mobileInput) {
            mobileInput.value = user.mobile;
        }
    }
    
    // 顯示 Modal
    const modal = document.getElementById('registrationModal');
    if(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// 關閉 Modal
function closeModal() {
    const modal = document.getElementById('registrationModal');
    if(modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    selectedCourse = null;
}

// 點擊 Modal 外部關閉
const modal = document.getElementById('registrationModal');
if(modal) {
    modal.addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
}

// 表單提交
const form = document.getElementById('registrationForm');
if (form) {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!selectedCourse) {
            showAlert('請選擇要報名的課程', 'error');
            return;
        }
        
        const user = AuthManager.getCurrentUser();
        if (!user) {
            showAlert('請先登入', 'error');
            return;
        }
        
        let formData;
        
        try {
            // 檢查必要欄位
            const requiredFields = [
                'courseId', 'courseName', 'name', 'ageRange', 
                'mobile', 'emergencyContact', 'emergencyPhone', 
                'religion', 'paymentMethod', 'notes'
            ];
            
            // 如果是轉帳，才檢查帳號
            const paymentMethod = document.getElementById('paymentMethod')?.value;
            if (paymentMethod === '轉帳繳費') {
                requiredFields.push('accountLast5');
            }
            
            for (const fieldId of requiredFields) {
                const element = document.getElementById(fieldId);
                if (!element) {
                    console.error(`❌ 找不到欄位: ${fieldId}`);
                    // 如果 HTML 裡真的沒這欄位，跳過檢查避免卡死，但印出警告
                    continue; 
                }
            }
            
            const genderChecked = document.querySelector('input[name="gender"]:checked');
            if (!genderChecked) {
                showAlert('請選擇性別', 'error');
                return;
            }
            
            // 安全取值函數
            const getVal = (id) => document.getElementById(id)?.value?.trim() || '';
            const isChecked = (id) => document.getElementById(id)?.checked || false;

            formData = {
                user_id: user.id,
                line_user_id: user.line_user_id,
                course_id: getVal('courseId'),
                course_name: getVal('courseName'),
                name: getVal('name'),
                gender: genderChecked.value,
                age_range: getVal('ageRange'),
                mobile: getVal('mobile'),
                emergency_contact: getVal('emergencyContact'),
                emergency_phone: getVal('emergencyPhone'),
                religion: getVal('religion'),
                payment_method: getVal('paymentMethod'),
                account_last5: getVal('accountLast5'),
                payment_status: '未繳費',
                is_proxy_registration: isChecked('isProxyRegistration'),
                line_tag_name: `已報名-${getVal('courseName')}`,
                line_tagged: false,
                notes: getVal('notes'),
                // 不傳時間，讓後端產生
            };
            
        } catch (error) {
            console.error('❌ 表單資料收集錯誤:', error);
            showAlert('表單處理失敗', 'error');
            return;
        }
        
        // 驗證轉帳帳號
        if (formData.payment_method === '轉帳繳費') {
            if (!formData.account_last5 || formData.account_last5.length !== 5) {
                showAlert('請輸入正確的轉帳帳號後5碼', 'error');
                return;
            }
        }
        
        try {
            // ✅ 使用正確路徑 api/registration/submit
            const result = await ApiHelper.post('api/registration/submit', formData);
            console.log('✅ 報名成功:', result);
            
            showAlert(`報名成功！已成功報名「${selectedCourse.name}」課程`, 'success');
            closeModal();
            loadCourses();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
        } catch (error) {
            console.error('報名失敗:', error);
            showAlert('報名失敗：' + (error.message || '請稍後再試'), 'error');
        }
    });
}

// 顯示提示訊息
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) {
        alert(message); // 後備方案
        return;
    }
    
    const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-info';
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    const div = document.createElement('div');
    div.className = `alert ${alertClass}`;
    div.innerHTML = `<i class="fas fa-${icon}"></i> <span>${message}</span>`;
    
    container.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
    }, 3000);
}

// ✅ 確保掛載到 window，讓 HTML 按鈕點了有反應
window.openRegistrationForm = openRegistrationForm;
window.closeModal = closeModal;
window.toggleAccountField = toggleAccountField;
window.toggleProxyRegistrationInfo = toggleProxyRegistrationInfo;