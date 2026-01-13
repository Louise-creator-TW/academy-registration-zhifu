// 報名頁面 JavaScript

let courses = [];
let selectedCourse = null;

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    loadCourses();
});

// 切換帳號欄位和銀行資訊顯示
function toggleAccountField() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const accountFieldGroup = document.getElementById('accountFieldGroup');
    const accountInput = document.getElementById('accountLast5');
    const bankInfoDisplay = document.getElementById('bankInfoDisplay');
    const bankInfoContent = document.getElementById('bankInfoContent');
    
    if (paymentMethod === '轉帳繳費') {
        accountFieldGroup.style.display = 'block';
        accountInput.required = true;
        bankInfoDisplay.style.display = 'block';
        
        // 顯示銀行帳戶資訊
        if (typeof BANK_ACCOUNT_INFO !== 'undefined') {
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
        accountInput.required = false;
        accountInput.value = '';
        bankInfoDisplay.style.display = 'none';
    }
}

// 切換代理報名資訊顯示
function toggleProxyRegistrationInfo() {
    const isProxyCheckbox = document.getElementById('isProxyRegistration');
    const proxyInfo = document.getElementById('proxyRegistrationInfo');
    
    if (isProxyCheckbox.checked) {
        proxyInfo.style.display = 'block';
    } else {
        proxyInfo.style.display = 'none';
    }
}

// 載入課程列表
async function loadCourses() {
    try {
        const response = await fetch('tables/courses?limit=100');
        const result = await response.json();
        courses = result.data;
        displayCourses();
    } catch (error) {
        console.error('載入課程失敗:', error);
        showAlert('無法載入課程資料，請稍後再試', 'error');
    }
}

// 顯示課程列表
function displayCourses() {
    const container = document.getElementById('coursesContainer');
    
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
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${course.location}</span>
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
                    <p class="course-description">${course.description}</p>
                    <div class="course-footer">
                        <span class="enrollment-status ${isFull ? 'full' : 'available'}">
                            ${isFull ? 
                                '<i class="fas fa-times-circle"></i> 已額滿' : 
                                `<i class="fas fa-check-circle"></i> 尚有 ${availableSeats} 個名額`
                            }
                        </span>
                        <button 
                            class="btn btn-primary" 
                            onclick="openRegistrationForm('${course.id}')"
                            ${isFull ? 'disabled' : ''}
                        >
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
    // 檢查是否登入
    if (typeof AuthManager !== 'undefined' && !AuthManager.isLoggedIn()) {
        if (confirm('報名課程需要先登入，是否使用 LINE 登入？')) {
            AuthManager.lineLogin();
        }
        return;
    }
    
    selectedCourse = courses.find(c => c.id === courseId);
    if (!selectedCourse) return;
    
    // 檢查是否已報名過此課程（僅在非代理報名時檢查）
    const user = AuthManager.getCurrentUser();
    if (user) {
        try {
            const checkResponse = await fetch(`tables/registrations?limit=1000`);
            const checkResult = await checkResponse.json();
            
            // 只檢查「非代理報名」的記錄
            const userNonProxyRegistrations = checkResult.data.filter(r => 
                r.line_user_id === user.line_user_id && 
                r.course_id === courseId &&
                r.is_proxy_registration === false  // 只檢查非代理報名
            );
            
            if (userNonProxyRegistrations.length > 0) {
                showAlert('您已經報名過此課程了！如需幫他人報名，請勾選「替別人報名」選項。', 'error');
                return;
            }
        } catch (error) {
            console.error('檢查重複報名失敗:', error);
        }
    }
    
    // 填入課程資訊
    document.getElementById('courseId').value = selectedCourse.id;
    document.getElementById('courseName').value = selectedCourse.name;
    document.getElementById('displayCourseName').value = selectedCourse.name;
    
    // 重置表單
    document.getElementById('registrationForm').reset();
    document.getElementById('courseId').value = selectedCourse.id;
    document.getElementById('courseName').value = selectedCourse.name;
    document.getElementById('displayCourseName').value = selectedCourse.name;
    
    // 重置代理報名選項和提示
    document.getElementById('isProxyRegistration').checked = false;
    document.getElementById('proxyRegistrationInfo').style.display = 'none';
    
    // 如果用戶已登入，自動填入手機號碼
    if (user && user.mobile) {
        document.getElementById('mobile').value = user.mobile;
    }
    
    // 顯示 Modal
    document.getElementById('registrationModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉 Modal
function closeModal() {
    document.getElementById('registrationModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    selectedCourse = null;
}

// 點擊 Modal 外部關閉
document.getElementById('registrationModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// 表單提交
document.getElementById('registrationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!selectedCourse) {
        showAlert('請選擇要報名的課程', 'error');
        return;
    }
    
    // 取得當前用戶
    const user = AuthManager.getCurrentUser();
    if (!user) {
        showAlert('請先登入', 'error');
        return;
    }
    
    // 收集表單資料
    const formData = {
        user_id: user.id,
        line_user_id: user.line_user_id,
        course_id: document.getElementById('courseId').value,
        course_name: document.getElementById('courseName').value,
        name: document.getElementById('name').value.trim(),
        gender: document.querySelector('input[name="gender"]:checked').value,
        age_range: document.getElementById('ageRange').value,
        mobile: document.getElementById('mobile').value.trim(),
        emergency_contact: document.getElementById('emergencyContact').value.trim(),
        emergency_phone: document.getElementById('emergencyPhone').value.trim(),
        religion: document.getElementById('religion').value,
        payment_method: document.getElementById('paymentMethod').value,
        account_last5: document.getElementById('accountLast5').value.trim(),
        payment_status: '未繳費',
        is_proxy_registration: document.getElementById('isProxyRegistration').checked,  // 新增：是否為代理報名
        line_tag_name: `已報名-${document.getElementById('courseName').value}`,
        line_tagged: false,
        notes: document.getElementById('notes').value.trim(),
        registration_date: new Date().toISOString()
    };
    
    // 驗證轉帳帳號
    if (formData.payment_method === '轉帳繳費') {
        if (!formData.account_last5 || formData.account_last5.length !== 5 || !/^[0-9]{5}$/.test(formData.account_last5)) {
            showAlert('請輸入正確的轉帳帳號後5碼（5位數字）', 'error');
            return;
        }
    }
    
    try {
        // 提交報名資料
        const response = await fetch('tables/registrations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            throw new Error('報名提交失敗');
        }
        
        // 更新課程報名人數
        const updatedCourse = {
            ...selectedCourse,
            current_enrolled: selectedCourse.current_enrolled + 1,
            is_full: (selectedCourse.current_enrolled + 1) >= selectedCourse.capacity
        };
        
        await fetch(`tables/courses/${selectedCourse.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedCourse)
        });
        
        // 顯示成功訊息
        showAlert(`報名成功！已成功報名「${selectedCourse.name}」課程`, 'success');
        
        // 關閉 Modal
        closeModal();
        
        // 重新載入課程列表
        await loadCourses();
        
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('報名失敗:', error);
        showAlert('報名失敗，請稍後再試', 'error');
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
