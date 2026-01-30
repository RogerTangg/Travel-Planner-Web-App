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
      contents: `你是一位專業的旅遊行程文字分析師。請從以下文字中「精確」提取旅遊景點名稱。

## ⚠️ 核心原則
1. **只提取文字中「明確出現」的地點名稱**
2. **不可自行推測、補充或創造任何地點**
3. **不可將一個地點拆分成多個**
4. **提取的名稱必須與原文完全一致**

## 📄 待分析內容
${sanitizedText}

## ✅ 應該提取（文字中明確出現的）
- 具體景點名稱：淺草寺、東京鐵塔、清水寺
- 具體店家名稱：一蘭拉麵、星巴克澀谷店
- 具體車站名稱：新宿站、東京駅
- 具體商業設施：澀谷109、SHIBUYA SKY
- 具體市場/商店街：築地市場、仲見世通

## ❌ 不應該提取
- **純地區/區域名**：東京、大阪、新宿、澀谷、銀座（除非是「銀座三越」這類完整店名）
- **模糊描述**：附近的餐廳、一家咖啡廳、某間店
- **類別泛稱**：拉麵店、居酒屋、便利商店（除非有具體店名）
- **非地點資訊**：時間、價格、交通方式、人數
- **重複地點**：同一地點只取一次
- **原文中沒有的地點**：絕對禁止自行添加

## 📝 判斷標準
問自己：「這個名稱在原文中是否『原封不動』地出現？」
- 是 → 提取
- 否 → 不提取

## 💡 範例

### 範例 1
原文：「早上從新宿站出發去明治神宮，中午在原宿的竹下通吃一蘭拉麵」
正確：["新宿站", "明治神宮", "竹下通", "一蘭拉麵"]
錯誤：["新宿站", "新宿", "明治神宮", "原宿", "竹下通", "一蘭拉麵", "一蘭拉麵原宿店"]
（「新宿」「原宿」是區域不是景點，「一蘭拉麵原宿店」原文沒這樣寫）

### 範例 2  
原文：「去東京玩，想去迪士尼和晴空塔」
正確：["迪士尼", "晴空塔"]
錯誤：["東京", "東京迪士尼樂園", "東京晴空塔", "迪士尼", "晴空塔"]
（「東京」是區域，其他名稱原文沒這樣寫）

## 📤 輸出要求
- 格式：JSON 字串陣列
- 順序：依原文出現順序
- 去重：相同地點只保留一個
- 數量：與原文中實際出現的地點數量一致`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "從文字中精確提取的地點名稱列表，只包含原文中明確出現的地點"
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
