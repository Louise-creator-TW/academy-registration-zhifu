/**
 * js/records.js
 * 後台報名紀錄管理 - 最終完整版 (修復 renderTables 錯誤)
 */

let allRecords = [];
let filteredRecords = [];
let courses = [];
let deletingRecord = null;

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    // 1. 安全檢查：確認是否為管理員
    if (typeof AuthManager !== 'undefined') {
        if (!AuthManager.isLoggedIn()) {
            alert('請先登入管理員帳號');
            window.location.href = 'index.html';
            return;
        }
    }

    loadData();
});

// 載入所有資料
async function loadData() {
    try {
        const loadingEl = document.querySelector('.loading');
        
        console.log('📥 開始載入資料...');

        // 同時載入課程和報名記錄
        const [coursesResult, recordsResult] = await Promise.all([
            ApiHelper.get('api/courses', { limit: 100 }),
            ApiHelper.get('api/registrations', { limit: 1000, sort: '-created_at' })
        ]);
        
        // 資料相容性處理
        courses = Array.isArray(coursesResult) ? coursesResult : (coursesResult.data || []);
        const rawRecords = Array.isArray(recordsResult) ? recordsResult : (recordsResult.data || []);
        
        allRecords = rawRecords;
        filteredRecords = allRecords;
        
        console.log(`✅ 載入完成：${allRecords.length} 筆報名資料`);

        // 填充篩選器並顯示資料
        populateCourseFilter();
        
        // 執行一次預設篩選 (這會呼叫 displayRecords)
        filterRecords(); 
        
        // 移除 Loading
        if (loadingEl && loadingEl.parentElement) {
            loadingEl.parentElement.innerHTML = ''; 
        }

    } catch (error) {
        console.error('載入資料失敗:', error);
        showAlert('無法載入資料，請稍後再試', 'error');
    }
}

