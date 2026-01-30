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
你是一位擁有 20 年經驗的專業旅遊行程規劃師。你的任務是將「所有」待安排景點智慧地分配到各個旅遊天數中。

## 📍 待安排景點清單（必須全部分配）
${JSON.stringify(sanitizedSpots, null, 2)}

## 📅 可用天數
${JSON.stringify(sanitizedDays, null, 2)}

## ⚡ 核心要求（最高優先級）
1. **必須分配所有景點** - 每個景點都必須被分配到某一天，不可遺漏任何景點
2. **使用原始 ID** - spotIds 必須使用上方景點清單中的原始 id 值
3. **不可重複分配** - 每個景點只能出現在一天中

## 🧠 排程邏輯

### 地理群聚（同區域景點安排在同一天）
- 經緯度差異 < 0.02（約2公里）的景點視為同區域
- 同區域景點優先安排在同一天以減少交通時間

### 每日時段安排順序
1. 上午 (09:00-12:00)：通勤/車站出發 → 戶外景點（神社、公園）
2. 中午 (12:00-14:00)：餐廳午餐
3. 下午 (14:00-17:00)：博物館/購物/室內景點
4. 傍晚 (17:00-19:00)：購物/咖啡廳
5. 晚間 (19:00-21:00)：餐廳晚餐 → 酒吧
6. 最後：飯店（必須放在當天最後）

### 類型分配建議
- 每天 2-4 個主要景點
- 每天 1-2 間餐廳（午餐+晚餐）
- 咖啡廳作為休息點，每天 0-1 間
- 購物安排在下午或傍晚
- 酒吧僅限晚間
- 飯店僅在入住日，放最後

### 負載均衡
- 根據 currentSpotsCount 優先分配到景點較少的天數
- 目標：各天景點數量差異 ≤ 2

## 📤 輸出格式
返回 JSON 陣列，每個元素包含：
- dayId: 天數 ID（使用提供的 dayId）
- spotIds: 該天的景點 ID 陣列，按遊覽順序排列

**重要提醒：必須確保所有 ${sanitizedSpots.length} 個景點都被分配！**
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
