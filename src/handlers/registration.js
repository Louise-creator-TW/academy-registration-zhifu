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
      is_proxy_registration: formData.is_proxy_registration || false,  // 新增：是否為代理報名
      line_tagged: false,
      line_tag_name: `已報名-${formData.course_name}`,
      registration_date: new Date().toISOString()
    };

    // 5. 儲存報名資料
    const registration = await createRegistration(registrationData, env);

    if (!registration) {
      throw new Error('Failed to create registration');
    }

    // 6. 更新課程報名人數
    await updateCourseEnrollment(formData.course_id, 1, env);

    // 🔥 7. 關鍵步驟：打標籤 + 發送 LINE 通知
    // 使用 ctx.waitUntil 確保在背景完成，不阻塞響應
    if (ctx && ctx.waitUntil) {
      ctx.waitUntil(
        handleLineNotificationAndTagging(
          registration,
          user.lineUserId,
          formData,
          env
        ).catch(error => {
          console.error('LINE 通知與標籤處理失敗:', error);
        })
      );
    } else {
      // 如果沒有 ctx (本地測試)，直接執行
      handleLineNotificationAndTagging(
        registration,
        user.lineUserId,
        formData,
        env
      ).catch(error => {
        console.error('LINE 通知與標籤處理失敗:', error);
      });
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
 * 處理 LINE 通知與標籤（背景執行）
 * @param {Object} registration - 報名記錄
 * @param {string} lineUserId - LINE User ID
 * @param {Object} formData - 表單資料
 * @param {Object} env - 環境變數
 */
async function handleLineNotificationAndTagging(registration, lineUserId, formData, env) {
  try {
    // 步驟 1: 記錄標籤到資料庫
    console.log(`📌 開始打標籤: ${registration.line_tag_name}`);
    
    try {
      await recordUserTag(
        registration.id,
        lineUserId,
        registration.line_tag_name,
        env
      );
      console.log(`✅ 標籤已記錄: ${registration.line_tag_name}`);
    } catch (tagError) {
      console.error('❌ 標籤記錄失敗:', tagError);
      // 繼續執行通知流程
    }

    // 步驟 2: 建立 Flex Message 卡片
    console.log(`📨 準備發送 LINE 通知給: ${lineUserId}`);
    
    const messages = [];

    // 2.1 主要報名確認卡片
    const confirmationCard = createRegistrationConfirmationCard({
      studentName: formData.name,
      courseName: formData.course_name,
      teacher: formData.teacher || '待公布',
      time: formData.time || '待公布',
      location: formData.location || '懷寧浸信會',
      cost: formData.cost || 0,
      registrationDate: new Date().toLocaleDateString('zh-TW')
    });
    messages.push(confirmationCard);

    // 2.2 如果是轉帳繳費，額外發送繳費提醒卡片
    if (formData.payment_method === '轉帳繳費') {
      const paymentCard = createPaymentReminderCard({
        bankName: env.BANK_NAME || '台灣銀行',
        branchName: env.BANK_BRANCH || '台北分行',
        accountNumber: env.BANK_ACCOUNT || '123-456-789012',
        accountName: env.BANK_ACCOUNT_NAME || '致福益人學苑懷寧浸信會分校',
        amount: formData.cost || 0
      });
      messages.push(paymentCard);
    }

    // 步驟 3: 發送 Push Message
    try {
      await sendPushMessage(lineUserId, messages, env);
      
      // 更新通知狀態為成功
      await updateRegistrationNotificationStatus(
        registration.id,
        true,
        null,
        env
      );
      
      console.log(`✅ LINE 通知已成功發送給: ${lineUserId}`);
      
    } catch (sendError) {
      console.error('❌ LINE 通知發送失敗:', sendError);
      
      // 更新通知狀態為失敗
      await updateRegistrationNotificationStatus(
        registration.id,
        false,
        sendError.message,
        env
      );
      
      throw sendError;
    }

  } catch (error) {
    console.error('❌ LINE 通知與標籤處理發生錯誤:', error);
    throw error;
  }
}

