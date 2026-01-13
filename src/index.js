/**
 * Cloudflare Workers 主路由器
 * 處理所有 API 請求
 */

import { handleLineCallback } from './handlers/line-callback';
import { handleRegistrationSubmit } from './handlers/registration';
import { handleLineTagging } from './handlers/line-tagging';
import { handleCoursesRequest } from './handlers/courses';
import { handleRegistrationsRequest } from './handlers/registrations';
import { jsonResponse, corsResponse } from './utils/response';

export default {
  async fetch(request, env, ctx) {
    // CORS 處理
    if (request.method === 'OPTIONS') {
      return corsResponse();
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 課程管理 API
      if (path.startsWith('/api/courses')) {
        return await handleCoursesRequest(request, env);
      }
      
      // 報名記錄 API
      if (path.startsWith('/api/registrations')) {
        return await handleRegistrationsRequest(request, env);
      }
      
      // LINE Login 回調
      if (path === '/api/line-callback' && request.method === 'GET') {
        return await handleLineCallback(request, env);
      }
      
      // 報名提交
      if (path === '/api/registration/submit' && request.method === 'POST') {
        return await handleRegistrationSubmit(request, env);
      }
      
      // LINE 標籤
      if (path === '/api/line/tag' && request.method === 'POST') {
        return await handleLineTagging(request, env);
      }
      
      // 健康檢查
      if (path === '/api/health') {
        return jsonResponse({ status: 'ok', timestamp: Date.now() });
      }

      // 404 Not Found
      return jsonResponse(
        { error: 'Not Found', path },
        { status: 404 }
      );

    } catch (error) {
      console.error('API Error:', error);
      return jsonResponse(
        { error: 'Internal Server Error', message: error.message },
        { status: 500 }
      );
    }
  }
};