/**
 * js/my-registrations.js
 * 我的報名頁面邏輯
 */

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', () => {
    // 呼叫函式 (名稱必須與下方定義的一致)
    loadMyRegistrations();
});

// 定義主函式：載入我的報名
async function loadMyRegistrations() {
    // 1. 檢查登入狀態
    if (typeof AuthManager === 'undefined' || !AuthManager.isLoggedIn()) {
        const container = document.getElementById('registrationsList');
        if (container) {
            container.innerHTML = `
                <div class="no-data" style="text-align: center; padding: 3rem;">
                    <p>請先登入以查看您的報名記錄</p>
                    <button class="btn btn-primary" onclick="AuthManager.lineLogin()">LINE 登入</button>
                </div>`;
        }
        return;
    }

    const user = AuthManager.getCurrentUser();
    const container = document.getElementById('registrationsList');
    
    try {
        if (container) {
            container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> 載入資料中...</div>';
        }

        console.log('正在載入報名紀錄...');
        
        // 2. 呼叫 API (使用正確的路徑與排序)
        // 注意：這裡使用 created_at 排序，這是我們確定資料庫有的欄位
        const result = await ApiHelper.get('api/registrations', { 
            limit: 100, 
            sort: '-created_at' 
        });
        
        // 3. 過濾出屬於當前使用者的資料
        // (API 回傳可能是陣列或 {data: []})
        const allRecords = Array.isArray(result) ? result : (result.data || []);
        
        // 前端再次過濾 (雙重保險，確保只看到自己的)
        const myRecords = allRecords.filter(r => r.line_user_id === user.line_user_id);

        console.log('我的報名:', myRecords);

        // 4. 顯示資料
        displayRegistrations(myRecords);

    } catch (error) {
        console.error('載入失敗:', error);
        if (container) {
            container.innerHTML = `
                <div class="error-message" style="color: red; text-align: center; padding: 2rem;">
                    <i class="fas fa-exclamation-triangle"></i> 
                    無法載入記錄: ${error.message}
                </div>`;
        }
    }
}

// 顯示報名卡片
function displayRegistrations(records) {
    const container = document.getElementById('registrationsList');
    if (!container) return;

    if (records.length === 0) {
        container.innerHTML = `
            <div class="no-data" style="text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem; color: #ccc;"></i>
                <p>您目前還沒有報名任何課程</p>
                <a href="registration.html" class="btn btn-primary" style="margin-top: 10px;">前往報名課程</a>
            </div>`;
        return;
    }

    container.innerHTML = records.map(record => {
        // 處理繳費狀態的樣式
        const statusClass = record.payment_status === '已繳費' ? 'status-paid' : 'status-unpaid';
        const statusText = record.payment_status || '未繳費';
        
        // 處理日期顯示
        const dateStr = record.created_at 
            ? new Date(record.created_at).toLocaleDateString('zh-TW') 
            : '未知日期';

        return `
            <div class="registration-card" style="border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; color: #333;">${record.course_name || '未命名課程'}</h3>
                        <span class="registration-date" style="font-size: 0.9rem; color: #888;">報名日期：${dateStr}</span>
                    </div>
                    <span class="status-badge ${statusClass}" style="padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; background: ${statusText === '已繳費' ? '#d4edda' : '#fff3cd'}; color: ${statusText === '已繳費' ? '#155724' : '#856404'};">
                        ${statusText}
                    </span>
                </div>
                
                <div class="card-body">
                    <div class="info-row" style="margin-bottom: 5px;">
                        <strong style="color: #555;">學員姓名：</strong> ${record.name}
                    </div>
                    <div class="info-row" style="margin-bottom: 5px;">
                        <strong style="color: #555;">繳費方式：</strong> ${record.payment_method || '-'}
                    </div>
                    ${record.payment_method === '轉帳繳費' ? `
                    <div class="info-row" style="margin-bottom: 5px;">
                        <strong style="color: #555;">帳號末5碼：</strong> ${record.account_last5 || '-'}
                    </div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}