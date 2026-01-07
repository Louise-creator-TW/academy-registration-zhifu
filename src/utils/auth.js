/**
 * JWT 認證工具
 * 使用 Web Crypto API（Cloudflare Workers 原生支援）
 */

/**
 * 建立 JWT Token
 * @param {Object} userData - 用戶資料
 * @param {string} secret - JWT 密鑰
 * @returns {Promise<string>} JWT Token
 */
export async function createJWT(userData, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    id: userData.id,
    line_user_id: userData.line_user_id,
    display_name: userData.display_name,
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 天
  };

  // Base64 URL 編碼
  const base64UrlEncode = (obj) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  // 使用 Web Crypto API 簽章
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(dataToSign)
  );

  // 轉換簽章為 Base64 URL
  const signatureArray = new Uint8Array(signature);
  const signatureBase64 = btoa(String.fromCharCode(...signatureArray));
  const signatureBase64Url = signatureBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${dataToSign}.${signatureBase64Url}`;
}

/**
 * 驗證 JWT Token
 * @param {string} token - JWT Token
 * @param {string} secret - JWT 密鑰
 * @returns {Promise<Object|null>} 解碼後的用戶資料，驗證失敗返回 null
 */
export async function verifyJWT(token, secret) {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    if (!encodedHeader || !encodedPayload || !signature) {
      console.error('JWT 格式錯誤');
      return null;
    }

    // Base64 URL 解碼
    const base64UrlDecode = (str) => {
      const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - base64.length % 4) % 4);
      const json = atob(base64 + padding);
      return JSON.parse(json);
    };

    const payload = base64UrlDecode(encodedPayload);

    // 檢查過期時間
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.error('JWT 已過期');
      return null;
    }

    // 驗證簽章
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;
    const encoder = new TextEncoder();
    
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // 解碼簽章
    const signatureBase64 = signature.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - signatureBase64.length % 4) % 4);
    const signatureBinary = atob(signatureBase64 + padding);
    const signatureArray = new Uint8Array(signatureBinary.length);
    for (let i = 0; i < signatureBinary.length; i++) {
      signatureArray[i] = signatureBinary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureArray,
      encoder.encode(dataToVerify)
    );

    if (!isValid) {
      console.error('JWT 簽章驗證失敗');
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT 驗證錯誤:', error);
    return null;
  }
}
