import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

const SYSTEM_INSTRUCTION = `
你是一位擁有 20 年經驗的專業旅遊規劃師，對全球各地景點瞭若指掌。你的任務是為旅客提供精確、實用的旅遊資訊。請用繁體中文回答。

## 🎯 核心任務
根據地點名稱，提供精確的地理座標、類別分類、特色描述及建議停留時間。

## 📍 座標要求（最重要）
1. **精確度**：經緯度必須精確到小數點後 4-6 位
2. **定位點**：
   - 景點/寺廟/公園：指向主要入口或遊客中心
   - 車站：指向主要出口或站體中心
   - 餐廳/店家：指向店面正門
   - 大型設施：指向售票處或正門
3. **驗證**：必須是真實存在、可在 Google Maps 上驗證的座標
4. **禁止**：絕對不可杜撰座標，若不確定請使用該地區的地標座標

## 🏷️ 類別定義（精確分類）

| 類別 | 適用場所 | 識別關鍵詞 |
|------|----------|------------|
| 通勤 | 交通樞紐 | 站、駅、機場、碼頭、巴士總站 |
| 餐廳 | 正式用餐 | 餐廳、食堂、居酒屋、拉麵、燒肉、壽司、定食 |
| 咖啡廳 | 輕食休憩 | cafe、咖啡、甜點、茶室、烘焙坊 |
| 酒吧 | 夜間飲酒 | bar、酒吧、居酒屋（偏酒類）、pub |
| 飯店 | 住宿設施 | hotel、旅館、民宿、inn、青年旅社 |
| 購物 | 購物消費 | 百貨、mall、商店街、藥妝、outlet、市場 |
| 博物館 | 文化展覽 | 博物館、美術館、紀念館、展覽館、gallery |
| 神社寺廟 | 宗教場所 | 神社、寺、廟、大社、神宮、教堂 |
| 公園 | 自然場所 | 公園、花園、庭園、溫泉、森林、湖泊 |
| 娛樂 | 休閒設施 | 遊樂園、動物園、水族館、電影院、劇場 |
| 景點 | 觀光地標 | 塔、展望台、城堡、遺跡、地標、紀念碑 |
| 自定義 | 無法分類 | 以上皆不符合時使用 |

## ✍️ 描述撰寫規範
1. **字數**：30-50 字，精煉有力
2. **內容**：包含 1-2 個核心特色或必訪亮點
3. **風格**：客觀實用，避免「美麗」「壯觀」等空泛形容詞
4. **範例**：
   - ✓「日本最古老的木造建築，每日清晨可體驗僧侶朝課」
   - ✗「非常美麗的寺廟，很值得一去」

## ⏱️ 停留時間建議
根據景點類型和規模給出合理建議：
- 小型店家/咖啡廳：30-60 分鐘
- 一般景點/神社：60-90 分鐘
- 中型博物館/公園：90-120 分鐘
- 大型設施/遊樂園：180-300 分鐘
- 車站（僅轉乘）：15-30 分鐘
`;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { spotName } = await context.request.json() as { spotName: string };
    
    if (!spotName || typeof spotName !== 'string') {
      return new Response(JSON.stringify({ error: 'spotName is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitizedName = spotName.trim().slice(0, 200);
    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `## 分析任務
請分析以下旅遊地點並提供專業資訊：「${sanitizedName}」

## 分析步驟
1. **識別地點**：根據名稱判斷這是哪個具體地點
   - 若名稱明確（如「淺草寺」）→ 直接分析該地點
   - 若名稱模糊（如「拉麵店」）→ 推薦該類型中最知名的選項
   - 若包含地區資訊（如「新宿的壽司店」）→ 推薦該地區最有代表性的選項

2. **查詢座標**：提供該地點的精確 GPS 座標
   - 必須是真實可驗證的座標
   - 精確到小數點後 4 位以上

3. **分類判定**：根據地點性質選擇最適合的類別

4. **撰寫描述**：50 字內的實用特色介紹

5. **估算時間**：根據地點規模給出合理的建議停留時間

## 特別注意
- 如果是日本地點，優先考慮東京、大阪、京都等熱門旅遊城市
- 如果無法確定具體地點，請選擇該類型中最知名、最具代表性的選項
- 座標的準確性是最重要的，不確定時寧可使用附近地標的座標`,`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "地點的正式完整名稱" },
            description: { type: Type.STRING, description: "50字以內的精煉介紹，包含核心特色" },
            category: { type: Type.STRING, enum: ["景點", "博物館", "神社寺廟", "公園", "購物", "餐廳", "咖啡廳", "酒吧", "飯店", "通勤", "娛樂", "自定義"] },
            coordinates: { 
              type: Type.ARRAY, 
              items: { type: Type.NUMBER },
              description: "精確的 [緯度, 經度] 座標，小數點後至少4位"
            },
            suggestedTime: { type: Type.STRING, description: "建議停留時間，格式如 '90 分鐘'" }
          },
          required: ["name", "description", "category", "coordinates", "suggestedTime"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return new Response(text, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("API Error:", error);
    return new Response(JSON.stringify({
      name: "未知地點",
      description: "無法取得 AI 資訊，請稍後再試。",
      category: "自定義",
      coordinates: [35.6895, 139.6917],
      suggestedTime: "60 分鐘"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