// 填充課程篩選下拉選單
function populateCourseFilter() {
    const filter = document.getElementById('courseFilter');
    if (!filter) return;

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

// 篩選記錄 (核心邏輯)
function filterRecords() {
    const courseFilter = document.getElementById('courseFilter');
    const semesterFilter = document.getElementById('semesterFilter');
    
    const selectedCourseId = courseFilter ? courseFilter.value : '';
    const selectedSemester = semesterFilter ? semesterFilter.value : '';
    
    filteredRecords = allRecords.filter(record => {
        const matchCourse = !selectedCourseId || record.course_id === selectedCourseId;
        // 若無季度欄位，預設匹配
        const matchSemester = !selectedSemester || (record.semester === selectedSemester) || !record.semester;
        
        return matchCourse && matchSemester;
    });
    
    // 更新總數並顯示
    updateTotalCount();
    displayRecords(); 
}

// 更新總數
function updateTotalCount() {
    const el = document.getElementById('totalCount');
    if (el) el.textContent = filteredRecords.length;
}

// 顯示報名記錄表格 (取代 renderTables)
function displayRecords() {
    const tbody = document.getElementById('recordsTableBody');
    if (!tbody) return;
    
    if (filteredRecords.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 3rem; color: #7f8c8d;">
                    <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    目前尚無符合的報名記錄
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredRecords.map(record => {
        // 日期優先順序
        const dateStr = record.registration_date || record.created_at;
        const date = dateStr ? new Date(dateStr) : new Date();
        const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        
        // 代理報名標記
        const proxyBadge = record.is_proxy_registration ? 
            '<span class="badge badge-warning" style="font-size:0.7em; margin-left:5px;">代理</span>' : '';
            
        return `
            <tr>
                <td>${formattedDate}</td>
                <td><strong>${record.course_name || '未知課程'}</strong></td>
                <td>${record.name} ${proxyBadge}</td>
                <td>${record.gender || '-'}</td>
                <td>${record.age_range || '-'}</td>
                <td>${record.mobile || '-'}</td>
                <td>${record.payment_method || '-'}</td>
                <td>
                    <div class="action-buttons" style="display:flex; gap:5px;">
                        <button class="btn btn-sm btn-primary" onclick='showDetail(${safeJson(record)})' title="查看詳細">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick='openDeleteModal(${safeJson(record)})' title="刪除">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// 輔助：避免 JSON 字串中有單引號導致 HTML 壞掉
function safeJson(obj) {
    if (!obj) return '{}';
    return JSON.stringify(obj).replace(/'/g, "&#39;");
}

// 顯示詳細資料 Modal
function showDetail(record) {
    const dateStr = record.registration_date || record.created_at;
    const date = dateStr ? new Date(dateStr) : new Date();
    const formattedDate = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
    
    // LINE OA 整合檢查
    const lineUserId = record.line_user_id;
    let showLineButton = false;
    let lineChatLink = '#';
    
    if (typeof isLineOAConfigured === 'function' && typeof generateLineOAChatLink === 'function') {
        if (lineUserId && isLineOAConfigured()) {
            lineChatLink = generateLineOAChatLink(lineUserId);
            showLineButton = true;
        }
    }
    
    const content = `
        <div style="display: grid; gap: 1.5rem;">
            <section>
                <h4 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 5px;">
                    <i class="fas fa-book"></i> 課程資訊
                </h4>
                <div style="display:grid; grid-template-columns: auto 1fr; gap: 10px;">
                    <div><strong>課程名稱：</strong></div><div>${record.course_name}</div>
                    <div><strong>報名日期：</strong></div><div>${formattedDate}</div>
                    ${record.is_proxy_registration ? `<div><strong>報名類型：</strong></div><div>代理報名</div>` : ''}
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 5px;">
                    <i class="fas fa-user"></i> 個人資料
                </h4>
                <div style="display:grid; grid-template-columns: auto 1fr; gap: 10px;">
                    <div><strong>姓名：</strong></div><div>${record.name}</div>
                    <div><strong>性別：</strong></div><div>${record.gender || '-'}</div>
                    <div><strong>年齡：</strong></div><div>${record.age_range || '-'}</div>
                    <div><strong>宗教：</strong></div><div>${record.religion || '-'}</div>
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 5px;">
                    <i class="fas fa-phone"></i> 聯絡資訊
                </h4>
                <div style="display:grid; grid-template-columns: auto 1fr; gap: 10px;">
                    <div><strong>手機：</strong></div><div>${record.mobile || '-'}</div>
                    <div><strong>緊急聯絡人：</strong></div><div>${record.emergency_contact || '-'}</div>
                    <div><strong>緊急電話：</strong></div><div>${record.emergency_phone || '-'}</div>
                    
                    ${showLineButton ? `
                    <div style="grid-column: 1 / -1; margin-top:10px;">
                        <a href="${lineChatLink}" target="_blank" class="btn btn-success btn-sm" style="text-decoration:none;">
                            <i class="fab fa-line"></i> 開啟 LINE 一對一聊天
                        </a>
                    </div>
                    ` : ''}
                </div>
            </section>

            <section>
                <h4 style="color: #2c5aa0; border-bottom: 2px solid #2c5aa0; padding-bottom: 5px;">
                    <i class="fas fa-credit-card"></i> 繳費資訊
                </h4>
                <div style="display:grid; grid-template-columns: auto 1fr; gap: 10px;">
                    <div><strong>繳費方式：</strong></div><div>${record.payment_method || '-'}</div>
                    <div><strong>狀態：</strong></div><div>${record.payment_status || '未繳費'}</div>
                    ${record.account_last5 ? `<div><strong>帳號末五碼：</strong></div><div>${record.account_last5}</div>` : ''}
                    ${record.notes ? `<div style="grid-column: 1 / -1;"><strong>備註：</strong><br>${record.notes}</div>` : ''}
                </div>
            </section>
        </div>
    `;
    
    const detailContent = document.getElementById('detailContent');
    const detailModal = document.getElementById('detailModal');
    
    if (detailContent && detailModal) {
        detailContent.innerHTML = content;
        detailModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// 關閉詳細資料 Modal
function closeDetailModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// 開啟刪除確認 Modal
function openDeleteModal(record) {
    deletingRecord = record;
    const nameEl = document.getElementById('deleteStudentName');
    const courseEl = document.getElementById('deleteCourseName');
    const modal = document.getElementById('deleteModal');
    
    if (nameEl) nameEl.textContent = record.name;
    if (courseEl) courseEl.textContent = record.course_name;
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

// 關閉刪除確認 Modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    deletingRecord = null;
}

// 確認刪除
async function confirmDelete() {
    if (!deletingRecord) return;
    
    try {
        console.log('🗑️ 開始刪除報名記錄:', deletingRecord.id);
        const result = await ApiHelper.delete(`api/registrations/${deletingRecord.id}`);
        console.log('✅ 刪除成功:', result);
        
        showAlert('已成功刪除報名記錄', 'success');
        closeDeleteModal();
        await loadData(); 
        
    } catch (error) {
        console.error('❌ 刪除失敗:', error);
        showAlert('刪除失敗: ' + (error.message || '請稍後再試'), 'error');
    }
}

// 匯出完整資料為 CSV (包含宗教、帳號後5碼等所有欄位)
function exportData() {
    if (filteredRecords.length === 0) {
        showAlert('目前沒有資料可以匯出', 'error');
        return;
    }
    
    // 1. 定義完整的 CSV 標題 (Headers)
    const headers = [
        '報名日期',
        '課程名稱',
        '學員姓名',
        '性別',
        '年齡區段',
        '手機號碼',
        '宗教信仰',       // ✅ 用戶指定：religion
        '緊急聯絡人',
        '緊急聯絡電話',
        '繳費方式',
        '帳號後5碼',      // ✅ 用戶指定：account_last5
        '繳費狀態',       // ✨ 加碼：讓您知道誰已繳費
        '備註',
        '報名類型',
        'LINE User ID'   // ✨ 加碼：方便工程師查修
    ];
    
    // 2. 轉換資料內容 (Rows)
    const rows = filteredRecords.map(record => {
        // 日期格式化 (相容性處理)
        const dateStr = record.registration_date || record.created_at;
        const date = dateStr ? new Date(dateStr) : new Date();
        const formattedDate = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
        
        // 報名類型文字轉換
        const registrationType = record.is_proxy_registration ? '代理報名' : '一般報名';
        
        // 回傳欄位陣列 (順序必須跟 headers 一樣)
        return [
            formattedDate,
            record.course_name,
            record.name,
            record.gender,
            record.age_range,
            record.mobile,
            record.religion,          // ✅ 對應 headers
            record.emergency_contact,
            record.emergency_phone,
            record.payment_method,
            record.account_last5,     // ✅ 對應 headers
            record.payment_status,
            record.notes,
            registrationType,
            record.line_user_id
        ].map(field => {
            // CSV 格式處理：將內容轉字串，並處理內容中可能出現的雙引號
            return `"${String(field || '').replace(/"/g, '""')}"`;
        }).join(',');
    });
    
    // 3. 組合 CSV 內容 (加上 \uFEFF 是為了讓 Excel 正確識別中文編碼)
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    
    // 4. 下載檔案
    downloadCSV(csv, `完整報名資料_${new Date().toISOString().split('T')[0]}.csv`);
}

