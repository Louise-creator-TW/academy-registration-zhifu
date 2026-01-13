/**
 * LINE Official Account 配置
 * 用於 LINE OA Manager Deep Link
 */

const LINE_OA_CONFIG = {
    // 您已填入的正確 ID
    OA_MANAGER_ID: '@310jmfrm', 
    
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
    
    // 修正：移除了會阻擋 '@310jmfrm' 的判斷式
    if (LINE_OA_CONFIG.OA_MANAGER_ID === '' || LINE_OA_CONFIG.OA_MANAGER_ID.includes('YOUR_')) {
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
    // 修正：只要不是空字串就算設定成功
    return LINE_OA_CONFIG.OA_MANAGER_ID !== '';
}