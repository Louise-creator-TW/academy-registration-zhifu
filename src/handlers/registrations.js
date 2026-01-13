/**
 * Registrations API Handler
 * 處理報名記錄相關的 API 請求
 */

import { getUserRegistrations } from '../utils/supabase';

/**
 * 處理報名記錄請求
 */
export async function handleRegistrationsRequest(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
        // GET /api/registrations - 取得報名列表
        if (path === '/api/registrations' && method === 'GET') {
            // 從 query parameters 取得參數
            const limit = parseInt(url.searchParams.get('limit')) || 100;
            const page = parseInt(url.searchParams.get('page')) || 1;
            const sort = url.searchParams.get('sort') || '-registration_date';
            
            console.log('📥 取得報名列表');
            console.log('   Limit:', limit);
            console.log('   Page:', page);
            console.log('   Sort:', sort);
            
            // TODO: 實作分頁和排序邏輯
            // 目前先回傳所有報名記錄
            const registrations = await getAllRegistrations(env, limit, sort);
            
            return jsonResponse({
                data: registrations,
                total: registrations.length,
                page: page,
                limit: limit
            });
        }

        // GET /api/registrations/user/:userId - 取得特定用戶的報名記錄
        if (path.startsWith('/api/registrations/user/') && method === 'GET') {
            const userId = path.split('/')[4];
            
            console.log('📥 取得用戶報名記錄');
            console.log('   User ID:', userId);
            
            const registrations = await getUserRegistrations(userId, env);
            
            return jsonResponse({
                data: registrations,
                total: registrations.length
            });
        }

        // 404 Not Found
        return jsonResponse(
            { error: 'Not Found', path },
            { status: 404 }
        );

    } catch (error) {
        console.error('❌ Registrations API Error:', error);
        return jsonResponse(
            { error: 'Internal Server Error', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * 取得所有報名記錄
 */
async function getAllRegistrations(env, limit = 100, sort = '-registration_date') {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
    
    // 解析排序參數
    const isDescending = sort.startsWith('-');
    const sortField = isDescending ? sort.substring(1) : sort;
    
    const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order(sortField, { ascending: !isDescending })
        .limit(limit);
    
    if (error) {
        console.error('❌ 取得報名記錄失敗:', error);
        throw error;
    }
    
    console.log('✅ 取得報名記錄成功:', data?.length || 0, '筆');
    return data || [];
}

/**
 * JSON Response 輔助函數
 */
function jsonResponse(data, options = {}) {
    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            ...options.headers
        },
        status: options.status || 200
    });
}