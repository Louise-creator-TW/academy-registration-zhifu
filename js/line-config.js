/**
 * LINE Login 配置檔
 * 統一管理 LINE 相關設定
 */

const LINE_CONFIG = {
    // ⚠️ 請設定您的 LINE Channel ID
    CHANNEL_ID: '2008825862',  // 請替換為您的實際 LINE Login Channel ID
    
    // ⚠️ 請設定您的 Workers URL
    WORKERS_URL: 'https://academy-registration-api.zhifu-acadamy-bot-2026.workers.dev',
    
    // LINE 授權端點
    AUTHORIZE_URL: 'https://access.line.me/oauth2/v2.1/authorize',
    
    // 取得 Callback URL（必須與 LINE Developers Console 設定一致）
    getCallbackUrl() {
        return `${this.WORKERS_URL}/api/line-callback`;
    },
    
    // 產生 LINE Login URL
    getLoginUrl(state) {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.CHANNEL_ID,
            redirect_uri: this.getCallbackUrl(),
            state: state,
            scope: 'profile openid',
            bot_prompt: 'aggressive'  // 引導用戶加入 LINE OA
        });
        
        return `${this.AUTHORIZE_URL}?${params.toString()}`;
    },
    
    // 驗證配置
    validate() {
        const errors = [];
        
        if (!this.CHANNEL_ID || this.CHANNEL_ID === 'YOUR_LINE_CHANNEL_ID') {
            errors.push('❌ LINE_CHANNEL_ID 未設定');
        }
        
        if (!this.WORKERS_URL || this.WORKERS_URL.includes('your-subdomain')) {
            errors.push('❌ WORKERS_URL 未設定');
        }
        
        if (errors.length > 0) {
            console.error('LINE 配置錯誤:', errors);
            return false;
        }
        
        console.log('✅ LINE 配置驗證成功');
        console.log('   Channel ID:', this.CHANNEL_ID);
        console.log('   Callback URL:', this.getCallbackUrl());
        return true;
    }
};

// 匯出供其他模組使用
if (typeof window !== 'undefined') {
    window.LINE_CONFIG = LINE_CONFIG;
}
