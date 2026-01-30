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
      contents: `你是一位專業的旅遊行程分析專家。請從以下文字中提取所有旅遊相關地點。

【待分析內容】
${sanitizedText}

【提取規則】
1. 提取範圍：
   - 景點：寺廟、神社、城堡、公園、展望台、地標建築
   - 交通：車站、機場（如「東京站」「新宿站」）
   - 餐飲：餐廳、咖啡廳、居酒屋、甜點店
   - 購物：百貨公司、商店街、藥妝店、市場、超市
   - 住宿：飯店、旅館、民宿
   - 文化：博物館、美術館、劇場
   - 娛樂：遊樂園、電影院、動物園
   - 自然：山、湖、溫泉、海灘

2. 名稱處理：
   - 保留完整名稱（「東京迪士尼樂園」而非「迪士尼」）
   - 連鎖店保留分店資訊（「星巴克淺草店」）
   - 優先使用中文或日文原名

3. 排除項目：
   - 純地理區域（如「東京」「大阪」）
   - 模糊描述（如「附近的咖啡廳」）
   - 時間、價格等非地點資訊

【輸出】JSON 字串陣列，不重複。`,
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
