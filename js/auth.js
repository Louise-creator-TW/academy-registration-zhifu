/**
 * js/auth.js
 * LINE 登入與認證管理 (修正版)
 * 版本：v2026011705
 */

// ==========================================
// 1. LINE 設定區域
// ==========================================
const LINE_CONFIG = {
    // ⚠️ 請確認這是您的 Channel ID
    CHANNEL_ID: '2008825862',  
    
    // ⚠️ Workers 後端回調網址
    getCallbackUrl() {
        return 'https://academy-registration-api.zhifu-acadamy-bot-2026.workers.dev/api/line-callback';
    },
    
    // LINE 授權端點
    AUTHORIZE_URL: 'https://access.line.me/oauth2/v2.1/authorize',
    
    // 產生 LINE Login URL
    getLoginUrl(state) {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.CHANNEL_ID,
            redirect_uri: this.getCallbackUrl(),
            state: state,
            scope: 'profile openid',
            bot_prompt: 'aggressive'
        });
        return `${this.AUTHORIZE_URL}?${params.toString()}`;
    }
};

// ==========================================
// 2. 認證管理邏輯
// ==========================================
const AuthManager = {
    STORAGE_KEY: 'cf_academy_auth',
    USER_KEY: 'cf_academy_user',
    
    // 初始化
    init() {
        this.checkAuthStatus(); // 檢查網址是否有帶 token (登入回調)
        this.updateUI();        // 更新介面顯示
    },
    
    // 判斷是否已登入
    isLoggedIn() {
        const token = localStorage.getItem(this.STORAGE_KEY);
        const user = this.getCurrentUser();
        return !!(token && user);
    },
    
    // 取得當前使用者資料
    getCurrentUser() {
        const userStr = localStorage.getItem(this.USER_KEY);
        if (!userStr) return null;
        try {
            return JSON.parse(userStr);
        } catch (error) {
            console.error('解析使用者資料失敗:', error);
            return null;
        }
    },
    
    // 儲存使用者資料
    setUser(userData) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
        this.updateUI();
    },
    
    // 儲存 Token
    setToken(token) {
        localStorage.setItem(this.STORAGE_KEY, token);
    },
    
    // 登出
    logout() {
        if(confirm('確定要登出嗎？')) {
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.USER_KEY);
            this.updateUI();
            
            // 登出後導回首頁
            window.location.href = 'index.html';
        }
    },
    
    // 檢查網址參數 (處理 LINE Login 回調)
    checkAuthStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userDataStr = urlParams.get('user');
        
        if (token && userDataStr) {
            try {
                const userData = JSON.parse(decodeURIComponent(userDataStr));
                this.setToken(token);
                this.setUser(userData); // 這裡會自動觸發 updateUI
                
                // 清除網址列的參數，讓網址變乾淨
                window.history.replaceState({}, document.title, window.location.pathname);
                console.log('✅ 登入成功:', userData.display_name);
            } catch (error) {
                console.error('登入回調處理失敗:', error);
            }
        }
    },
    
    // ✅ 核心 UI 更新邏輯 (同時支援首頁與內頁)
    updateUI() {
        const isLoggedIn = this.isLoggedIn();
        const user = this.getCurrentUser();
        
        // ------------------------------------------------
        // 1. 處理首頁導覽列 (Navbar) 的按鈕切換
        // ------------------------------------------------
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const myRegLink = document.getElementById('myRegistrationsLink');
        
        if (isLoggedIn) {
            // 登入狀態：隱藏登入鈕，顯示登出鈕和我的報名
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            if (myRegLink) myRegLink.style.display = 'inline-block';
        } else {
            // 未登入狀態：顯示登入鈕，隱藏登出鈕和我的報名
            if (loginBtn) loginBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (myRegLink) myRegLink.style.display = 'none';
        }

        // ------------------------------------------------
        // 2. 處理內頁的 authButtons 容器 (如果有的話)
        // (例如 registration.html 右上角顯示頭像)
        // ------------------------------------------------
        const authButtons = document.getElementById('authButtons');
        if (authButtons) {
            if (isLoggedIn && user) {
                // 優先使用 camelCase (後端常見格式)，如果沒有則嘗試 snake_case
                const picUrl = user.pictureUrl || user.picture_url || 'https://via.placeholder.com/40';
                const name = user.displayName || user.display_name || '學員';

                authButtons.innerHTML = `
                    <div class="user-menu" style="display: flex; align-items: center; gap: 10px;">
                        <img src="${picUrl}" alt="${name}" class="user-avatar" style="width:32px;height:32px;border-radius:50%;">
                        <span class="user-name">${name}</span>
                        <button onclick="AuthManager.logout()" class="btn btn-sm btn-outline-secondary" style="margin-left:5px; padding: 2px 8px; font-size: 0.8rem;">登出</button>
                    </div>
                `;
            } else {
                // 如果在內頁但沒登入，顯示登入按鈕
                authButtons.innerHTML = `
                    <button onclick="AuthManager.lineLogin()" class="btn btn-primary btn-sm">
                        <i class="fab fa-line"></i> LINE 登入
                    </button>
                `;
            }
        }
    },
    
    // LINE 登入觸發點
    lineLogin() {
        const STATE = this.generateState();
        localStorage.setItem('line_login_state', STATE);
        
        const lineLoginUrl = LINE_CONFIG.getLoginUrl(STATE);
        console.log('準備跳轉至 LINE Login:', lineLoginUrl);
        window.location.href = lineLoginUrl;
    },
    
    // 產生隨機 State 防止 CSRF
    generateState() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    },
    
    // 強制登入檢查 (用於保護特定頁面)
    requireLogin(redirectUrl = null) {
        if (!this.isLoggedIn()) {
            const returnUrl = redirectUrl || window.location.href;
            localStorage.setItem('return_url', returnUrl);
            
            // 這裡不使用 confirm，直接跳轉，體驗較好
            // 或者您可以保留 confirm
            if (confirm('此功能需要登入，是否前往 LINE 登入？')) {
                this.lineLogin();
            } else {
                // 如果使用者按取消，導回首頁
                window.location.href = 'index.html';
            }
            return false;
        }
        return true;
    },
    
    // 用戶是否有管理員權限 (預留擴充)
    isAdmin() {
        const user = this.getCurrentUser();
        // 這裡可以改成檢查 user.role === 'admin' 或是檢查特定的 Line User ID
        return user && (user.role === 'admin' || user.isAdmin === true);
    }
};

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', function() {
    AuthManager.init();
});

// ✅ 修正匯出名稱 (之前您原本的代碼這裡拼錯了)
window.AuthManager = AuthManager;