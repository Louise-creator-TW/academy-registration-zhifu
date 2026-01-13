import { getAllCourses, createCourse, updateCourse, deleteCourse } from '../utils/supabase';

export async function handleCoursesRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;

  try {
    // GET: 取得所有課程
    if (method === 'GET') {
      const courses = await getAllCourses(env);
      return jsonResponse(courses);
    }

    // POST: 新增課程 (✅ 修正後的版本)
    if (method === 'POST') {
      try {
        const data = await request.json();

        // 1. 🛡️ 必填欄位檢查 (Genspark 建議)
        // 我們不再檢查 id，而是檢查真正重要的資料
        if (!data.name || !data.teacher || !data.cost) {
          return jsonResponse(
            { error: '缺少必要欄位: 課程名稱、老師或費用' }, 
            { status: 400 }
          );
        }

        // 2. 🔢 數值型別轉換 (保留原本好的防呆邏輯)
        // 確保傳進資料庫的是數字，而不是字串 "1500"
        if (data.cost) data.cost = parseInt(data.cost);
        if (data.capacity) data.capacity = parseInt(data.capacity);
        
        // 注意：這裡完全不處理 data.id，也不處理 current_enrolled
        // 全部交給資料庫的預設值 (DEFAULT) 去自動生成

        const newCourse = await createCourse(data, env);
        return jsonResponse(newCourse, { status: 201 });

      } catch (error) {
        console.error('Create course error:', error);
        return jsonResponse({ error: error.message }, { status: 500 });
      }
    }
    
    // PUT: 更新課程
    if (method === 'PUT') {
      const id = url.searchParams.get('id');
      if (!id) throw new Error('缺少課程 ID');
      
      const data = await request.json();
      const updated = await updateCourse(id, data, env);
      return jsonResponse(updated);
    }
    
    // DELETE: 刪除課程
    if (method === 'DELETE') {
        const id = url.searchParams.get('id');
        if (!id) throw new Error('缺少課程 ID');
        await deleteCourse(id, env);
        return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);

  } catch (error) {
    console.error('Course API Error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
}

// 輔助函式
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}