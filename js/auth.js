// 全局認證管理模組

const AuthManager = {
    // 儲存鍵名
    STORAGE_KEY: 'cf_academy_auth',
    USER_KEY: 'cf_academy_user',
    
    // 初始化
    init() {
        this.checkAuthStatus();
        this.updateUIForAuthStatus();
    },
    
    // 檢查登入狀態
    isLoggedIn() {
        const token = localStorage.getItem(this.STORAGE_KEY);
        const user = this.getCurrentUser();
        return !!(token && user);
    },
    
    // 取得當前用戶
    getCurrentUser() {
        const userStr = localStorage.getItem(this.USER_KEY);
        if (!userStr) return null;
        
        try {
            return JSON.parse(userStr);
        } catch (error) {
            console.error('Parse user data error:', error);
            return null;
        }
    },
    
    // 儲存用戶資訊
    setUser(userData) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
        this.updateUIForAuthStatus();
    },
    
    // 儲存認證 Token
    setToken(token) {
        localStorage.setItem(this.STORAGE_KEY, token);
    },
    
    // 登出
    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.updateUIForAuthStatus();
        window.location.href = 'index.html';
    },
    
    // 檢查認證狀態
    checkAuthStatus() {
        // 從 URL 取得 token（LINE Login callback）
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const userDataStr = urlParams.get('user');
        
        if (token && userDataStr) {
            try {
                const userData = JSON.parse(decodeURIComponent(userDataStr));
                this.setToken(token);
                this.setUser(userData);
                
                // 清除 URL 參數
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                console.error('Auth callback error:', error);
            }
        }
    },
    
    // 更新 UI 顯示登入狀態
    updateUIForAuthStatus() {
        const isLoggedIn = this.isLoggedIn();
        const user = this.getCurrentUser();
        
        // 更新導航列
        const authButtons = document.getElementById('authButtons');
        const userInfo = document.getElementById('userInfo');
        
        if (authButtons) {
            if (isLoggedIn && user) {
                authButtons.innerHTML = `
                    <div class="user-menu">
                        <img src="${user.picture_url || '/images/default-avatar.png'}" alt="${user.display_name}" class="user-avatar">
                        <span class="user-name">${user.display_name}</span>
                        <button onclick="AuthManager.logout()" class="btn btn-secondary">
                            <i class="fas fa-sign-out-alt"></i> 登出
                        </button>
                    </div>
                `;
            } else {
                authButtons.innerHTML = `
                    <button onclick="AuthManager.lineLogin()" class="btn btn-primary">
                        <i class="fab fa-line"></i> LINE 登入
                    </button>
                `;
            }
        }
        
        // 更新「我的報名」連結顯示
        const myRegistrationsLink = document.getElementById('myRegistrationsLink');
        if (myRegistrationsLink) {
            myRegistrationsLink.style.display = isLoggedIn ? 'block' : 'none';
        }
    },
    
    // LINE 登入
    lineLogin() {
        // ⚠️ 這裡需要替換為實際的 LINE Channel ID 和 Callback URL
        const LINE_CHANNEL_ID = '2008825862'; // 請替換
        const REDIRECT_URI = encodeURIComponent(window.location.origin + '/api/line-callback');
        const STATE = this.generateState();
        
        localStorage.setItem('line_login_state', STATE);
        
        // bot_prompt=aggressive 會引導用戶加入 LINE OA 好友
        const lineLoginUrl = 
            `https://access.line.me/oauth2/v2.1/authorize?` +
            `response_type=code` +
            `&client_id=${LINE_CHANNEL_ID}` +
            `&redirect_uri=${REDIRECT_URI}` +
            `&state=${STATE}` +
            `&scope=profile%20openid` +
            `&bot_prompt=aggressive`;
        
        window.location.href = lineLoginUrl;
    },
    
    // 產生隨機 state
    generateState() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    },
    
    // 要求登入（受保護頁面使用）
    requireLogin(redirectUrl = null) {
        if (!this.isLoggedIn()) {
            const returnUrl = redirectUrl || window.location.href;
            localStorage.setItem('return_url', returnUrl);
            
            if (confirm('此功能需要登入，是否使用 LINE 登入？')) {
                this.lineLogin();
            } else {
                window.location.href = 'index.html';
            }
            return false;
        }
        return true;
    },
    
    // 取得認證 Token（用於 API 請求）
    getAuthToken() {
        return localStorage.getItem(this.STORAGE_KEY);
    },
    
    // 帶 Token 的 fetch 請求
    async authFetch(url, options = {}) {
        const token = this.getAuthToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, {
            ...options,
            headers
        });
        
        // 如果 401 未授權，清除登入狀態
        if (response.status === 401) {
            this.logout();
            throw new Error('未授權，請重新登入');
        }
        
        return response;
    }
};

// 頁面載入時初始化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        AuthManager.init();
    });
}

// 匯出（供其他模組使用）
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}
