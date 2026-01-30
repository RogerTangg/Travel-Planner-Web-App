import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

interface SpotData {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  category: string;
  suggestedTime?: string;
}

interface DayData {
  id: string;
  title: string;
  spotsCount: number;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { unscheduledSpots, existingDays } = await context.request.json() as { 
      unscheduledSpots: SpotData[]; 
      existingDays: DayData[] 
    };
    
    if (!Array.isArray(unscheduledSpots) || unscheduledSpots.length === 0) {
      return new Response(JSON.stringify({ error: 'unscheduledSpots is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!Array.isArray(existingDays) || existingDays.length === 0) {
      return new Response(JSON.stringify({ error: 'existingDays is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitizedSpots = unscheduledSpots.slice(0, 50).map(s => ({
      id: String(s.id).slice(0, 50),
      name: String(s.name).slice(0, 200),
      coordinates: s.coordinates,
      category: String(s.category).slice(0, 20),
      suggestedTime: s.suggestedTime ? String(s.suggestedTime).slice(0, 20) : undefined
    }));

    const sanitizedDays = existingDays.slice(0, 14).map(d => ({
      dayId: String(d.id).slice(0, 50),
      title: String(d.title).slice(0, 50),
      currentSpotsCount: typeof d.spotsCount === 'number' ? Math.min(d.spotsCount, 20) : 0
    }));

    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });

    const prompt = `
你是一位專業的旅遊行程規劃師，擁有豐富的行程安排經驗。請根據以下資訊，智慧地將「待安排景點」分配到各個旅遊天數中。

【待安排景點】
${JSON.stringify(sanitizedSpots, null, 2)}

【可用天數】
${JSON.stringify(sanitizedDays, null, 2)}

【智慧分配原則 - 依優先順序】

1. 地理位置優先原則
   - 計算各景點之間的地理距離
   - 將地理位置相近的景點安排在同一天
   - 避免同一天內跨越過大的地理範圍

2. 時間效率原則
   - 根據 suggestedTime 計算每天總時間
   - 每天行程控制在 6-8 小時為佳，最多不超過 10 小時
   - 預留交通、休息、用餐時間（約 2-3 小時緩衝）

3. 類型多樣性原則
   - 避免同一天安排過多相同類型的景點
   - 例如：避免連續安排 3 個以上博物館
   - 餐廳、咖啡廳穿插在觀光景點之間

4. 動線順序原則
   - 同一天的景點應考慮合理遊覽順序
   - 早上適合戶外景點、公園
   - 下午適合室內景點、博物館
   - 傍晚適合購物、餐廳
   - 飯店類型安排在當天最後

5. 平均分配原則
   - 盡量將景點平均分配到各天
   - 避免某天過於密集、某天過於鬆散
   - 考慮現有行程中各天已有的景點數量

6. 特殊規則
   - 通勤類型（車站）: 適合作為一天的起點或中轉點
   - 飯店: 僅安排在入住當天，放在行程最後
   - 酒吧: 安排在當天較晚時段

【輸出要求】
- 必須使用景點的原始 ID（不可修改）
- 每個景點只能分配到一天
- 可以不分配所有景點（若無法合理安排）
- spotIds 陣列的順序應反映建議的遊覽順序
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              dayId: { type: Type.STRING, description: "天數 ID" },
              spotIds: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "分配到該天的景點 ID 列表，順序為建議遊覽順序"
              }
            },
            required: ["dayId", "spotIds"]
          },
          description: "各天的景點分配結果"
        }
      }
    });

    const text = response.text;
    if (!text) {
      return new Response(JSON.stringify([]), {
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
