// 報名記錄頁面 JavaScript

let allRecords = [];
let filteredRecords = [];
let courses = [];
let deletingRecord = null;


// 確保在頁面載入時執行
document.addEventListener('DOMContentLoaded', () => {
    // 檢查管理員權限 (如果有的話)
    if (typeof AuthManager !== 'undefined' && !AuthManager.isAdmin()) {
        // alert('權限不足'); 
        // window.location.href = 'index.html';
        // return;
    }
    loadData();
});

async function loadData() {
    try {
        const loadingEl = document.querySelector('.loading');
        if (loadingEl) loadingEl.style.display = 'block';

        // ✅ 修正：改用 ApiHelper 呼叫正確的 API 路徑
        // 舊的 'tables/...' 路徑已棄用
        const [coursesResult, recordsResult] = await Promise.all([
            ApiHelper.get('api/courses', { limit: 100 }),
            ApiHelper.get('api/registrations', { limit: 1000, sort: '-created_at' })
        ]);

        // 處理數據結構 (有些 API 回傳直接是陣列，有些是 { data: [] })
        const courses = Array.isArray(coursesResult) ? coursesResult : (coursesResult.data || []);
        const records = Array.isArray(recordsResult) ? recordsResult : (recordsResult.data || []);

        console.log('取得資料:', { courses, records });
        
        // 渲染表格 (假設您原本就有 renderTables 這個函式)
        renderTables(courses, records);

    } catch (error) {
        console.error('載入資料失敗:', error);
        const container = document.getElementById('recordsContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">載入失敗: ${error.message}</div>`;
        }
    } finally {
        const loadingEl = document.querySelector('.loading');
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

// 填充課程篩選下拉選單
function populateCourseFilter() {
    const filter = document.getElementById('courseFilter');
    const currentValue = filter.value;
    
    filter.innerHTML = '<option value="">所有課程</option>';
    
    courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course.id;
        option.textContent = course.name;
        filter.appendChild(option);
    });
    
    if (currentValue) {
        filter.value = currentValue;
    }
}

// 篩選記錄
function filterRecords() {
    const selectedCourseId = document.getElementById('courseFilter').value;
    const selectedSemester = document.getElementById('semesterFilter') ? document.getElementById('semesterFilter').value : '';
    
    filteredRecords = allRecords.filter(record => {
        const matchCourse = !selectedCourseId || record.course_id === selectedCourseId;
        const matchSemester = !selectedSemester || record.semester === selectedSemester;
        return matchCourse && matchSemester;
    });
    
    displayRecords();
    updateTotalCount();
}

// 更新總數
function updateTotalCount() {
    document.getElementById('totalCount').textContent = filteredRecords.length;
}

