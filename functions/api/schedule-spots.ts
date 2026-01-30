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
你是一位擁有 20 年經驗的專業旅遊行程規劃師。你的任務是將「所有」待安排景點智慧地分配到各個旅遊天數中，並為每個景點安排具體的開始時間。

## 📍 待安排景點清單（必須全部分配）
${JSON.stringify(sanitizedSpots, null, 2)}

## 📅 可用天數
${JSON.stringify(sanitizedDays, null, 2)}

## ⚡ 核心要求（最高優先級）
1. **必須分配所有景點** - 每個景點都必須被分配到某一天
2. **必須安排開始時間** - 每個景點都必須有具體的 startTime（格式 HH:MM）
3. **使用原始 ID** - spotIds 必須使用上方景點清單中的原始 id 值

## 🧠 排程邏輯

### 時段安排（必須遵守）
根據景點類別分配合適的時段：
- 通勤/車站：08:00-09:00（當天起點）
- 神社寺廟/公園/景點：09:00-12:00（戶外活動）
- 餐廳（午餐）：12:00-13:30
- 博物館/購物：14:00-17:00（室內活動）
- 咖啡廳：15:00-16:00（下午休息）
- 購物：17:00-19:00（傍晚）
- 餐廳（晚餐）：19:00-20:30
- 酒吧：21:00-22:30（晚間）
- 飯店：22:00-23:00（最後）

### 地理群聚
- 經緯度差異 < 0.02 的景點安排在同一天
- 同區域景點連續安排以減少交通時間

### 負載均衡
- 每天 4-6 個景點為佳
- 優先分配到景點較少的天數

## 📤 輸出格式
返回 JSON 陣列，每個元素包含：
- dayId: 天數 ID
- spots: 景點陣列，每個景點包含：
  - id: 景點 ID
  - startTime: 開始時間（格式 "HH:MM"，如 "09:00"）

**重要：必須確保所有 ${sanitizedSpots.length} 個景點都被分配並有開始時間！**
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
              spots: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "景點 ID" },
                    startTime: { type: Type.STRING, description: "開始時間，格式 HH:MM" }
                  },
                  required: ["id", "startTime"]
                },
                description: "分配到該天的景點列表，含開始時間"
              }
            },
            required: ["dayId", "spots"]
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
