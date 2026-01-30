import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { text } = await context.request.json() as { text: string };
    
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitizedText = text.trim().slice(0, 8000);
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
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const spots = JSON.parse(output) as string[];
    // Remove duplicates and limit
    const uniqueSpots = [...new Set(spots)].slice(0, 50);
    return new Response(JSON.stringify(uniqueSpots), {
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
