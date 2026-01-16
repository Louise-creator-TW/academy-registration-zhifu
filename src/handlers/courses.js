import { getAllCourses, createCourse, updateCourse, deleteCourse } from '../utils/supabase';
import { jsonResponse } from '../utils/response';

export async function handleCoursesRequest(request, env) {
  const url = new URL(request.url);
  const method = request.method;

  try {
    // GET: 取得所有課程
    if (method === 'GET') {
      const courses = await getAllCourses(env);
      return jsonResponse(courses);
    }

    /// POST: 新增課程
    if (method === 'POST') {
      try {
        const data = await request.json();

        // 1. 🛡️ 必填欄位檢查
        if (!data.name || !data.teacher || !data.cost) {
          // 🔴 修改點 1：把 { status: 400 } 改成 400
          return jsonResponse(
            { error: '缺少必要欄位: 課程名稱、老師或費用' }, 
            400 
          );
        }

        // 2. 🔢 數值型別轉換
        if (data.cost) data.cost = parseInt(data.cost);
        if (data.capacity) data.capacity = parseInt(data.capacity);
        
        // 呼叫建立課程
        const newCourse = await createCourse(data, env);
        
        // 🔴 修改點 2：把 { status: 201 } 改成 201
        return jsonResponse(newCourse, 201);

      } catch (error) {
        console.error('Create course error:', error);
        // 🔴 修改點 3：把 { status: 500 } 改成 500
        return jsonResponse({ error: error.message }, 500);
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

