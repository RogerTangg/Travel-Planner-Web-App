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
你是一位擁有 20 年經驗、規劃過超過 10,000 個旅遊行程的專業旅遊規劃師。你的任務是將所有待安排景點智慧地分配到各個旅遊天數中，創造出完美的多日遊行程。

## 📍 待安排景點清單（共 ${sanitizedSpots.length} 個，必須全部分配）
${JSON.stringify(sanitizedSpots, null, 2)}

## 📅 可用天數（共 ${sanitizedDays.length} 天）
${JSON.stringify(sanitizedDays, null, 2)}

## ⚡ 絕對規則（違反將導致失敗）
1. **100% 分配率** - 每個景點都必須被分配到某一天，不可遺漏任何景點
2. **必須有開始時間** - 每個景點都必須有 startTime（格式 "HH:MM"，24小時制）
3. **使用原始 ID** - 必須使用景點清單中的原始 id 值，不可修改
4. **不可重複** - 同一景點只能分配到一天

## 🧠 智慧排程演算法

### 步驟 1：地理群聚分析
1. 計算所有景點的經緯度
2. 將地理位置相近的景點（經緯度差 < 0.03，約 3 公里內）標記為「同區域」
3. 同區域的景點應優先安排在同一天

### 步驟 2：天數分配策略
| 條件 | 分配策略 |
|------|----------|
| 景點數 ≤ 天數×4 | 每天平均 3-4 個景點 |
| 景點數 ≤ 天數×6 | 每天平均 4-6 個景點 |
| 景點數 > 天數×6 | 先填滿每天 6 個，剩餘分配到最後幾天 |
| 某天已有景點 | 優先補滿該天至 4-6 個 |

### 步驟 3：時段分配規則（嚴格遵守）

根據景點類別分配合適的開始時間：

| 類別 | 建議時段 | 具體時間範例 | 原因 |
|------|----------|--------------|------|
| 通勤 | 早上出發 | 08:00-09:00 | 當天行程起點 |
| 神社寺廟 | 上午 | 09:00-10:30 | 人少清靜、適合參拜 |
| 公園 | 上午 | 09:30-11:00 | 天氣涼爽、光線適合拍照 |
| 景點 | 上午~中午 | 10:00-12:00 | 主要觀光時段 |
| 餐廳(午) | 中午 | 12:00-13:30 | 午餐時間 |
| 博物館 | 下午 | 14:00-16:00 | 避開戶外高溫、適合室內 |
| 購物 | 下午~傍晚 | 15:00-18:00 | 商店營業時間、可以慢慢逛 |
| 咖啡廳 | 下午 | 15:00-16:30 | 下午茶休息時間 |
| 娛樂 | 全天皆可 | 10:00-17:00 | 根據設施營業時間 |
| 餐廳(晚) | 晚上 | 18:30-20:00 | 晚餐時間 |
| 酒吧 | 深夜 | 21:00-23:00 | 夜間娛樂 |
| 飯店 | 最後 | 21:00-22:00 | 返回住宿、結束當天 |

### 步驟 4：單日行程優化
在分配完景點到各天後，對每天的行程進行優化：
1. 將同一天的景點依時段順序排列
2. 同時段的景點依地理位置排列（減少移動）
3. 餐廳穿插在正餐時段（午餐 12:00-13:30，晚餐 18:30-20:00）
4. 飯店類別必須放在該天最後

### 步驟 5：時間間隔檢查
- 確保同一天相鄰景點的時間間隔至少 30 分鐘
- 根據 suggestedTime 調整時間間隔（如「90 分鐘」則下一景點至少 90 分鐘後）

## 📤 輸出格式
返回 JSON 陣列，結構如下：
\`\`\`json
[
  {
    "dayId": "day-1",
    "spots": [
      { "id": "spot-abc123", "startTime": "09:00" },
      { "id": "spot-def456", "startTime": "12:00" }
    ]
  }
]
\`\`\`

## ✅ 最終檢查清單
- [ ] 所有 ${sanitizedSpots.length} 個景點都已分配
- [ ] 每個景點都有 startTime
- [ ] 時間格式為 "HH:MM"
- [ ] 同一天的景點時間不重疊
- [ ] 飯店類別放在當天最後
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
