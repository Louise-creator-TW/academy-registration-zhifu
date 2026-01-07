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

  if (!code) {
    return redirectWithError('缺少授權碼');
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
        redirect_uri: `${env.SITE_URL}/api/line-callback`,
        client_id: env.LINE_CHANNEL_ID,
        client_secret: env.LINE_CHANNEL_SECRET
      })
    });

    if (!tokenResponse.ok) {
      throw new Error('無法取得 Access Token');
    }

    const tokenData = await tokenResponse.json();
    const { access_token, id_token } = tokenData;

    // 2. 取得用戶資料
    const lineProfile = await getLineProfile(access_token);

    // 3. 檢查是否為 OA 好友
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
    const jwtToken = await createJWT(user, env.JWT_SECRET);

    // 6. 重定向回網站
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
    return redirectWithError('登入失敗：' + error.message);
  }
}

/**
 * 錯誤重定向
 */
function redirectWithError(message) {
  const errorEncoded = encodeURIComponent(message);
  return Response.redirect(
    `${process.env.SITE_URL || 'http://localhost:8080'}/registration.html?error=${errorEncoded}`,
    302
  );
}
