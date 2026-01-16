/**
 * js/my-registrations.js
 * 強力診斷版 - 用於找出無限 Loading 的原因
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 頁面載入完成，準備執行 loadMyRegistrations');
    loadMyRegistrations();
});

async function loadMyRegistrations() {
    // 1. 智慧尋找容器 (不管是 List 還是 Container 都抓)
    const container = document.getElementById('registrationsList') || 
                      document.getElementById('registrationsContainer');
    
    if (!container) {
        console.error('❌ 嚴重錯誤：找不到 HTML 容器！請檢查 HTML 裡是否有 id="registrationsList" 或 "registrationsContainer"');
        alert('程式錯誤：找不到顯示區域 (Container not found)');
        return;
    }

    // 顯示載入中
    container.innerHTML = '<div class="loading" style="text-align:center; padding:2rem;"><i class="fas fa-spinner fa-spin"></i> 正在連線資料庫...</div>';

    // 2. 檢查 AuthManager
    if (typeof AuthManager === 'undefined') {
        console.error('❌ AuthManager 未定義，請檢查 auth.js 是否正確載入');
        container.innerHTML = '<div class="error-message">系統錯誤：AuthManager 遺失</div>';
        return;
    }

    // 3. 檢查登入狀態
    if (!AuthManager.isLoggedIn()) {
        console.log('ℹ️ 使用者未登入');
        container.innerHTML = `
            <div class="no-data" style="text-align: center; padding: 3rem;">
                <p>請先登入以查看您的報名記錄</p>
                <button class="btn btn-primary" onclick="AuthManager.lineLogin()">LINE 登入</button>
            </div>`;
        return;
    }

    const user = AuthManager.getCurrentUser();
    // ✅ 日誌：印出當前使用者資訊
    console.log('👤 當前登入用戶:', user);
    console.log('🔑 用戶 LINE ID:', user.line_user_id);

    try {
        console.log('📡 開始呼叫 API: api/registrations');
        
        // 4. 呼叫 API
        const result = await ApiHelper.get('api/registrations', { 
            limit: 100, 
            sort: '-created_at' 
        });

        // ✅ 日誌：印出 API 回傳的原始資料
        console.log('📦 API 回傳原始資料:', result);

        // 5. 資料結構解析 (相容性處理)
        let allRecords = [];
        if (Array.isArray(result)) {
            allRecords = result;
        } else if (result.data && Array.isArray(result.data)) {
            allRecords = result.data;
        } else if (result.registrations) {
            allRecords = result.registrations;
        }

        console.log(`📊 解析後共有 ${allRecords.length} 筆總資料`);

        if (allRecords.length > 0) {
            console.log('🔍 第一筆資料範例 (用來檢查欄位名稱):', allRecords[0]);
        }

        // 6. 過濾資料
        const myRecords = allRecords.filter(r => {
            // 寬鬆比對：檢查各種可能的 ID 欄位
            const isMatch = (r.line_user_id === user.line_user_id) || 
                          (r.user_id === user.id) ||
                          (r.user_id === user.userId);
            return isMatch;
        });

        console.log(`🎯 過濾後，屬於您的資料共有: ${myRecords.length} 筆`);
        console.log('📋 準備顯示的資料:', myRecords);

        // 7. 呼叫顯示函式
        displayRegistrations(myRecords, container);

    } catch (error) {
        console.error('❌ 發生錯誤 (Catch):', error);
        container.innerHTML = `
            <div class="error-message" style="color: red; text-align: center; padding: 2rem;">
                <i class="fas fa-exclamation-triangle"></i> 
                無法載入記錄<br>
                <small>${error.message}</small>
            </div>`;
    }
}

// 顯示函式 (接收 records 和 container)
function displayRegistrations(records, container) {
    console.log('🎨 開始渲染畫面...');

    if (records.length === 0) {
        console.log('ℹ️ 資料筆數為 0，顯示空狀態');
        container.innerHTML = `
            <div class="no-data" style="text-align: center; padding: 3rem; color: #666;">
                <i class="fas fa-clipboard-list" style="font-size: 3rem; margin-bottom: 1rem; color: #ccc;"></i>
                <p>您目前還沒有報名任何課程</p>
                <p style="font-size:0.8rem; color:#999;">(Line ID: ${AuthManager.getCurrentUser().line_user_id})</p>
                <a href="registration.html" class="btn btn-primary" style="margin-top: 10px;">前往報名課程</a>
            </div>`;
        return;
    }

    const html = records.map(record => {
        const dateStr = record.created_at ? new Date(record.created_at).toLocaleDateString('zh-TW') : '未知日期';
        const status = record.payment_status || '未繳費';
        const isPaid = status === '已繳費';
        
        return `
            <div class="registration-card" style="border: 1px solid #eee; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <div>
                        <h3 style="margin: 0 0 5px 0; color: #333;">${record.course_name || '未命名課程'}</h3>
                        <span class="registration-date" style="font-size: 0.9rem; color: #888;">報名日期：${dateStr}</span>
                    </div>
                    <span class="status-badge" style="padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; background: ${isPaid ? '#d4edda' : '#fff3cd'}; color: ${isPaid ? '#155724' : '#856404'};">
                        ${status}
                    </span>
                </div>
                <div class="card-body">
                    <div style="margin-bottom: 5px;"><strong>學員：</strong> ${record.name || '未填寫'}</div>
                    <div style="margin-bottom: 5px;"><strong>電話：</strong> ${record.mobile || record.phone || '-'}</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
    console.log('✅ 畫面渲染完成！');
}