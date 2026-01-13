/**
 * HTTP Response 工具函數
 * 統一處理 JSON 回應格式
 */

/**
 * 建立 JSON Response
 * @param {Object} data - 回應資料
 * @param {Object} options - 選項 (status, headers)
 * @returns {Response} HTTP Response
 */
export function jsonResponse(data, options = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...options.headers
    },
    status: options.status || 200
  });
}

/**
 * 建立 CORS Response
 * @returns {Response} CORS Response
 */
export function corsResponse() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}
