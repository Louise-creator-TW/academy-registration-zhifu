// 課程管理頁面 JavaScript

let courses = [];
let editingCourse = null;
let deletingCourse = null;

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    loadCourses();
});

// 載入課程列表
async function loadCourses() {
    try {
        const response = await fetch('tables/courses?limit=100&sort=-created_at');
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
    const tbody = document.getElementById('coursesTableBody');
    
    if (courses.length === 0) {
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
        const isFull = course.is_full || course.current_enrolled >= course.capacity;
        return `
            <tr>
                <td><strong>${course.name}</strong></td>
                <td>${course.teacher}</td>
                <td>${course.time}</td>
                <td>NT$ ${course.cost.toLocaleString()}</td>
                <td>${course.current_enrolled} / ${course.capacity}</td>
                <td>
                    <span class="badge ${isFull ? 'badge-danger' : 'badge-success'}">
                        ${isFull ? '已額滿' : '可報名'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick='editCourse(${JSON.stringify(course)})' title="編輯">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-danger" onclick='openDeleteModal(${JSON.stringify(course)})' title="刪除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 開啟新增課程 Modal
function openAddModal() {
    editingCourse = null;
    document.getElementById('modalTitle').textContent = '新增課程';
    document.getElementById('courseForm').reset();
    document.getElementById('courseId').value = '';
    document.getElementById('currentEnrolled').value = '0';
    document.getElementById('courseModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 開啟編輯課程 Modal
function editCourse(course) {
    editingCourse = course;
    document.getElementById('modalTitle').textContent = '編輯課程';
    
    // 填入課程資料
    document.getElementById('courseId').value = course.id;
    document.getElementById('courseName').value = course.name;
    document.getElementById('teacher').value = course.teacher;
    document.getElementById('time').value = course.time;
    document.getElementById('location').value = course.location;
    document.getElementById('cost').value = course.cost;
    document.getElementById('capacity').value = course.capacity;
    document.getElementById('description').value = course.description;
    document.getElementById('isFull').checked = course.is_full;
    document.getElementById('currentEnrolled').value = course.current_enrolled || 0;
    
    document.getElementById('courseModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉 Modal
function closeModal() {
    document.getElementById('courseModal').classList.remove('active');
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
        const response = await fetch(`tables/courses/${deletingCourse.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('刪除失敗');
        }
        
        showAlert(`已成功刪除課程「${deletingCourse.name}」`, 'success');
        closeDeleteModal();
        await loadCourses();
        
    } catch (error) {
        console.error('刪除課程失敗:', error);
        showAlert('刪除課程失敗，請稍後再試', 'error');
    }
}

// 表單提交
document.getElementById('courseForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const courseId = document.getElementById('courseId').value;
    const currentEnrolled = parseInt(document.getElementById('currentEnrolled').value) || 0;
    
    // 收集表單資料
    const courseData = {
        name: document.getElementById('courseName').value.trim(),
        teacher: document.getElementById('teacher').value.trim(),
        time: document.getElementById('time').value.trim(),
        location: document.getElementById('location').value.trim(),
        cost: parseFloat(document.getElementById('cost').value),
        capacity: parseInt(document.getElementById('capacity').value),
        description: document.getElementById('description').value.trim(),
        is_full: document.getElementById('isFull').checked,
        current_enrolled: currentEnrolled
    };
    
    try {
        let response;
        
        if (courseId) {
            // 編輯現有課程
            courseData.id = courseId;
            response = await fetch(`tables/courses/${courseId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(courseData)
            });
        } else {
            // 新增課程
            // 生成新的課程 ID
            courseData.id = 'course-' + Date.now();
            response = await fetch('tables/courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(courseData)
            });
        }
        
        if (!response.ok) {
            throw new Error('儲存失敗');
        }
        
        showAlert(
            courseId ? '課程資料已更新' : '課程已成功新增',
            'success'
        );
        
        closeModal();
        await loadCourses();
        
    } catch (error) {
        console.error('儲存課程失敗:', error);
        showAlert('儲存課程失敗，請稍後再試', 'error');
    }
});

// 點擊 Modal 外部關閉
document.getElementById('courseModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

document.getElementById('deleteModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDeleteModal();
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
