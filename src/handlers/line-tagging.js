/**
 * LINE Tagging Handler
 * 手動為用戶打標籤（管理員使用）
 */

import { addLineTag } from '../utils/line-api';

export async function handleLineTagging(request, env) {
  try {
    const { line_user_id, tag_name } = await request.json();

    if (!line_user_id || !tag_name) {
      return jsonResponse(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }

    // 新增標籤
    await addLineTag(line_user_id, tag_name, env);

    return jsonResponse({
      success: true,
      message: '標籤已新增',
      line_user_id,
      tag_name
    });

  } catch (error) {
    console.error('Line Tagging Error:', error);
    return jsonResponse(
      { error: '標籤新增失敗', message: error.message },
      { status: 500 }
    );
  }
}

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
