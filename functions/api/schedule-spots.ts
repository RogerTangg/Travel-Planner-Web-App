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
      你是一位專業的旅遊行程規劃師。請將以下「待安排景點」分配到各個旅遊天數中。

      待安排景點：
      ${JSON.stringify(sanitizedSpots, null, 2)}

      可用天數：
      ${JSON.stringify(sanitizedDays, null, 2)}

      分配原則：
      1. 根據地理位置將鄰近的景點安排在同一天
      2. 考慮景點類型的合理搭配（例如：不要把多個博物館排在同一天）
      3. 考慮建議停留時間，每天總時間不宜超過 8-10 小時
      4. 餐廳、咖啡廳適合安排在觀光景點之間
      5. 飯店通常安排在行程最後
      6. 盡量平均分配到各天，避免某天行程過多

      請回傳每天要分配的景點 ID 陣列。
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
                description: "分配到該天的景點 ID 列表"
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
