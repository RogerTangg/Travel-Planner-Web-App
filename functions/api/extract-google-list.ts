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

interface RequestBody {
  url?: string;
  placeNames?: string[];  // 名稱列表（保留兼容）
  pastedContent?: string;  // 新增：貼上的頁面內容
  mode?: 'url' | 'names' | 'paste';  // 新增 paste 模式
}

/**
 * 從 Google Maps 清單連結、地點名稱列表或貼上內容提取景點
 * 
 * 支援三種模式：
 * 1. URL 模式：提供 Google Maps URL，嘗試提取地點
 * 2. 名稱模式：直接提供地點名稱列表，使用 Places API 搜尋
 * 3. 貼上模式：用戶貼上 Google Maps 頁面的完整內容，AI 提取地點名稱
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as RequestBody;
    const { url, placeNames, pastedContent, mode } = body;

    console.log('Request body:', JSON.stringify({ url, mode, hasContent: !!pastedContent, contentLength: pastedContent?.length }));

    // 模式 3：從貼上的內容提取地點（推薦模式）
    if (mode === 'paste' && pastedContent) {
      console.log('Mode: paste, content length:', pastedContent.length);

      if (!context.env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ 
          error: 'Gemini API Key 未設定，無法使用 AI 提取功能'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 使用 AI 從貼上的內容中提取地點名稱
      const extractedNames = await extractPlaceNamesFromContent(pastedContent, context.env.GEMINI_API_KEY);
      
      if (extractedNames.length === 0) {
        return new Response(JSON.stringify({ 
          error: '無法從貼上的內容中識別出任何地點名稱',
          hint: '請確保已在 Google Maps 清單頁面上使用 Ctrl+A 全選後再複製'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log('Extracted place names:', extractedNames);

      // 使用 Places API 搜尋每個地點的詳細資訊
      if (context.env.GOOGLE_MAPS_API_KEY) {
        const places = await searchMultiplePlaces(extractedNames, context.env.GOOGLE_MAPS_API_KEY);
        
        return new Response(JSON.stringify({
          spots: places.length > 0 
            ? places.map(p => ({
                name: p.name,
                address: p.address,
                coordinates: p.coordinates,
                placeId: p.placeId
              }))
            : extractedNames.map(name => ({ name })),
          source: places.length > 0 ? 'paste_with_places' : 'paste_names_only',
          extractedCount: extractedNames.length,
          foundCount: places.length
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // 沒有 API Key，只返回名稱
        return new Response(JSON.stringify({
          spots: extractedNames.map(name => ({ name })),
          source: 'paste_names_only',
          extractedCount: extractedNames.length
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 模式 2：直接從地點名稱搜尋（優先使用，因為更可靠）
    if (mode === 'names' || (placeNames && placeNames.length > 0)) {
      if (!placeNames || placeNames.length === 0) {
        return new Response(JSON.stringify({ error: '請提供地點名稱列表' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log('Mode: names, searching for:', placeNames);

      if (!context.env.GOOGLE_MAPS_API_KEY) {
        return new Response(JSON.stringify({ 
          error: 'Google Maps API Key 未設定',
          spots: placeNames.map(name => ({ name })),
          source: 'fallback'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // 使用 Places Text Search API 搜尋每個地點
      const places = await searchMultiplePlaces(placeNames, context.env.GOOGLE_MAPS_API_KEY);
      
      return new Response(JSON.stringify({
        spots: places.length > 0 
          ? places.map(p => ({
              name: p.name,
              address: p.address,
              coordinates: p.coordinates,
              placeId: p.placeId
            }))
          : placeNames.map(name => ({ name })),  // Fallback
        source: places.length > 0 ? 'places_text_search' : 'fallback',
        searchedCount: placeNames.length,
        foundCount: places.length
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 模式 1：從 URL 提取（原有邏輯）
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'url 或 placeNames 是必填的' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Mode: url, processing:', url);

    // 驗證是否為 Google Maps 相關連結
    const isGoogleMapsUrl = url.includes('maps.app.goo.gl') || 
                           url.includes('goo.gl/maps') ||
                           url.includes('goo.gl') ||
                           url.includes('google.com/maps') ||
                           url.includes('maps.google.com');
    
    if (!isGoogleMapsUrl) {
      return new Response(JSON.stringify({ 
        error: '請提供有效的 Google Maps 連結',
        hint: '支援格式：Google Maps 清單分享連結、地點連結、或短網址'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 展開短網址
    let expandedUrl = url;
    let pageContent = '';
    
    try {
      expandedUrl = await expandShortUrl(url);
      console.log('Expanded URL:', expandedUrl);
    } catch (e) {
      console.error('URL expansion error:', e);
    }

    // 從 URL 中提取有用的資訊
    const urlInfo = parseGoogleMapsUrl(expandedUrl);
    console.log('URL Info:', JSON.stringify(urlInfo));

    // 如果有 Place IDs，使用 Places API
    if (urlInfo.placeIds && urlInfo.placeIds.length > 0 && context.env.GOOGLE_MAPS_API_KEY) {
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

    // 如果 URL 包含地點名稱查詢，使用 Places API 搜尋
    if (urlInfo.query && context.env.GOOGLE_MAPS_API_KEY) {
      console.log('Searching for query:', urlInfo.query);
      const place = await searchPlaceByName(urlInfo.query, context.env.GOOGLE_MAPS_API_KEY);
      if (place) {
        return new Response(JSON.stringify({
          spots: [{
            name: place.name,
            address: place.address,
            coordinates: place.coordinates,
            placeId: place.placeId
          }],
          source: 'places_text_search'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      // Fallback: 返回原始查詢
      return new Response(JSON.stringify({
        spots: [{ name: urlInfo.query }],
        source: 'url_query'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 嘗試抓取頁面內容
    try {
      const response = await fetch(expandedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8,ja;q=0.7',
        },
        redirect: 'follow'
      });
      
      if (response.ok) {
        pageContent = await response.text();
        console.log('Page content length:', pageContent.length);
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
    }

    // 使用 AI 分析
    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });
    
    // 建立更詳細的 prompt
    const prompt = `你是一位 Google Maps 資料分析專家。請從以下資訊中提取所有景點/地點名稱。

## 原始 URL
${url}

## 展開後的 URL
${expandedUrl}

${pageContent ? `## 頁面內容
${pageContent.slice(0, 20000)}` : ''}

## 任務說明
1. 這是一個 Google Maps 清單分享連結或地點連結
2. 請從 URL 結構或頁面內容中識別所有地點名稱
3. 如果是清單連結，請嘗試從頁面內容中提取清單內的所有地點
4. 注意尋找類似這些模式的地點資訊：
   - JSON 中的 "name" 欄位
   - HTML 中的地點標題
   - URL 中編碼的地點名稱
   - 任何看起來像是店名、景點名、餐廳名的文字
5. 保持原始名稱語言，不要翻譯

## 輸出要求
返回一個 JSON 陣列，包含所有識別到的地點名稱字串。
如果確實無法識別任何地點，返回空陣列 []。
請只返回 JSON，不要有其他文字。`;

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
    console.log('AI response:', text);
    
    if (!text) {
      return new Response(JSON.stringify({ 
        spots: [], 
        source: 'ai_extraction',
        debug: { expandedUrl, hasContent: pageContent.length > 0 }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const spotNames = JSON.parse(text) as string[];
    const uniqueSpots = [...new Set(spotNames)].filter(name => name && name.trim()).slice(0, 30);

    // 如果有 API Key，使用 Places Text Search 獲取詳細資訊
    if (uniqueSpots.length > 0 && context.env.GOOGLE_MAPS_API_KEY) {
      console.log('Searching places with Text Search API for:', uniqueSpots);
      const places = await searchMultiplePlaces(uniqueSpots, context.env.GOOGLE_MAPS_API_KEY);
      
      if (places.length > 0) {
        return new Response(JSON.stringify({ 
          spots: places.map(p => ({
            name: p.name,
            address: p.address,
            coordinates: p.coordinates,
            placeId: p.placeId
          })),
          source: 'places_text_search'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Fallback: 只返回名稱
    return new Response(JSON.stringify({ 
      spots: uniqueSpots.map(name => ({ name: name.trim() })),
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
 * 展開短網址 - 支援多層重定向
 */