// 匯出 CSV (季度名單版)
function exportSeasonData() {
    if (filteredRecords.length === 0) {
        showAlert('目前沒有資料可以匯出', 'error');
        return;
    }
    
    const semesterFilter = document.getElementById('semesterFilter');
    const selectedSemester = semesterFilter ? semesterFilter.value : '全部';
    
    const headers = [
        '姓名', '性別', '年齡', '電話', '活動', '季度', 
        '繳費方式', '繳費日期', '繳費期間', '備註', '報名時間'
    ];
    
    const rows = filteredRecords.map(record => {
        const dateStr = record.registration_date || record.created_at;
        const date = dateStr ? new Date(dateStr) : new Date();
        const formattedTime = date.toLocaleString('zh-TW', { hour12: false });
        
        let paymentMethodText = record.payment_method || '';
        if (paymentMethodText === '轉帳繳費') paymentMethodText = '匯款';
        if (paymentMethodText === '現場繳費') paymentMethodText = '現金';

        return [
            record.name || '',
            record.gender || '',
            record.age_range || '',
            record.mobile || '',
            record.course_name || '',
            record.semester || '115春季', 
            paymentMethodText,
            '', 
            '整期',
            record.notes || '',
            formattedTime
        ].map(field => `"${String(field || '').replace(/"/g, '""')}"`).join(',');
    });
    
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    downloadCSV(csv, `學員名單_${selectedSemester}_${new Date().toISOString().split('T')[0]}.csv`);
}

// 下載 helper
function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAlert('檔案已下載', 'success');
}

// 顯示提示
function showAlert(message, type = 'info') {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    const alertClass = type === 'success' ? 'alert-success' : type === 'error' ? 'alert-error' : 'alert-info';
    const alert = document.createElement('div');
    alert.className = `alert ${alertClass}`;
    alert.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
}

// Modal 關閉綁定
window.onclick = function(event) {
    const detailModal = document.getElementById('detailModal');
    const deleteModal = document.getElementById('deleteModal');
    if (event.target == detailModal) closeDetailModal();
    if (event.target == deleteModal) closeDeleteModal();
}