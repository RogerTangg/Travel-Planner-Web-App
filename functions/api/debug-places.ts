/**
 * Places API 診斷端點
 * 用於測試 Google Places API 是否正確設定
 * 
 * 使用方式：GET /api/debug-places?q=東京鐵塔
 */

interface Env {
  GOOGLE_MAPS_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const query = url.searchParams.get('q') || '東京鐵塔';
  
  const apiKey = context.env.GOOGLE_MAPS_API_KEY;
  
  // 檢查 API Key 是否存在
  if (!apiKey) {
    return new Response(JSON.stringify({
      error: 'GOOGLE_MAPS_API_KEY 環境變數未設定',
      hint: '請在 Cloudflare Dashboard > Pages > Settings > Environment variables 中設定'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 測試 Places API
  try {
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;
    const response = await fetch(searchUrl);
    const data = await response.json() as any;
    
    // 回傳診斷資訊
    return new Response(JSON.stringify({
      query: query,
      apiKeyPresent: true,
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      placesApiStatus: data.status,
      errorMessage: data.error_message || null,
      resultsCount: data.results?.length || 0,
      firstResult: data.results?.[0] ? {
        name: data.results[0].name,
        address: data.results[0].formatted_address,
        photosCount: data.results[0].photos?.length || 0,
        firstPhotoRef: data.results[0].photos?.[0]?.photo_reference?.substring(0, 20) + '...' || null
      } : null,
      hint: data.status !== 'OK' 
        ? '請確認 Google Cloud Console 中已啟用 "Places API" (不是 Places API New)'
        : '✓ Places API 正常運作'
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'API 請求失敗',
      message: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