async function expandShortUrl(url: string): Promise<string> {
  // 如果不是短網址，直接返回
  if (!url.includes('goo.gl') && !url.includes('maps.app.goo.gl')) {
    return url;
  }
  
  let currentUrl = url;
  let maxRedirects = 5;
  
  while (maxRedirects > 0) {
    try {
      // 使用 GET 請求並手動處理重定向
      const response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      // 檢查是否有重定向
      const location = response.headers.get('location');
      
      if (location) {
        console.log(`Redirect: ${currentUrl} -> ${location}`);
        currentUrl = location;
        
        // 如果已經是完整的 Google Maps URL，停止
        if (location.includes('google.com/maps') && !location.includes('goo.gl')) {
          return location;
        }
        
        maxRedirects--;
      } else {
        // 沒有重定向了，檢查最終 URL
        if (response.url && response.url !== currentUrl) {
          return response.url;
        }
        return currentUrl;
      }
    } catch (e) {
      console.error('Redirect fetch error:', e);
      return currentUrl;
    }
  }
  
  return currentUrl;
}

/**
 * 解析 Google Maps URL 結構
 */
function parseGoogleMapsUrl(url: string): { 
  placeIds: string[]; 
  coordinates?: { lat: number; lng: number };
  query?: string;
  listId?: string;
} {
  const result: { 
    placeIds: string[]; 
    coordinates?: { lat: number; lng: number }; 
    query?: string;
    listId?: string;
  } = {
    placeIds: []
  };

  try {
    // 嘗試提取 Place ID - 多種格式
    // 格式1: !1s0x...:0x...
    const placeIdMatch1 = url.match(/!1s(0x[a-f0-9]+:0x[a-f0-9]+)/gi);
    if (placeIdMatch1) {
      result.placeIds.push(...placeIdMatch1.map(m => m.replace('!1s', '')));
    }

    // 格式2: place_id=...
    const placeIdMatch2 = url.match(/place_id[=:]([A-Za-z0-9_-]+)/gi);
    if (placeIdMatch2) {
      result.placeIds.push(...placeIdMatch2.map(m => m.replace(/place_id[=:]/i, '')));
    }

    // 格式3: ChIJ... (新版 Place ID)
    const placeIdMatch3 = url.match(/ChIJ[A-Za-z0-9_-]+/g);
    if (placeIdMatch3) {
      result.placeIds.push(...placeIdMatch3);
    }

    // 提取座標
    const coordMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordMatch) {
      result.coordinates = {
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2])
      };
    }

    // 提取搜尋查詢 - 從 /place/ 路徑
    const placeMatch = url.match(/\/maps\/place\/([^/@?]+)/);
    if (placeMatch) {
      result.query = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
    }

    // 提取搜尋查詢 - 從 /search/ 路徑
    const searchMatch = url.match(/\/maps\/search\/([^/@?]+)/);
    if (searchMatch) {
      result.query = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
    }

    // 提取清單 ID
    const listMatch = url.match(/\/placelists\/list\/([^/?]+)/);
    if (listMatch) {
      result.listId = listMatch[1];
    }

    // 從 data 參數提取更多資訊
    const dataMatch = url.match(/data=([^&]+)/);
    if (dataMatch) {
      const data = decodeURIComponent(dataMatch[1]);
      // 嘗試從 data 中提取地點名稱
      const nameMatch = data.match(/!2s([^!]+)/);
      if (nameMatch && !result.query) {
        result.query = decodeURIComponent(nameMatch[1]);
      }
    }

    // 去重
    result.placeIds = [...new Set(result.placeIds)];

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
        console.log('Place Details response:', JSON.stringify(data));
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

