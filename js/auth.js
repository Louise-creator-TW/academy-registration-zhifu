// ==========================================
// 1. LINE 設定區域 (直接合併在這裡，保證讀得到)
// ==========================================
const LINE_CONFIG = {
    // ⚠️ 請確認這是您的 Channel ID
    CHANNEL_ID: '2008825862',  
    
    // ⚠️ (關鍵修改) 請填入您的 Workers 後端網址
    // 這會把 LINE 帶來的 "Code" 交給後端處理，後端處理完會再把您帶回首頁並附上 "Token"
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
    
    init() {
        this.checkAuthStatus();
        this.updateUIForAuthStatus();
    },
    
    isLoggedIn() {
        const token = localStorage.getItem(this.STORAGE_KEY);
        const user = this.getCurrentUser();
        return !!(token && user);
    },
    
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
    
    setUser(userData) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
        this.updateUIForAuthStatus();
    },
    
    setToken(token) {
        localStorage.setItem(this.STORAGE_KEY, token);
    },
    
    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.updateUIForAuthStatus();
        window.location.href = 'index.html';
    },
    
    checkAuthStatus() {
        // 從 URL 取得 token (這是後端 Workers 跳轉回來時帶的參數)
        const urlParams = new URLSearchParams(window.location.search);
        // 注意：這裡假設後端會回傳 token 和 user 參數
        // 如果還沒寫後端邏輯，這裡暫時不會觸發，但不影響跳轉去 LINE
        const token = urlParams.get('token');
        const userDataStr = urlParams.get('user');
        
        if (token && userDataStr) {
            try {
                const userData = JSON.parse(decodeURIComponent(userDataStr));
                this.setToken(token);
                this.setUser(userData);
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (error) {
                console.error('Auth callback error:', error);
            }
        }
    },
    
    updateUIForAuthStatus() {
        const isLoggedIn = this.isLoggedIn();
        const user = this.getCurrentUser();
        
        const authButtons = document.getElementById('authButtons');
        
        if (authButtons) {
            if (isLoggedIn && user) {
                authButtons.innerHTML = `
                    <div class="user-menu">
                        <img src="${user.picture_url || 'https://via.placeholder.com/40'}" alt="${user.display_name}" class="user-avatar" style="width:40px;height:40px;border-radius:50%;">
                        <span class="user-name" style="margin:0 10px;">${user.display_name}</span>
                        <button onclick="AuthManager.logout()" class="btn btn-secondary">登出</button>
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
        
        const myRegistrationsLink = document.getElementById('myRegistrationsLink');
        if (myRegistrationsLink) {
            myRegistrationsLink.style.display = isLoggedIn ? 'block' : 'none';
        }
    },
    
    // LINE 登入 (直接使用上方的 LINE_CONFIG)
    lineLogin() {
        const STATE = this.generateState();
        localStorage.setItem('line_login_state', STATE);
        
        // 這裡直接呼叫，絕對不會找不到變數
        const lineLoginUrl = LINE_CONFIG.getLoginUrl(STATE);
        
        console.log('準備跳轉至:', lineLoginUrl);
        window.location.href = lineLoginUrl;
    },
    
    generateState() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    },
    
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
    }
};

// 頁面載入時初始化
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        AuthManager.init();
    });
}

// 匯出
if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}