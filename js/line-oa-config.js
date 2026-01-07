/**
 * LINE Official Account 配置
 * 用於 LINE OA Manager Deep Link
 */

const LINE_OA_CONFIG = {
    // LINE OA Manager ID
    // 請將此值替換為您的 LINE Official Account Manager ID
    // 格式範例：'@123abcde' 或實際的帳號 ID
    // 可在 LINE Official Account Manager 的 URL 中找到
    // URL 格式：https://manager.line.biz/account/{YOUR_OA_MANAGER_ID}/...
    OA_MANAGER_ID: 'YOUR_OA_MANAGER_ID',  // ⚠️ 請替換此值
    
    // LINE OA Manager Chat Deep Link 基礎 URL
    CHAT_BASE_URL: 'https://manager.line.biz/account'
};

/**
 * 生成 LINE OA Manager 一對一聊天的 Deep Link
 * @param {string} lineUserId - LINE User ID (OpenID)
 * @returns {string} Deep Link URL
 */
function generateLineOAChatLink(lineUserId) {
    if (!lineUserId) {
        console.warn('LINE User ID 不存在');
        return null;
    }
    
    if (LINE_OA_CONFIG.OA_MANAGER_ID === 'YOUR_OA_MANAGER_ID') {
        console.warn('⚠️ 請在 js/line-oa-config.js 中設定您的 LINE OA Manager ID');
        return null;
    }
    
    // 格式: https://manager.line.biz/account/{OA_MANAGER_ID}/chat/{User_OpenID}
    return `${LINE_OA_CONFIG.CHAT_BASE_URL}/${LINE_OA_CONFIG.OA_MANAGER_ID}/chat/${lineUserId}`;
}

/**
 * 檢查是否已設定 LINE OA Manager ID
 * @returns {boolean}
 */
function isLineOAConfigured() {
    return LINE_OA_CONFIG.OA_MANAGER_ID !== 'YOUR_OA_MANAGER_ID' && 
           LINE_OA_CONFIG.OA_MANAGER_ID !== '';
}