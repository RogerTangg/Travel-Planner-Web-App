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
      請重新排序以下旅遊行程，使其在交通路線上最順暢。
      只考慮地理位置的鄰近性和合理的旅遊邏輯（例如餐廳通常在中午或晚上，飯店通常在最後）。
      請回傳一個 JSON 陣列，只包含排序後的 ID 字串。
      
      地點清單: ${JSON.stringify(sanitizedSpots)}
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
