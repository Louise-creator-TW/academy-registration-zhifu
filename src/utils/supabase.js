/**
 * Supabase Database Utilities
 * 資料庫操作封裝
 */

import { createClient } from '@supabase/supabase-js';

/**
 * 建立 Supabase 客戶端 (含防呆檢查)
 */
function getSupabaseClient(env) {
  // 1. 檢查變數是否存在
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    console.error('❌ Supabase 環境變數缺失！請檢查 Cloudflare Settings。');
    throw new Error('Supabase configuration missing');
  }

  // 2. 防呆處理：自動去除前後空白 (Trim)
  // 這是為了防止 "Error 1016" 再次發生
  const cleanUrl = env.SUPABASE_URL.trim();
  const cleanKey = env.SUPABASE_ANON_KEY.trim();

  return createClient(cleanUrl, cleanKey);
}

/**
 * 取得用戶（透過 LINE User ID）
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
      return null; // 找不到記錄
    }
    throw error;
  }
  
  return data;
}

/**
 * 建立新用戶
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
 * 建立或更新用戶 (登入核心)
 */
export async function createOrUpdateUser(userData, env) {
  const supabase = getSupabaseClient(env);

  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('line_user_id', userData.line_user_id)
    .single();

  if (existingUser) {
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
 */
export async function updateCourseEnrollment(courseId, increment = 1, env) {
  const supabase = getSupabaseClient(env);

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single();

  if (!course) throw new Error('課程不存在');

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
 * 檢查重複報名
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
    if (error.code === 'PGRST116') return false;
    throw error;
  }
  return data !== null;
}

/**
 * 取得用戶的所有報名記錄
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
 * 建立新課程 (這是您原本缺少的！)
 */
export async function createCourse(courseData, env) {
  const supabase = getSupabaseClient(env);
  
  // 移除 id 欄位（讓資料庫自動產生）
  const { id, ...dataWithoutId } = courseData;
  
  console.log('📝 建立課程，資料:', dataWithoutId);
  
  const { data, error } = await supabase
    .from('courses')
    .insert([{
      ...dataWithoutId,  // 不包含 id
      current_enrolled: dataWithoutId.current_enrolled || 0,
      is_full: dataWithoutId.is_full || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    console.error('❌ 建立課程失敗:', error);
    throw error;
  }
  
  console.log('✅ 課程已建立:', data);
  return data;
}

/**
 * 更新課程資料 (這是您原本缺少的！)
 */
export async function updateCourse(courseId, courseData, env) {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('courses')
    .update({
      ...courseData,
      updated_at: new Date().toISOString()
    })
    .eq('id', courseId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * 刪除課程 (這是您原本缺少的！)
 */
export async function deleteCourse(courseId, env) {
  const supabase = getSupabaseClient(env);
  
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId);
  
  if (error) throw error;
}

/**
 * 取得待通知列表
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