/**
 * Google Places Photo API 代理端點
 * 
 * 提供景點照片的安全存取：
 * - 隱藏後端 API Key，避免前端暴露敏感資訊
 * - 支援照片尺寸調整
 * - 提供快取控制以優化效能
 * 
 * @module functions/api/place-photos
 */

// Cloudflare Pages Functions 全域型別宣告
declare const PagesFunction: any;

interface Env {
  GOOGLE_MAPS_API_KEY: string;
}

interface PhotoRequest {
  photoReference: string;  // Google Places Photo Reference
  maxWidth?: number;       // 最大寬度（1-1600，預設 400）
  maxHeight?: number;      // 最大高度（1-1600）
}

/**
 * 取得景點照片
 * 透過 Google Places Photo API 取得照片，並以串流方式回傳
 * 
 * @param context - Cloudflare Pages Function Context
 * @returns 圖片串流或錯誤訊息
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { photoReference, maxWidth = 400, maxHeight } = await context.request.json() as PhotoRequest;

    // 參數驗證 (Parameter Validation)
    if (!photoReference || typeof photoReference !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'photoReference 為必要參數',
        code: 'MISSING_PHOTO_REFERENCE' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = context.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY 未設定');
      return new Response(JSON.stringify({ 
        error: '伺服器設定錯誤',
        code: 'MISSING_API_KEY' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 限制尺寸範圍 (Clamp size within valid range)
    const clampedWidth = Math.min(Math.max(maxWidth, 1), 1600);
    const clampedHeight = maxHeight ? Math.min(Math.max(maxHeight, 1), 1600) : undefined;

    // 建構 Google Places Photo API URL
    let photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${clampedWidth}&photo_reference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
    
    if (clampedHeight) {
      photoUrl += `&maxheight=${clampedHeight}`;
    }

    // 取得照片 (Fetch photo from Google)
    const response = await fetch(photoUrl, {
      redirect: 'follow' // Google Places Photo API 會重新導向到實際圖片 URL
    });

    if (!response.ok) {
      console.error(`Places Photo API 錯誤: ${response.status}`);
      return new Response(JSON.stringify({ 
        error: '無法取得照片',
        code: 'PHOTO_FETCH_FAILED',
        status: response.status
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 取得圖片內容與類型
    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    // 回傳圖片並設定快取（照片通常不會變動，快取 7 天）
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800', // 7 天快取
        'X-Photo-Source': 'google-places-api'
      }
    });

  } catch (error) {
    console.error('Place Photo API 錯誤:', error);
    return new Response(JSON.stringify({ 
      error: '伺服器內部錯誤',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * GET 請求：透過 URL 參數取得照片
 * 用於直接在 <img src=""> 中使用
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const photoReference = url.searchParams.get('ref');
    const maxWidth = parseInt(url.searchParams.get('w') || '400', 10);
    const maxHeight = url.searchParams.get('h') ? parseInt(url.searchParams.get('h')!, 10) : undefined;

    if (!photoReference) {
      return new Response(JSON.stringify({ 
        error: 'ref 參數為必要',
        code: 'MISSING_PHOTO_REFERENCE' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const apiKey = context.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY 未設定');
      return new Response(JSON.stringify({ 
        error: '伺服器設定錯誤',
        code: 'MISSING_API_KEY' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 限制尺寸範圍
    const clampedWidth = Math.min(Math.max(maxWidth, 1), 1600);
    const clampedHeight = maxHeight ? Math.min(Math.max(maxHeight, 1), 1600) : undefined;

    // 建構 Google Places Photo API URL
    let photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${clampedWidth}&photo_reference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
    
    if (clampedHeight) {
      photoUrl += `&maxheight=${clampedHeight}`;
    }

    // 取得照片
    const response = await fetch(photoUrl, {
      redirect: 'follow'
    });

    if (!response.ok) {
      // 回傳預設佔位圖（1x1 透明 PNG）
      const transparentPixel = new Uint8Array([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
        0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
        0x42, 0x60, 0x82
      ]);
      return new Response(transparentPixel, {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=300' // 錯誤時快取 5 分鐘
        }
      });
    }

    const contentType = response.headers.get('Content-Type') || 'image/jpeg';
    const imageBuffer = await response.arrayBuffer();

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=604800',
        'X-Photo-Source': 'google-places-api'
      }
    });

  } catch (error) {
    console.error('Place Photo API (GET) 錯誤:', error);
    return new Response(JSON.stringify({ 
      error: '伺服器內部錯誤',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
