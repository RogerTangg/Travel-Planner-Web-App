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
      contents: `你是一位專業的旅遊行程分析專家。請仔細閱讀以下文字內容，提取「所有」可能的旅遊相關地點。

【待分析內容】
"""
${sanitizedText}
"""

【提取規則 - 務必遵守】

1. 提取範圍（必須全部識別）：
   - 觀光景點：寺廟、神社、城堡、塔、公園、花園、展望台、遊樂園等
   - 交通設施：車站、機場、碼頭、巴士站（如「東京站」「羽田機場」）
   - 餐飲場所：餐廳、咖啡廳、居酒屋、小吃店、甜點店等
   - 購物場所：百貨公司、商店街、市場、藥妝店、超市等
   - 住宿設施：飯店、旅館、民宿等
   - 文化場所：博物館、美術館、展覽館、劇場等
   - 娛樂場所：電影院、遊戲中心、KTV、夜店等
   - 自然景觀：山、湖、海灘、溫泉等

2. 名稱處理規則：
   - 保留完整的地點名稱（如「東京迪士尼樂園」而非「迪士尼」）
   - 如有日文原名和中文譯名，優先使用較完整的版本
   - 連鎖店保留分店資訊（如「星巴克 淺草店」）
   - 移除時間、日期、價格等非地點資訊

3. 特殊情況處理：
   - 行程表格式：逐行檢查每個時段的地點
   - 列表格式：每個項目都要檢查
   - 段落描述：提取所有提及的地名
   - 模糊描述（如「附近的咖啡廳」）：忽略

4. 品質要求：
   - 寧可多提取，不可遺漏
   - 同一地點重複出現只計一次
   - 純地理區域名稱（如「東京」「大阪」）除非是目的地否則忽略

【輸出格式】
只回傳 JSON 字串陣列，每個元素是一個地點名稱。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "提取出的所有地點名稱列表"
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
