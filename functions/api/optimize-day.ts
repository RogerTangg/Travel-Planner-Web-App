import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

interface SpotData {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  category: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { spots } = await context.request.json() as { spots: SpotData[] };
    
    if (!Array.isArray(spots) || spots.length < 2) {
      return new Response(JSON.stringify({ error: 'At least 2 spots required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitizedSpots = spots.slice(0, 20).map(s => ({
      id: String(s.id).slice(0, 50),
      name: String(s.name).slice(0, 200),
      coordinates: s.coordinates,
      category: String(s.category).slice(0, 20)
    }));

    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });

    const prompt = `
你是專業旅遊規劃師，請將以下景點重新排序以獲得最佳一日遊覽順序。

【景點清單】
${JSON.stringify(sanitizedSpots, null, 2)}

【排序原則】
1. 地理優化：相近景點連續安排，減少折返
2. 時段邏輯：
   - 早上→戶外景點、公園、神社
   - 中午→餐廳
   - 下午→博物館、購物、室內景點
   - 傍晚→購物、咖啡廳
   - 晚間→餐廳、酒吧
3. 特殊處理：
   - 通勤/車站→起點或轉乘點
   - 飯店→必須放最後
   - 餐廳→穿插在用餐時間

【輸出】排序後的景點 ID 陣列，必須包含所有景點。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "排序後的地點 ID 列表"
        }
      }
    });

    const text = response.text;
    if (!text) {
      return new Response(JSON.stringify(sanitizedSpots.map(s => s.id)), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(text, {
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
