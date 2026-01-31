import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
  GOOGLE_MAPS_API_KEY: string;
}

interface PlaceResult {
  name: string;
  address: string;
  placeId: string;
  coordinates: { lat: number; lng: number };
}

/**
 * 從 Google Maps 清單連結提取景點
 * 支援的連結格式：
 * - https://www.google.com/maps/placelists/list/...
 * - https://maps.app.goo.gl/...
 * - https://goo.gl/maps/...
 * - 分享的清單連結
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { url } = await context.request.json() as { url: string };
    
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'url is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 驗證是否為 Google Maps 相關連結
    const isGoogleMapsUrl = /^https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url);
    
    if (!isGoogleMapsUrl) {
      return new Response(JSON.stringify({ 
        error: '請提供有效的 Google Maps 連結',
        hint: '支援格式：Google Maps 清單分享連結、地點連結、或短網址'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 嘗試獲取頁面內容
    let pageContent = '';
    try {
      // 先嘗試展開短網址
      const expandedUrl = await expandShortUrl(url);
      
      // 從 URL 中提取有用的資訊
      const urlInfo = parseGoogleMapsUrl(expandedUrl || url);
      
      if (urlInfo.placeIds && urlInfo.placeIds.length > 0) {
        // 如果有 Place IDs，使用 Places API 獲取詳細資訊
        const places = await fetchPlaceDetails(urlInfo.placeIds, context.env.GOOGLE_MAPS_API_KEY);
        if (places.length > 0) {
          return new Response(JSON.stringify({
            spots: places.map(p => ({
              name: p.name,
              address: p.address,
              coordinates: p.coordinates,
              placeId: p.placeId
            })),
            source: 'places_api'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      // 嘗試抓取頁面內容
      const response = await fetch(expandedUrl || url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        }
      });
      
      if (response.ok) {
        pageContent = await response.text();
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      // 繼續使用 AI 分析 URL 本身
    }

    // 使用 AI 從頁面內容或 URL 提取景點名稱
    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });
    
    const prompt = pageContent 
      ? `你是一位專業的資料分析師。請從以下 Google Maps 頁面內容中提取所有景點/地點名稱。

## 頁面 URL
${url}

## 頁面內容（部分）
${pageContent.slice(0, 15000)}

## 提取規則
1. 提取所有具體的地點名稱（餐廳、景點、商店、車站等）
2. 忽略廣告、推薦、或無關的內容
3. 如果是清單頁面，提取清單中的所有地點
4. 如果是單一地點頁面，提取該地點名稱及附近推薦的地點
5. 保持原始名稱，不要翻譯或修改

## 輸出格式
返回 JSON 陣列，包含所有提取到的地點名稱。`
      : `你是一位 Google Maps URL 分析專家。請分析以下 Google Maps URL，推測並提取可能的地點資訊。

## URL
${url}

## 分析任務
1. 從 URL 結構中識別地點名稱、座標、或地點 ID
2. 如果 URL 包含編碼的地點名稱，請解碼
3. 如果 URL 包含座標，嘗試推測可能的地點名稱
4. 如果是清單連結，嘗試識別清單主題並推測可能包含的典型地點

## 輸出格式
返回 JSON 陣列，包含可能的地點名稱。如果無法確定，返回空陣列。`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "提取的地點名稱列表"
        }
      }
    });

    const text = response.text;
    if (!text) {
      return new Response(JSON.stringify({ spots: [], source: 'ai_extraction' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const spotNames = JSON.parse(text) as string[];
    const uniqueSpots = [...new Set(spotNames)].slice(0, 30);

    return new Response(JSON.stringify({ 
      spots: uniqueSpots.map(name => ({ name })),
      source: 'ai_extraction'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ 
      error: '處理 Google Maps 連結時發生錯誤',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * 展開短網址
 */
async function expandShortUrl(url: string): Promise<string | null> {
  if (!url.includes('goo.gl') && !url.includes('maps.app.goo.gl')) {
    return url;
  }
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual'
    });
    
    const location = response.headers.get('location');
    return location || url;
  } catch {
    return url;
  }
}

/**
 * 解析 Google Maps URL 結構
 */
function parseGoogleMapsUrl(url: string): { 
  placeIds: string[]; 
  coordinates?: { lat: number; lng: number };
  query?: string;
} {
  const result: { placeIds: string[]; coordinates?: { lat: number; lng: number }; query?: string } = {
    placeIds: []
  };

  try {
    const urlObj = new URL(url);
    
    // 嘗試提取 Place ID
    // 格式: /maps/place/.../@lat,lng,zoom/data=...!1s0x...:0x...
    const placeIdMatch = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/gi);
    if (placeIdMatch) {
      result.placeIds = placeIdMatch.map(m => m.replace('!1s', ''));
    }

    // 另一種 Place ID 格式
    const placeIdMatch2 = url.match(/place_id[=:]([A-Za-z0-9_-]+)/i);
    if (placeIdMatch2) {
      result.placeIds.push(placeIdMatch2[1]);
    }

    // 提取座標
    const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordMatch) {
      result.coordinates = {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
    }

    // 提取搜尋查詢
    const queryMatch = url.match(/\/maps\/place\/([^/@]+)/);
    if (queryMatch) {
      result.query = decodeURIComponent(queryMatch[1].replace(/\+/g, ' '));
    }

  } catch (e) {
    console.error('URL parsing error:', e);
  }

  return result;
}

/**
 * 使用 Places API 獲取地點詳細資訊
 */
async function fetchPlaceDetails(placeIds: string[], apiKey: string): Promise<PlaceResult[]> {
  const results: PlaceResult[] = [];
  
  for (const placeId of placeIds.slice(0, 10)) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry&key=${apiKey}`
      );
      
      if (response.ok) {
        const data = await response.json() as any;
        if (data.result) {
          results.push({
            name: data.result.name,
            address: data.result.formatted_address,
            placeId: placeId,
            coordinates: {
              lat: data.result.geometry?.location?.lat || 0,
              lng: data.result.geometry?.location?.lng || 0
            }
          });
        }
      }
    } catch (e) {
      console.error(`Error fetching place ${placeId}:`, e);
    }
  }
  
  return results;
}
