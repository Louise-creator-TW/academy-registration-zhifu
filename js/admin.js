// 課程管理頁面 JavaScript
// 依賴: js/api-config.js (window.ApiHelper)

let courses = [];
let editingCourse = null;
let deletingCourse = null;

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    // 檢查 ApiHelper 是否存在
    if (!window.ApiHelper) {
        console.error('❌ 找不到 ApiHelper，請確認已引入 js/api-config.js');
        showAlert('系統設定錯誤：缺少 API 設定檔', 'error');
        return;
    }
    loadCourses();
});

// 載入課程列表
async function loadCourses() {
    try {
        console.log('📥 載入課程列表...');
        
        // 使用 ApiHelper 進行 API 請求
        const result = await ApiHelper.get('api/courses');
        
        console.log('✅ 課程載入成功:', result);
        
        // 修正：我們的 Workers 直接回傳陣列，但為了保險起見，做個相容性判斷
        if (Array.isArray(result)) {
            courses = result;
        } else if (result.data && Array.isArray(result.data)) {
            courses = result.data;
        } else {
            courses = [];
        }
        
        displayCourses();
        
    } catch (error) {
        console.error('❌ 載入課程失敗:', error);
        showAlert('無法載入課程資料，請檢查網路連線', 'error');
    }
}

