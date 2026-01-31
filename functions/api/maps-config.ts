interface Env {
  GOOGLE_MAPS_API_KEY: string;
}

/**
 * 取得 Google Maps 設定（僅返回公開的前端 API Key）
 * 注意：這個 API Key 應該在 Google Cloud Console 設定 HTTP 參照網址限制
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const apiKey = context.env.GOOGLE_MAPS_API_KEY || '';
  
  return new Response(JSON.stringify({ 
    apiKey: apiKey 
  }), {
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600' // 快取 1 小時
    }
  });
};
