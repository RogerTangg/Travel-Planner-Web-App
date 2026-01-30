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
你是一位專業的旅遊行程規劃師，請根據以下景點資訊，重新排序以獲得最佳的一日遊覽順序。

【景點清單】
${JSON.stringify(sanitizedSpots, null, 2)}

【排序原則 - 依優先順序】

1. 地理位置優化
   - 計算景點間的實際距離
   - 規劃最短路徑，減少來回折返
   - 考慮大眾交通的便利性

2. 時間順序邏輯
   - 早上：適合戶外景點、公園（人潮較少、光線佳）
   - 中午：安排用餐（餐廳、咖啡廳）
   - 下午：適合室內景點、博物館、購物
   - 傍晚：適合觀景台、購物、餐廳
   - 晚上：適合酒吧、飯店

3. 特殊類型處理
   - 通勤類型（車站）：適合作為起點或轉乘點
   - 飯店：必須放在最後
   - 餐廳：安排在合適的用餐時間點
   - 咖啡廳：適合作為休息點，穿插安排

4. 體力分配
   - 需要較多體力的景點安排在前半段
   - 輕鬆的購物、餐飲安排在後半段

【輸出要求】
- 回傳排序後的景點 ID 陣列
- 必須包含所有輸入的景點（不可遺漏）
- ID 必須與輸入完全相同（不可修改）
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