// 顯示課程列表
function displayCourses() {
    const tbody = document.getElementById('coursesTableBody');
    if (!tbody) return;
    
    if (!courses || courses.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 3rem; color: #7f8c8d;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    目前尚無課程資料
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = courses.map(course => {
        // 計算是否額滿
        const current = course.current_enrolled || 0;
        const capacity = course.capacity || 0;
        const isFull = course.is_full || current >= capacity;
        
        // 防止 XSS 攻擊的簡單處理
        const safeName = escapeHtml(course.name);
        
        // 將物件轉為字串以便放入 onclick，並處理單引號
        const courseJson = JSON.stringify(course).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
        
        return `
            <tr>
                <td><strong>${safeName}</strong></td>
                <td>${escapeHtml(course.teacher)}</td>
                <td>${escapeHtml(course.time)}</td>
                <td>NT$ ${course.cost.toLocaleString()}</td>
                <td>${current} / ${capacity}</td>
                <td>
                    <span class="badge ${isFull ? 'badge-danger' : 'badge-success'}">
                        ${isFull ? '已額滿' : '可報名'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick='editCourse(${courseJson})' title="編輯">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick='openDeleteModal(${courseJson})' title="刪除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// HTML 轉義函數
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 開啟新增課程 Modal
function openAddModal() {
    editingCourse = null;
    const modalTitle = document.getElementById('modalTitle');
    const form = document.getElementById('courseForm');
    const modal = document.getElementById('courseModal');
    
    if (modalTitle) modalTitle.textContent = '新增課程';
    if (form) form.reset();
    
    document.getElementById('courseId').value = '';
    // 預設值
    document.getElementById('currentEnrolled').value = '0';
    document.getElementById('isFull').checked = false;
    
    if (modal) modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 開啟編輯課程 Modal
// 注意：這裡接收的 course 是已經被 JSON.parse 過的物件 (瀏覽器會自動處理 onclick 中的物件)
function editCourse(course) {
    editingCourse = course;
    document.getElementById('modalTitle').textContent = '編輯課程';
    
    // 填入資料
    document.getElementById('courseId').value = course.id;
    document.getElementById('courseName').value = course.name || '';
    document.getElementById('teacher').value = course.teacher || '';
    document.getElementById('time').value = course.time || '';
    document.getElementById('location').value = course.location || '';
    document.getElementById('cost').value = course.cost || 0;
    document.getElementById('capacity').value = course.capacity || 0;
    document.getElementById('description').value = course.description || '';
    document.getElementById('isFull').checked = course.is_full || false;
    document.getElementById('currentEnrolled').value = course.current_enrolled || 0;
    
    document.getElementById('courseModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉 Modal
function closeModal() {
    const modal = document.getElementById('courseModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    editingCourse = null;
}

// 開啟刪除確認 Modal
function openDeleteModal(course) {
    deletingCourse = course;
    document.getElementById('deleteCourseNameDisplay').textContent = course.name;
    document.getElementById('deleteModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉刪除確認 Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    deletingCourse = null;
}

// 確認刪除
async function confirmDelete() {
    if (!deletingCourse) return;
    
    try {
        console.log('🗑️ 刪除課程:', deletingCourse.id);
        
        // ⚠️ 關鍵修正：使用 Query Param (?id=...) 而不是 Path Param (/id)
        // 因為我們的 Workers 邏輯是 url.searchParams.get('id')
        await ApiHelper.delete(`api/courses?id=${deletingCourse.id}`);
        
        console.log('✅ 刪除成功');
        showAlert(`已成功刪除課程「${deletingCourse.name}」`, 'success');
        closeDeleteModal();
        await loadCourses();
        
    } catch (error) {
        console.error('❌ 刪除課程失敗:', error);
        showAlert('刪除課程失敗：' + error.message, 'error');
    }
}

// 表單提交處理
const courseForm = document.getElementById('courseForm');
if (courseForm) {
    courseForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const courseId = document.getElementById('courseId').value;
        const currentEnrolled = parseInt(document.getElementById('currentEnrolled').value) || 0;
        
        // 收集表單資料
        const courseData = {
            name: document.getElementById('courseName').value.trim(),
            teacher: document.getElementById('teacher').value.trim(),
            time: document.getElementById('time').value.trim(),
            location: document.getElementById('location').value.trim(),
            cost: parseInt(document.getElementById('cost').value), // 確保是數字
            capacity: parseInt(document.getElementById('capacity').value), // 確保是數字
            description: document.getElementById('description').value.trim(),
            is_full: document.getElementById('isFull').checked,
            current_enrolled: currentEnrolled
        };
        
        // 基本驗證
        if (!courseData.name || !courseData.teacher) {
            showAlert('請至少填寫課程名稱與老師', 'error');
            return;
        }
        
        try {
            console.log('💾 準備儲存:', courseData);
            
            if (courseId) {
                // 編輯模式
                console.log('📝 更新課程:', courseId);
                await ApiHelper.put(`api/courses?id=${courseId}`, courseData);
                showAlert('課程資料已更新', 'success');
            } else {
            // 新增課程（使用正確路徑：api/courses）
            // ⚠️ 不要手動設定 ID，讓資料庫自動產生
            console.log('➕ 新增課程');
            console.log('   課程資料:', courseData);
            
            const result = await ApiHelper.post('api/courses', courseData);
            console.log('✅ 新增成功:', result);
            showAlert('課程已成功新增', 'success');
            }
            
            closeModal();
            // 稍等一下再重整，確保資料庫已寫入
            setTimeout(loadCourses, 500);
            
        } catch (error) {
            console.error('❌ 儲存失敗:', error);
            showAlert('儲存失敗：' + error.message, 'error');
        }
    });
}

// 點擊 Modal 外部關閉
window.onclick = function(event) {
    const courseModal = document.getElementById('courseModal');
    const deleteModal = document.getElementById('deleteModal');
    if (event.target == courseModal) {
        closeModal();
    }
    if (event.target == deleteModal) {
        closeDeleteModal();
    }
}

// 顯示提示訊息 (Toast)
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) return; // 如果沒有容器就不顯示
    
    const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-info';
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
    alert.style.cssText = `
        padding: 1rem;
        margin-bottom: 1rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: white;
        background-color: ${type === 'success' ? '#2ecc71' : type === 'error' ? '#e74c3c' : '#3498db'};
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    `;
    
    alert.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(alert);
    
    // 動畫效果
    requestAnimationFrame(() => {
        alert.style.opacity = '1';
        alert.style.transform = 'translateY(0)';
    });
    
    // 3秒後移除
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-20px)';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}