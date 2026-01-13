/**
 * LINE Login Callback Handler
 * 處理 LINE 登入後的回調
 */

import { createJWT } from '../utils/auth';
import { getLineProfile, checkFriendship } from '../utils/line-api';
import { createOrUpdateUser } from '../utils/supabase';

export async function handleLineCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // 傳入 env 以便讀取 SITE_URL
  if (!code) {
    return redirectWithError('缺少授權碼', env);
  }

  try {
    // 1. 用授權碼換取 Access Token
    const tokenResponse = await fetch('https://api.line.me/oauth2/v2.1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        // ✅ 修正：使用 Cloudflare 設定的 LINE_REDIRECT_URI (指向 workers.dev)
        // 這樣才能跟 LINE 後台的設定匹配
        redirect_uri: env.LINE_REDIRECT_URI,
        client_id: env.LINE_CHANNEL_ID,
        client_secret: env.LINE_CHANNEL_SECRET
      })
    });

    if (!tokenResponse.ok) {
      const errData = await tokenResponse.json();
      console.error('Token Exchange Error:', errData);
      throw new Error('無法取得 Access Token');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, id_token } = tokenData;

    // 2. 取得用戶資料
    const lineProfile = await getLineProfile(access_token);

    // 3. 檢查是否為 OA 好友
    // (如果 checkFriendship 函式內部需要 env，記得也要傳進去，這裡假設它不需要)
    const isFriend = await checkFriendship(access_token);

    // 4. 建立或更新用戶資料
    const userData = {
      line_user_id: lineProfile.userId,
      display_name: lineProfile.displayName,
      picture_url: lineProfile.pictureUrl,
      is_line_friend: isFriend,
      friend_added_at: isFriend ? new Date().toISOString() : null,
      last_login_at: new Date().toISOString()
    };

    const user = await createOrUpdateUser(userData, env);

    // 5. 產生 JWT Token
    // ⚠️ 請確保您在 Cloudflare 也有設定 JWT_SECRET 這個變數
    const jwtToken = await createJWT(user, env.JWT_SECRET || 'default-secret-key');

    // 6. 重定向回網站 (前端 Pages)
    // 這裡使用 env.SITE_URL 是正確的，因為要跳回前端
    const userDataEncoded = encodeURIComponent(JSON.stringify({
      id: user.id,
      line_user_id: user.line_user_id,
      display_name: user.display_name,
      picture_url: user.picture_url,
      mobile: user.mobile,
      is_line_friend: user.is_line_friend
    }));

    return Response.redirect(
      `${env.SITE_URL}/registration.html?token=${jwtToken}&user=${userDataEncoded}`,
      302
    );

  } catch (error) {
    console.error('LINE Callback Error:', error);
    return redirectWithError('登入失敗：' + error.message, env);
  }
}

/**
 * 錯誤重定向
 * ✅ 修正：增加 env 參數，並移除 process.env
 */
function redirectWithError(message, env) {
  const errorEncoded = encodeURIComponent(message);
  // 使用 env.SITE_URL，如果沒設定則 fallback 到 localhost
  const siteUrl = env.SITE_URL || 'http://localhost:8080';
  
  return Response.redirect(
    `${siteUrl}/registration.html?error=${errorEncoded}`,
    302
  );
}