/**
 * Registration Submit Handler
 * 處理報名提交 - 修正版 (已修復 user_id 與 line_user_id 取值錯誤)
 */

import { verifyJWT } from '../utils/auth';
import { createRegistration, updateCourseEnrollment, updateRegistrationNotificationStatus } from '../utils/supabase';
import { sendPushMessage, recordUserTag } from '../utils/line-api';
import { createRegistrationConfirmationCard, createPaymentReminderCard } from '../templates/flex-messages';
import { jsonResponse } from '../utils/response';

export async function handleRegistrationSubmit(request, env, ctx) {
  try {
    // 1. 驗證 JWT Token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: '未授權' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = await verifyJWT(token, env.JWT_SECRET);

    if (!user) {
      return jsonResponse({ error: 'Token 無效' }, { status: 401 });
    }

    // 2. 取得請求資料
    const formData = await request.json();

    // 3. 驗證必要欄位
    if (!formData.course_id || !formData.name || !formData.mobile) {
      return jsonResponse(
        { error: '缺少必要欄位' },
        { status: 400 }
      );
    }

    // Debug: 確認抓到的 user 資料 (部署後可查看 logs)
    console.log(`👤 處理報名用戶: ${user.display_name} | ID: ${user.line_user_id}`);

    // 4. 準備報名資料
    const registrationData = {
      // ✅ [修正 1] 使用 user.id (對應 JWT payload 的標準欄位)
      user_id: user.id, 
      
      // ✅ [修正 2] 使用 user.line_user_id (修正駝峰式命名錯誤)
      line_user_id: user.line_user_id, 
      
      course_id: formData.course_id,
      course_name: formData.course_name,
      name: formData.name,
      gender: formData.gender,
      age_range: formData.age_range,
      mobile: formData.mobile,
      emergency_contact: formData.emergency_contact,
      emergency_phone: formData.emergency_phone,
      religion: formData.religion,
      payment_method: formData.payment_method,
      account_last5: formData.account_last5,
      notes: formData.notes,
      payment_status: '未繳費',
      is_proxy_registration: formData.is_proxy_registration || false,
      line_tagged: false,
      line_tag_name: `已報名-${formData.course_name}`
    };

    // 5. 儲存報名資料
    const registration = await createRegistration(registrationData, env);

    if (!registration) {
      throw new Error('Failed to create registration');
    }

    // 6. 更新課程報名人數
    await updateCourseEnrollment(formData.course_id, 1, env);

    // 7. 關鍵步驟：打標籤 + 發送 LINE 通知
    // ✅ [修正 3] 這裡也要傳入 user.line_user_id，確保通知發給正確的人
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(
        handleLineNotificationAndTagging(registration, user.line_user_id, formData, env)
          .catch(err => console.error('BG Task Error:', err))
      );
    } else {
      handleLineNotificationAndTagging(registration, user.line_user_id, formData, env)
        .catch(err => console.error('Task Error:', err));
    }

    // 8. 立即返回成功結果
    return jsonResponse({
      success: true,
      message: '報名成功！',
      registration: {
        id: registration.id,
        course_name: registration.course_name,
        registration_date: registration.registration_date 
      }
    }, { status: 201 });

  } catch (error) {
    console.error('報名處理失敗:', error);
    return jsonResponse(
      { 
        success: false,
        error: '報名失敗', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * 處理 LINE 通知與標籤 (背景任務)
 */
async function handleLineNotificationAndTagging(registration, lineUserId, formData, env) {
    try {
        // 步驟 1: 記錄標籤
        await recordUserTag(registration.id, lineUserId, registration.line_tag_name, env);

        // 步驟 2: 建立報名確認卡片
        const confirmationCard = createRegistrationConfirmationCard({
          studentName: formData.name,
          courseName: formData.course_name,
          teacher: formData.teacher || '待公布',
          time: formData.time || '待公布',
          location: formData.location || '懷寧浸信會',
          cost: formData.cost || 0,
          registrationDate: new Date().toLocaleDateString('zh-TW')
        });
        
        const messages = [confirmationCard];

        // 如果是轉帳繳費，附加繳費資訊卡片
        if (formData.payment_method === '轉帳繳費') {
            messages.push(createPaymentReminderCard({
                bankName: env.BANK_NAME || '台灣銀行',
                branchName: env.BANK_BRANCH || '台北分行',
                accountNumber: env.BANK_ACCOUNT || '123-456-789012',
                accountName: env.BANK_ACCOUNT_NAME || '致福益人學苑懷寧浸信會分校',
                amount: formData.cost || 0
            }));
        }

        // 步驟 3: 發送訊息
        await sendPushMessage(lineUserId, messages, env);
        
        // 更新通知狀態為成功
        await updateRegistrationNotificationStatus(registration.id, true, null, env);

    } catch (error) {
        console.error('❌ LINE 通知處理錯誤:', error);
        // 更新通知狀態為失敗
        await updateRegistrationNotificationStatus(registration.id, false, error.message, env);
    }
}