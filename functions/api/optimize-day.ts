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
你是一位擁有 20 年經驗的專業旅遊行程規劃師。請將以下景點重新排序，規劃出最佳的一日遊覽路線。

## 📍 待排序景點清單
${JSON.stringify(sanitizedSpots, null, 2)}

## 🎯 排序目標
創造一條「省時省力、邏輯順暢、體驗最佳」的一日遊路線。

## 📐 排序演算法（按優先級執行）

### 第一優先：特殊類別固定位置
| 類別 | 位置規則 | 原因 |
|------|----------|------|
| 通勤/車站 | 第一個 | 旅程起點 |
| 飯店 | 最後一個 | 旅程終點 |

### 第二優先：時段邏輯（模擬真實旅遊節奏）
| 時段 | 適合類別 | 原因 |
|------|----------|------|
| 早上 08:00-12:00 | 神社寺廟、公園、戶外景點 | 人少、光線好、體力充沛 |
| 中午 12:00-14:00 | 餐廳 | 用餐時間 |
| 下午 14:00-17:00 | 博物館、室內景點、購物 | 避開日曬、逛街購物 |
| 傍晚 17:00-19:00 | 購物、咖啡廳、展望台 | 夕陽景觀、休息補充 |
| 晚上 19:00-21:00 | 餐廳 | 晚餐時間 |
| 夜間 21:00+ | 酒吧、夜景 | 夜間娛樂 |

### 第三優先：地理群聚（減少移動時間）
1. 計算所有景點的經緯度中心點
2. 將相近的景點（經緯度差 < 0.01，約 1 公里內）連續安排
3. 規劃路線時避免折返，採用「由北到南」或「由東到西」的掃描方式

### 第四優先：體力分配
- 戶外步行景點安排在上午（體力最充沛時）
- 需要久站的博物館/購物安排在下午（可以休息）
- 放鬆類活動（咖啡廳、溫泉）穿插作為休息點

## ⚠️ 嚴格規則
1. **必須包含所有景點** - 輸出的 ID 數量必須等於輸入數量
2. **使用原始 ID** - 不可修改或創造新的 ID
3. **不可重複** - 每個 ID 只能出現一次

## 📤 輸出格式
JSON 字串陣列，依最佳遊覽順序排列景點 ID。

範例輸出：["spot-1", "spot-3", "spot-2", "spot-4"]
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