// 顯示報名記錄
function displayRecords() {
    const tbody = document.getElementById('recordsTableBody');
    
    if (filteredRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: #7f8c8d;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    目前尚無報名記錄
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredRecords.map(record => {
        const date = new Date(record.registration_date);
        const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        
        // 代理報名標記
        const proxyBadge = record.is_proxy_registration ? 
            '<span style="display: inline-block; margin-left: 0.5rem; padding: 0.2rem 0.5rem; background: #3498db; color: white; border-radius: 4px; font-size: 0.75rem; font-weight: 500;" title="此為代理報名"><i class="fas fa-hands-helping"></i> 代理</span>' : 
            '';
        
        return `
            <tr>
                <td>${formattedDate}</td>
                <td><strong>${record.course_name}</strong></td>
                <td>${record.name}${proxyBadge}</td>
                <td>${record.gender}</td>
                <td>${record.age_range}</td>
                <td>${record.mobile || '-'}</td>
                <td>${record.religion}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick='showDetail(${JSON.stringify(record)})' title="查看詳細">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-danger" onclick='openDeleteModal(${JSON.stringify(record)})' title="刪除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 顯示詳細資料
function showDetail(record) {
    const date = new Date(record.registration_date);
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    
    // 生成 LINE OA 聊天連結
    const lineUserId = record.line_user_id;
    const lineChatLink = lineUserId ? generateLineOAChatLink(lineUserId) : null;
    const showLineButton = isLineOAConfigured() && lineChatLink;
    
    const content = `
        <div style="display: grid; gap: 1.5rem;">
            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-book"></i> 課程資訊
                </h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">課程名稱：</strong>
                        <span>${record.course_name}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">報名日期：</strong>
                        <span>${formattedDate}</span>
                    </div>
                    ${record.is_proxy_registration ? `
                    <div style="display: flex; padding: 0.5rem; background: #e3f2fd; border-radius: 4px; border-left: 4px solid #3498db;">
                        <strong style="min-width: 120px; color: #1976d2;">報名類型：</strong>
                        <span style="color: #1976d2; font-weight: 500;">
                            <i class="fas fa-hands-helping"></i> 代理報名
                            <span style="display: block; font-size: 0.85rem; font-weight: normal; margin-top: 0.25rem; color: #555;">
                                此學員由他人代為報名
                            </span>
                        </span>
                    </div>
                    ` : ''}
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-user"></i> 個人資料
                </h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">姓名：</strong>
                        <span>${record.name}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">性別：</strong>
                        <span>${record.gender}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">年齡區段：</strong>
                        <span>${record.age_range}</span>
                    </div>
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-phone"></i> 聯絡資訊
                </h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">手機號碼：</strong>
                        <span>${record.mobile}</span>
                    </div>
                    ${showLineButton ? `
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">LINE 聊天：</strong>
                        <span>
                            <a href="${lineChatLink}" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               class="btn btn-success btn-sm"
                               style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; text-decoration: none; font-size: 0.9rem;">
                                <i class="fab fa-line"></i>
                                開啟 LINE 一對一聊天
                            </a>
                            <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #7f8c8d;">
                                <i class="fas fa-info-circle"></i> 將跳轉至 LINE OA Manager 後台聊天視窗
                            </p>
                        </span>
                    </div>
                    ` : (lineUserId ? `
                    <div style="display: flex; padding: 0.5rem; background: #fff3cd; border-radius: 4px; border-left: 4px solid #ffc107;">
                        <span style="color: #856404; font-size: 0.9rem;">
                            <i class="fas fa-exclamation-triangle"></i> 
                            請在 <code>js/line-oa-config.js</code> 中設定 LINE OA Manager ID 以啟用聊天功能
                        </span>
                    </div>
                    ` : '')}
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-exclamation-triangle"></i> 緊急聯絡人
                </h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">聯絡人姓名：</strong>
                        <span>${record.emergency_contact}</span>
                    </div>
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">聯絡人電話：</strong>
                        <span>${record.emergency_phone}</span>
                    </div>
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-info-circle"></i> 其他資訊
                </h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">宗教信仰：</strong>
                        <span>${record.religion}</span>
                    </div>
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #2c5aa0;">
                    <i class="fas fa-credit-card"></i> 繳費資訊
                </h4>
                <div style="display: grid; gap: 0.75rem;">
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">繳費方式：</strong>
                        <span class="badge ${record.payment_method === '轉帳繳費' ? 'badge-success' : 'badge-warning'}">
                            ${record.payment_method}
                        </span>
                    </div>
                    ${record.payment_method === '轉帳繳費' && record.account_last5 ? `
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">帳號後5碼：</strong>
                        <span>${record.account_last5}</span>
                    </div>
                    ` : ''}
                    ${record.notes ? `
                    <div style="display: flex; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                        <strong style="min-width: 120px; color: #2c5aa0;">備註：</strong>
                        <span style="white-space: pre-wrap;">${record.notes}</span>
                    </div>
                    ` : ''}
                </div>
            </section>
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

// 開啟刪除確認 Modal
function openDeleteModal(record) {
    deletingRecord = record;
    document.getElementById('deleteStudentName').textContent = record.name;
    document.getElementById('deleteCourseName').textContent = record.course_name;
    document.getElementById('deleteModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// 關閉刪除確認 Modal
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
    document.body.style.overflow = 'auto';
    deletingRecord = null;
}

// 確認刪除
async function confirmDelete() {
    if (!deletingRecord) return;
    
    try {
        // 刪除報名記錄
        const response = await fetch(`tables/registrations/${deletingRecord.id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('刪除失敗');
        }
        
        // 更新課程報名人數
        const course = courses.find(c => c.id === deletingRecord.course_id);
        if (course) {
            const updatedCourse = {
                ...course,
                current_enrolled: Math.max(0, course.current_enrolled - 1),
                is_full: false
            };
            
            await fetch(`tables/courses/${course.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedCourse)
            });
        }
        
        showAlert('已成功刪除報名記錄', 'success');
        closeDeleteModal();
        await loadData();
        
    } catch (error) {
        console.error('刪除報名記錄失敗:', error);
        showAlert('刪除報名記錄失敗，請稍後再試', 'error');
    }
}

// 匯出資料為 CSV
function exportData() {
    if (filteredRecords.length === 0) {
        showAlert('目前沒有資料可以匯出', 'error');
        return;
    }
    
    // CSV 標題
    const headers = [
        '報名日期', '課程名稱', '姓名', '性別', '年齡區段',
        '手機號碼', '緊急聯絡人', '緊急聯絡電話', '宗教信仰',
        '繳費方式', '帳號後5碼', '報名類型', '備註'
    ];
    
    // CSV 內容
    const rows = filteredRecords.map(record => {
        const date = new Date(record.registration_date);
        const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        
        // 報名類型
        const registrationType = record.is_proxy_registration ? '代理報名' : '一般報名';
        
        return [
            formattedDate,
            record.course_name,
            record.name,
            record.gender,
            record.age_range,
            record.mobile,
            record.emergency_contact,
            record.emergency_phone,
            record.religion,
            record.payment_method,
            record.account_last5 || '',
            registrationType,
            record.notes || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });
    
    // 組合 CSV
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    
    // 下載檔案
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const fileName = `報名記錄_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert('報名記錄已成功匯出', 'success');
}

// 匯出季度學員名單（符合指定格式）
function exportSeasonData() {
    if (filteredRecords.length === 0) {
        showAlert('目前沒有資料可以匯出', 'error');
        return;
    }
    
    // 取得當前篩選的季度
    const semesterFilter = document.getElementById('semesterFilter');
    const selectedSemester = semesterFilter ? semesterFilter.value : '';
    const semesterText = selectedSemester || '全部';
    
    // CSV 標題（按照指定格式）
    const headers = [
        '姓名', '性別', '年齡', '電話', '活動', '季度', 
        '繳費方式', '繳費日期', '繳費期間', '備註', '報名時間'
    ];
    
    // CSV 內容
    const rows = filteredRecords.map(record => {
        // 格式化報名時間
        const registrationDate = new Date(record.registration_date);
        const formattedRegistrationTime = `${registrationDate.getFullYear()}/${String(registrationDate.getMonth() + 1).padStart(2, '0')}/${String(registrationDate.getDate()).padStart(2, '0')} ${String(registrationDate.getHours()).padStart(2, '0')}:${String(registrationDate.getMinutes()).padStart(2, '0')}:${String(registrationDate.getSeconds()).padStart(2, '0')}`;
        
        // 格式化繳費日期
        let formattedPaymentDate = '';
        if (record.payment_date) {
            const paymentDate = new Date(record.payment_date);
            formattedPaymentDate = `${paymentDate.getFullYear()}/${String(paymentDate.getMonth() + 1).padStart(2, '0')}/${String(paymentDate.getDate()).padStart(2, '0')}`;
        }
        
        // 轉換繳費方式文字
        let paymentMethodText = '';
        if (record.payment_method === '轉帳繳費') {
            paymentMethodText = '匯款';
        } else if (record.payment_method === '現場繳費') {
            paymentMethodText = '現金';
        } else {
            paymentMethodText = record.payment_method || '';
        }
        
        return [
            record.name || '',                              // 姓名
            record.gender || '',                            // 性別
            record.age_range || '',                         // 年齡
            record.mobile || '',                            // 電話
            record.course_name || '',                       // 活動（課程名稱）
            record.semester || '115春季',                   // 季度
            paymentMethodText,                              // 繳費方式
            formattedPaymentDate,                           // 繳費日期
            record.payment_period || '整期',                // 繳費期間
            record.payment_status_detail || record.notes || '', // 備註
            formattedRegistrationTime                       // 報名時間
        ].map(field => {
            const escaped = String(field).replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',');
    });
    
    // 組合 CSV（加入 BOM 以支援 Excel 正確顯示中文）
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    
    // 下載檔案
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // 檔案名稱包含季度與日期
    const today = new Date().toISOString().split('T')[0];
    const fileName = `學員名單_${semesterText}_${today}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showAlert(`已成功匯出 ${filteredRecords.length} 筆學員資料`, 'success');
}

// 點擊 Modal 外部關閉
document.getElementById('detailModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeDetailModal();
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