/**
 * 使用 Places Text Search API 搜尋地點名稱
 */
async function searchPlaceByName(name: string, apiKey: string): Promise<PlaceResult | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&key=${apiKey}`
    );
    
    if (response.ok) {
      const data = await response.json() as any;
      console.log('Text Search response for', name, ':', data.status);
      
      if (data.results && data.results.length > 0) {
        const place = data.results[0];
        return {
          name: place.name,
          address: place.formatted_address,
          placeId: place.place_id,
          coordinates: {
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0
          }
        };
      }
    }
  } catch (e) {
    console.error(`Error searching place ${name}:`, e);
  }
  
  return null;
}

/**
 * 批次搜尋多個地點名稱
 */
async function searchMultiplePlaces(names: string[], apiKey: string): Promise<PlaceResult[]> {
  const results: PlaceResult[] = [];
  
  // 限制並行請求數量
  for (const name of names.slice(0, 15)) {
    const place = await searchPlaceByName(name, apiKey);
    if (place) {
      results.push(place);
    }
    // 小延遲避免 rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

/**
 * 使用 AI 從貼上的頁面內容中提取地點名稱
 */
async function extractPlaceNamesFromContent(content: string, apiKey: string): Promise<string[]> {
  const ai = new GoogleGenAI({ apiKey });
  
  // 清理內容，移除過多的空白和特殊字符
  const cleanedContent = content
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, '\n')
    .trim()
    .slice(0, 50000);  // 限制長度

  const prompt = `你是一位地點資訊提取專家。以下是用戶從 Google Maps 清單頁面複製貼上的內容。

## 任務
請從中識別並提取所有「地點名稱」（景點、餐廳、商店、酒店等任何地點）。

## 重要規則
1. 只提取實際的地點名稱，不要提取：
   - 評分（如 4.5）
   - 類別（如「餐廳」、「咖啡廳」）
   - 導航指示（如「路線」、「前往」）
   - 時間資訊（如「營業中」、「週一」）
   - 按鈕文字（如「更多」、「儲存」）
   - Google Maps UI 元素
2. 保持原始語言，不要翻譯
3. 去除重複的名稱
4. 如果某個文字既像地點名也像類別，傾向於認為它是地點名

## 貼上的內容
${cleanedContent}

## 輸出格式
返回一個 JSON 字串陣列，每個元素是一個地點名稱。
例如：["東京晴空塔", "淺草寺", "上野公園"]
如果無法識別任何地點，返回空陣列 []。`;

  try {
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
    console.log('AI extraction response:', text);
    
    if (!text) {
      return [];
    }

    const names = JSON.parse(text) as string[];
    // 去重並過濾空值
    return [...new Set(names)]
      .filter(name => name && name.trim() && name.length > 1)
      .slice(0, 30);  // 限制最多 30 個
  } catch (e) {
    console.error('AI extraction error:', e);
    return [];
  }
}
