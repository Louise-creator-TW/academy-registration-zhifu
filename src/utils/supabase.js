/**
 * Supabase Database Utilities
 * 資料庫操作封裝
 */

import { createClient } from '@supabase/supabase-js';

/**
 * 建立 Supabase 客戶端
 */
function getSupabaseClient(env) {
  return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}

/**
 * 取得用戶（透過 LINE User ID）
 * @param {string} lineUserId - LINE User ID
 * @param {Object} env - 環境變數
 * @returns {Promise<Object|null>} 用戶資料
 */
export async function getUserByLineId(lineUserId, env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // 找不到記錄
      return null;
    }
    throw error;
  }
  
  return data;
}

/**
 * 建立新用戶
 * @param {Object} userData - 用戶資料
 * @param {Object} env - 環境變數
 * @returns {Promise<Object>} 用戶資料
 */
export async function createUser(userData, env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('users')
    .insert([{
      ...userData,
      created_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 更新用戶資料
 * @param {string} userId - 用戶 ID
 * @param {Object} userData - 用戶資料
 * @param {Object} env - 環境變數
 * @returns {Promise<Object>} 用戶資料
 */
export async function updateUser(userId, userData, env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('users')
    .update({
      ...userData,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 建立或更新用戶
 * @param {Object} userData - 用戶資料
 * @param {Object} env - 環境變數
 * @returns {Promise<Object>} 用戶資料
 */
export async function createOrUpdateUser(userData, env) {
  const supabase = getSupabaseClient(env);

  // 檢查用戶是否已存在
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('line_user_id', userData.line_user_id)
    .single();

  if (existingUser) {
    // 更新現有用戶
    const { data, error } = await supabase
      .from('users')
      .update({
        display_name: userData.display_name,
        picture_url: userData.picture_url,
        status_message: userData.status_message,
        mobile: userData.mobile || existingUser.mobile,
        is_line_friend: userData.is_line_friend,
        friend_added_at: userData.friend_added_at || existingUser.friend_added_at,
        last_login_at: userData.last_login_at,
        updated_at: new Date().toISOString()
      })
      .eq('line_user_id', userData.line_user_id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // 建立新用戶
    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * 建立報名記錄
 * @param {Object} registrationData - 報名資料
 * @param {Object} env - 環境變數
 * @returns {Promise<Object>} 報名記錄
 */
export async function createRegistration(registrationData, env) {
  const supabase = getSupabaseClient(env);

  const { data, error } = await supabase
    .from('registrations')
    .insert([{
      ...registrationData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 更新課程報名人數
 * @param {string} courseId - 課程 ID
 * @param {number} increment - 增加數量（預設 1）
 * @param {Object} env - 環境變數
 * @returns {Promise<Object>} 課程資料
 */
export async function updateCourseEnrollment(courseId, increment = 1, env) {
  const supabase = getSupabaseClient(env);

  // 取得課程資料
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) {
    throw new Error('課程不存在');
  }

  // 更新報名人數
  const newEnrolled = (course.current_enrolled || 0) + increment;
  const isFull = newEnrolled >= course.capacity;

  const { data, error } = await supabase
    .from('courses')
    .update({
      current_enrolled: newEnrolled,
      is_full: isFull,
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 更新報名記錄的標籤狀態
 * @param {string} registrationId - 報名記錄 ID
 * @param {Object} env - 環境變數
 * @returns {Promise<Object>} 報名記錄
 */
export async function updateRegistrationTagged(registrationId, env) {
  const supabase = getSupabaseClient(env);

  const { data, error } = await supabase
    .from('registrations')
    .update({ 
      line_tagged: true,
      line_tagged_at: new Date().toISOString()
    })
    .eq('id', registrationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 更新報名記錄的通知狀態
 * @param {string} registrationId - 報名記錄 ID
 * @param {boolean} success - 是否成功
 * @param {string} errorMessage - 錯誤訊息（如果失敗）
 * @param {Object} env - 環境變數
 * @returns {Promise<Object>} 報名記錄
 */
export async function updateRegistrationNotificationStatus(
  registrationId, 
  success, 
  errorMessage = null, 
  env
) {
  const supabase = getSupabaseClient(env);
  
  const updateData = {
    line_notified: success,
    line_notified_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  if (!success && errorMessage) {
    updateData.line_notify_error = errorMessage;
  }
  
  const { data, error } = await supabase
    .from('registrations')
    .update(updateData)
    .eq('id', registrationId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 檢查用戶是否已報名課程
 * @param {string} userId - 用戶 ID
 * @param {string} courseId - 課程 ID
 * @param {Object} env - 環境變數
 * @returns {Promise<boolean>} 是否已報名
 */
export async function checkDuplicateRegistration(userId, courseId, env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('registrations')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // 找不到記錄，表示未報名
      return false;
    }
    throw error;
  }
  
  return data !== null;
}

/**
 * 取得用戶的所有報名記錄
 * @param {string} userId - 用戶 ID
 * @param {Object} env - 環境變數
 * @returns {Promise<Array>} 報名記錄陣列
 */
export async function getUserRegistrations(userId, env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('user_id', userId)
    .order('registration_date', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * 取得課程資料
 * @param {string} courseId - 課程 ID
 * @param {Object} env - 環境變數
 * @returns {Promise<Object>} 課程資料
 */
export async function getCourse(courseId, env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 取得所有課程
 * @param {Object} env - 環境變數
 * @returns {Promise<Array>} 課程陣列
 */
export async function getAllCourses(env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

/**
 * 取得待通知的報名記錄（通知失敗的）
 * @param {Object} env - 環境變數
 * @returns {Promise<Array>} 報名記錄陣列
 */
export async function getPendingNotifications(env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('registrations')
    .select('*')
    .eq('line_notified', false)
    .not('line_user_id', 'is', null)
    .order('registration_date', { ascending: true })
    .limit(100);
  
  if (error) throw error;
  return data || [];
}
