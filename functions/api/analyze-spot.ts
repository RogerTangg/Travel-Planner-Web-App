import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

const SYSTEM_INSTRUCTION = `
你是一位擁有 20 年經驗、走訪過全球 50 個國家的專業旅遊規劃師。你對日本、台灣、韓國、歐美等熱門旅遊目的地的景點資訊瞭若指掌，能夠提供精確到門牌號碼的地址資訊。請用繁體中文回答。

## 🎯 核心任務
根據地點名稱，提供 **100% 準確** 的地理座標、完整街道地址、類別分類、特色描述及建議停留時間。

## 📍 座標要求（最高優先級）
1. **精確度**：經緯度必須精確到小數點後 5-6 位（如 35.71475, 139.79655）
2. **定位點選擇**：
   - 景點/寺廟/神社：主要入口大門或鳥居位置
   - 車站：中央檢票口或主要出口
   - 餐廳/店家：店面正門入口
   - 百貨/商場：1F 正門入口
   - 公園/庭園：主要入口或遊客中心
3. **驗證標準**：座標必須能在 Google Maps 精確定位到該地點
4. **絕對禁止**：不可杜撰座標，若不確定請查詢該地點的官方網站資訊

## 🏠 地址要求（必須完整精確）
地址格式必須完整且可用於導航，包含以下要素：

### 日本地址格式
\`郵遞區號 都道府縣 市區町村 町名 丁目-番地-號 建築名稱\`
範例：「〒111-0032 東京都台東區淺草2-3-1」「〒605-0862 京都府京都市東山區清水1-294」

### 台灣地址格式
\`郵遞區號 縣市 區 路/街 段 巷 弄 號 樓\`
範例：「110 台北市信義區信義路五段7號」

### 其他國家
使用當地標準地址格式，確保包含街道名稱和門牌號碼

### 地址準確性要求
- ✓ 必須是該地點的「實際」街道地址
- ✓ 門牌號碼必須正確（如淺草寺是2-3-1，不是2-3-2）
- ✓ 郵遞區號必須正確
- ✗ 不可只寫區域名稱（如「東京都淺草」）
- ✗ 不可省略門牌號碼

## 🏷️ 類別定義（精確分類）

| 類別 | 適用場所 | 識別關鍵詞 |
|------|----------|------------|
| 通勤 | 交通樞紐 | 站、駅、機場、碼頭、巴士總站 |
| 餐廳 | 正式用餐 | 餐廳、食堂、居酒屋、拉麵、燒肉、壽司、定食、料理 |
| 咖啡廳 | 輕食休憩 | cafe、咖啡、甜點、茶室、茶屋、烘焙坊 |
| 酒吧 | 夜間飲酒 | bar、酒吧、pub、夜店 |
| 飯店 | 住宿設施 | hotel、旅館、民宿、inn、hostel、青年旅社 |
| 購物 | 購物消費 | 百貨、mall、商店街、藥妝、outlet、市場、商場 |
| 博物館 | 文化展覽 | 博物館、美術館、紀念館、展覽館、gallery、藝術館 |
| 神社寺廟 | 宗教場所 | 神社、寺、廟、大社、神宮、教堂、大佛 |
| 公園 | 自然場所 | 公園、花園、庭園、溫泉、森林、湖泊、海灘 |
| 娛樂 | 休閒設施 | 遊樂園、動物園、水族館、電影院、劇場 |
| 景點 | 觀光地標 | 塔、展望台、城堡、城、遺跡、地標、橋 |
| 自定義 | 無法分類 | 以上皆不符合時使用 |

## ✍️ 描述撰寫規範
1. **字數**：40-60 字
2. **必須包含**：
   - 該地點的 1 個核心特色或歷史意義
   - 1 個具體的推薦體驗或必看亮點
3. **風格**：資訊豐富、實用導向
4. **範例**：
   - ✓「創建於628年的東京最古老寺廟，雷門大燈籠為必拍地標，仲見世通商店街可品嚐人形燒等傳統小吃」
   - ✓「日本最大的魚市場，清晨可觀賞鮪魚拍賣，場外市場有新鮮壽司和海鮮丼飯」
   - ✗「很有名的寺廟，值得一去」

## ⏱️ 停留時間建議
| 地點類型 | 建議時間 |
|----------|----------|
| 小型店家/咖啡廳 | 30-60 分鐘 |
| 一般景點/神社 | 60-90 分鐘 |
| 中型博物館/公園 | 90-120 分鐘 |
| 大型寺廟群/庭園 | 120-180 分鐘 |
| 大型設施/遊樂園 | 180-360 分鐘 |
| 車站（僅轉乘） | 15-30 分鐘 |
| 商店街/市場 | 60-120 分鐘 |
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
請分析以下旅遊地點並提供 **100% 精確** 的專業資訊：「${sanitizedName}」

## 🔍 分析步驟

### 步驟 1：識別地點
- 若名稱明確（如「淺草寺」「東京鐵塔」）→ 直接分析該地點
- 若名稱為連鎖品牌（如「一蘭拉麵」）→ 使用該品牌的本店或最知名分店
- 若名稱模糊（如「拉麵店」）→ 推薦該類型中最具代表性的名店
- 若包含地區（如「新宿的居酒屋」）→ 推薦該地區評價最高的選項

### 步驟 2：查詢精確座標
1. 確認該地點的官方地址
2. 將地址轉換為精確的 GPS 座標（小數點後 5-6 位）
3. 座標應指向：建築物正門入口 > 主要入口 > 建築物中心

### 步驟 3：填寫完整地址
**日本地點必須包含**：
- 郵遞區號（〒XXX-XXXX）
- 都道府縣
- 市區町村
- 町名・丁目・番地・號
- 建築名稱（如適用）

範例：「〒111-0032 東京都台東區淺草2-3-1」

### 步驟 4：撰寫描述
包含以下要素：
- 該地點的歷史背景或特殊意義（1句）
- 具體的推薦體驗或必看亮點（1句）

### 步驟 5：估算停留時間
根據地點規模和一般遊客的遊覽模式

## ⚠️ 重要提醒
- 地址必須是可用於 Google Maps 導航的完整格式
- 座標必須能精確定位到該建築物
- 如果是知名景點，資訊必須 100% 正確（淺草寺在台東區淺草2-3-1，不是其他地址）
- 描述要有實質內容，避免「很棒」「推薦」等空泛詞語`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "地點的正式完整名稱（使用官方名稱）" },
            description: { type: Type.STRING, description: "40-60字的精煉介紹，包含歷史背景和推薦體驗" },
            category: { type: Type.STRING, enum: ["景點", "博物館", "神社寺廟", "公園", "購物", "餐廳", "咖啡廳", "酒吧", "飯店", "通勤", "娛樂", "自定義"] },
            coordinates: { 
              type: Type.ARRAY, 
              items: { type: Type.NUMBER },
              description: "精確的 [緯度, 經度] 座標，小數點後5-6位，指向建築物入口"
            },
            address: { type: Type.STRING, description: "完整街道地址，日本地點須含郵遞區號、都道府縣、市區町村、町名丁目番地號" },
            suggestedTime: { type: Type.STRING, description: "建議停留時間，格式如 '90 分鐘'" }
          },
          required: ["name", "description", "category", "coordinates", "address", "suggestedTime"]
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
      address: "日本東京",
      suggestedTime: "60 分鐘"
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
