/**
 * Registration Submit Handler
 * 處理報名提交 - 包含標籤與 LINE 推播功能
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

    // 4. 準備報名資料
    const registrationData = {
      user_id: user.userId,
      line_user_id: user.lineUserId,
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
      // ❌ 已移除 registration_date：讓資料庫 DEFAULT NOW() 自動處理，避免時區問題
    };

    // 5. 儲存報名資料
    const registration = await createRegistration(registrationData, env);

    if (!registration) {
      throw new Error('Failed to create registration');
    }

    // 6. 更新課程報名人數
    // (注意：請確認 utils/supabase.js 裡的 updateCourseEnrollment 有更新 courses 表的 updated_at)
    await updateCourseEnrollment(formData.course_id, 1, env);

    // 🔥 7. 關鍵步驟：打標籤 + 發送 LINE 通知
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(
        handleLineNotificationAndTagging(registration, user.lineUserId, formData, env)
          .catch(err => console.error('BG Task Error:', err))
      );
    } else {
      handleLineNotificationAndTagging(registration, user.lineUserId, formData, env)
        .catch(err => console.error('Task Error:', err));
    }

    // 8. 立即返回成功結果
    return jsonResponse({
      success: true,
      message: '報名成功！',
      registration: {
        id: registration.id,
        course_name: registration.course_name,
        // 回傳資料時，因為剛寫入，資料庫會回傳自動產生的 registration_date
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

// ... handleLineNotificationAndTagging 函式保持不變 ...
// (為了節省篇幅，下方省略，請保留原有的 handleLineNotificationAndTagging 代碼)
async function handleLineNotificationAndTagging(registration, lineUserId, formData, env) {
    // ... 原本的代碼 ...
    try {
        // 步驟 1: 記錄標籤
        // ...
        await recordUserTag(registration.id, lineUserId, registration.line_tag_name, env);

        // 步驟 2: 建立卡片
        // ...
        // 注意：這裡顯示日期用 new Date() 是沒問題的，因為只是顯示給用戶看當天日期
        const confirmationCard = createRegistrationConfirmationCard({
          studentName: formData.name,
          courseName: formData.course_name,
          teacher: formData.teacher || '待公布',
          time: formData.time || '待公布',
          location: formData.location || '懷寧浸信會',
          cost: formData.cost || 0,
          registrationDate: new Date().toLocaleDateString('zh-TW')
        });
        
        // ... 其餘邏輯保持不變 ...
        const messages = [confirmationCard];
        if (formData.payment_method === '轉帳繳費') {
            messages.push(createPaymentReminderCard({
                bankName: env.BANK_NAME || '台灣銀行',
                branchName: env.BANK_BRANCH || '台北分行',
                accountNumber: env.BANK_ACCOUNT || '123-456-789012',
                accountName: env.BANK_ACCOUNT_NAME || '致福益人學苑懷寧浸信會分校',
                amount: formData.cost || 0
            }));
        }

        await sendPushMessage(lineUserId, messages, env);
        await updateRegistrationNotificationStatus(registration.id, true, null, env);

    } catch (error) {
        console.error('❌ LINE 通知處理錯誤:', error);
        await updateRegistrationNotificationStatus(registration.id, false, error.message, env);
        // 這裡不 throw error，避免影響主流程的回傳結果
    }
}