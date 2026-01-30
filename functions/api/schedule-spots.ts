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
你是一位擁有 20 年經驗的專業旅遊行程規劃師，專精於日本旅遊規劃。請運用你的專業知識，將所有「待安排景點」智慧地分配到各個旅遊天數中。

## 📍 待安排景點資料
${JSON.stringify(sanitizedSpots, null, 2)}

## 📅 可用天數資料
${JSON.stringify(sanitizedDays, null, 2)}

## 🧠 智慧排程演算法（按優先級執行）

### 第一階段：地理群聚分析
1. 使用 Haversine 公式計算所有景點間的距離矩陣
2. 將距離 < 2km 的景點標記為「同區域群組」
3. 同一群組的景點優先安排在同一天
4. 計算各群組的地理中心點，用於跨天規劃

### 第二階段：時間預算計算
1. 解析每個景點的 suggestedTime（格式如："1.5 小時"、"2小時"、"90分鐘"）
2. 每天可用時間預算：8-10 小時（含交通）
3. 估算交通時間：同區域 15-30 分鐘，跨區域 45-90 分鐘
4. 確保每天不超時，並預留 1.5 小時用餐緩衝

### 第三階段：類型平衡分配
景點類型權重與特性：
- 景點/神社寺廟/公園：主要觀光，適合上午，每天 2-3 個為佳
- 博物館/美術館：需專注，每天最多 1-2 個，避免連續
- 餐廳：穿插在行程中，每天 1-2 間
- 咖啡廳：下午休息時段，每天 0-1 間
- 購物：下午或傍晚，每天最多 2 個地點
- 酒吧：僅限晚間最後行程
- 飯店：僅在入住日，放在當天最後
- 通勤/車站：作為當天起點或轉運中繼

### 第四階段：動線順序優化
每天行程的建議時間順序：
1. 07:00-09:00：通勤移動/車站出發
2. 09:00-12:00：戶外景點（神社、公園、街區）
3. 12:00-13:30：午餐（餐廳）
4. 13:30-17:00：室內景點（博物館、購物）
5. 15:00-16:00：咖啡廳休息（可選）
6. 17:00-19:00：購物/逛街
7. 19:00-21:00：晚餐（餐廳）
8. 21:00-23:00：酒吧/夜景（可選）
9. 最後：飯店 check-in

### 第五階段：負載均衡
1. 計算各天目前的景點數量（currentSpotsCount）
2. 優先分配到景點較少的天數
3. 目標：各天景點數量差異 ≤ 2
4. 若無法均衡，優先保證行程品質

## ⚠️ 強制規則
1. 必須使用景點的原始 ID（不可修改、不可創造）
2. 每個景點只能分配到一個天數（不可重複）
3. 必須分配所有景點（除非真的無法合理安排）
4. spotIds 陣列順序必須是當天建議的遊覽順序（時間先後）
5. 飯店類型只能安排在當天最後一個

## 📤 輸出格式
對於每一天，輸出：
- dayId: 使用提供的天數 ID
- spotIds: 該天的景點 ID 陣列，按遊覽順序排列
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
