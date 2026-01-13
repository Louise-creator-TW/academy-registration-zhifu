const API_CONFIG = {
    // ⚠️ 請填入您的 Workers 後端網址 (不含最後的斜線)
    BASE_URL: 'https://academy-registration-api.zhifu-acadamy-bot-2026.workers.dev',

    // 取得完整的 API 網址
    getEndpoint(path) {
        // 確保 path 開頭沒有斜線，避免雙斜線
        const cleanPath = path.startsWith('/') ? path.slice(1) : path;
        return `${this.BASE_URL}/${cleanPath}`;
    },

    // 統一的呼叫工具 (包含錯誤處理)
    async fetch(endpoint, options = {}) {
        const url = this.getEndpoint(endpoint);
        
        // 自動加上 JWT Token (如果有登入)
        const token = localStorage.getItem('cf_academy_auth'); // 對應 auth.js 的 Key
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        console.log(`📡 發送請求: ${options.method || 'GET'} ${url}`);

        try {
            const response = await fetch(url, { ...options, headers });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `請求失敗 (${response.status})`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ API 錯誤:', error);
            throw error;
        }
    }
};

// 讓其他檔案可以使用
window.ApiHelper = {
    get: (path) => API_CONFIG.fetch(path, { method: 'GET' }),
    post: (path, data) => API_CONFIG.fetch(path, { method: 'POST', body: JSON.stringify(data) }),
    put: (path, data) => API_CONFIG.fetch(path, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (path) => API_CONFIG.fetch(path, { method: 'DELETE' })
};