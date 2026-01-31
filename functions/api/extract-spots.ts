import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
  GOOGLE_MAPS_API_KEY: string;
}

interface ExtractedSpot {
  name: string;
  verifiedName?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  placeId?: string;
  verified: boolean;
}

interface ExtractResponse {
  spots: ExtractedSpot[];
  stats: {
    extracted: number;
    verified: number;
  };
}

/**
 * 從文字中提取景點，並透過 Google Places API 驗證
 * 
 * 流程：
 * 1. AI 從文字中提取地點名稱
 * 2. 使用 Google Places Text Search API 驗證並獲取完整資訊
 * 3. 返回驗證後的景點資料（包含地址、座標）
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { text } = await context.request.json() as { text: string };
    
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitizedText = text.trim().slice(0, 10000);
    
    // Step 1: 使用 AI 提取地點名稱
    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `你是一位專業的旅遊行程文字分析師。請從以下文字中提取所有旅遊相關的地點名稱。

## 📄 待分析內容
${sanitizedText}

## 🎯 提取任務
請仔細閱讀上述文字，逐行掃描，提取所有「可以在地圖上定位」的具體地點名稱。

## ✅ 應該提取的地點類型
1. **景點名稱**：寺廟、神社、城堡、塔、公園、展望台等（如：淺草寺、東京鐵塔、上野公園）
2. **車站/機場**：任何交通設施（如：新宿站、成田機場、東京駅）
3. **店家名稱**：有具體名字的餐廳、咖啡廳、商店（如：一蘭拉麵、藍瓶咖啡）
4. **商業設施**：百貨、商場、購物中心（如：澀谷109、SHIBUYA SKY）
5. **街道/商店街**：可逛的街道或區域（如：竹下通、仲見世通、心齋橋筋）
6. **市場**：傳統市場、魚市場（如：築地市場、黑門市場）
7. **住宿設施**：有具體名字的飯店、旅館

## ❌ 不應該提取
- 純粹的城市/區域名稱：東京、大阪、京都、新宿、澀谷、銀座
- 沒有具體名字的泛稱：餐廳、咖啡廳、便利商店、拉麵店
- 非地點的資訊：日期、時間、價格、人數

## 📝 名稱處理規則
1. **保持原文寫法**：原文寫「淺草寺」就是「淺草寺」，不要改成「浅草寺」或「金龍山淺草寺」
2. **完整提取**：原文寫「東京晴空塔」就提取「東京晴空塔」，不要拆成「東京」和「晴空塔」
3. **不要合併**：原文分開寫的地點不要合併成一個
4. **不要擴充**：原文寫「一蘭」就是「一蘭」，不要擴充成「一蘭拉麵」

## 📤 輸出要求
- 格式：JSON 字串陣列
- 順序：依原文出現順序
- 去重：完全相同的地點只保留一個
- 確保不遺漏任何一個可定位的地點`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "從文字中提取的地點名稱列表"
        }
      }
    });

    const output = response.text;
    if (!output) {
      return new Response(JSON.stringify({ spots: [], stats: { extracted: 0, verified: 0 } } as ExtractResponse), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const extractedNames = JSON.parse(output) as string[];
    const uniqueNames = [...new Set(extractedNames)].slice(0, 30);
    
    console.log('AI extracted spots:', uniqueNames);

    // Step 2: 使用 Google Places API 驗證每個地點
    const hasGoogleApi = !!context.env.GOOGLE_MAPS_API_KEY;
    
    if (!hasGoogleApi) {
      // 沒有 API Key，返回未驗證的結果
      const unverifiedSpots: ExtractedSpot[] = uniqueNames.map(name => ({
        name,
        verified: false
      }));
      
      return new Response(JSON.stringify({
        spots: unverifiedSpots,
        stats: { extracted: uniqueNames.length, verified: 0 }
      } as ExtractResponse), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 有 API Key，進行驗證
    const verifiedSpots = await verifyAndEnrichSpots(uniqueNames, context.env.GOOGLE_MAPS_API_KEY);
    
    return new Response(JSON.stringify({
      spots: verifiedSpots,
      stats: { 
        extracted: uniqueNames.length, 
        verified: verifiedSpots.filter(s => s.verified).length 
      }
    } as ExtractResponse), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

/**
 * 使用 Google Places API 驗證並獲取地點的完整資訊
 */
async function verifyAndEnrichSpots(names: string[], apiKey: string): Promise<ExtractedSpot[]> {
  const results: ExtractedSpot[] = [];
  
  for (const name of names) {
    try {
      // 使用 Places Text Search API
      const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(name)}&key=${apiKey}`;
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        console.error(`Places API error for ${name}:`, response.status);
        results.push({ name, verified: false });
        continue;
      }
      
      const data = await response.json() as any;
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const place = data.results[0];
        
        // 驗證成功：獲取 Places API 返回的標準名稱和詳細資訊
        results.push({
          name: name,  // 保留原始名稱
          verifiedName: place.name,  // Places API 返回的標準名稱
          address: place.formatted_address,
          coordinates: {
            lat: place.geometry?.location?.lat || 0,
            lng: place.geometry?.location?.lng || 0
          },
          placeId: place.place_id,
          verified: true
        });
        
        console.log(`✓ Verified: ${name} -> ${place.name}`);
      } else {
        // 驗證失敗：找不到匹配的地點
        console.log(`✗ Not found: ${name} (status: ${data.status})`);
        results.push({ name, verified: false });
      }
      
      // 避免 API rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`Error verifying ${name}:`, error);
      results.push({ name, verified: false });
    }
  }
  
  return results;
}