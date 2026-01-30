import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { text } = await context.request.json() as { text: string };
    
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: 'text is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitizedText = text.trim().slice(0, 8000);
    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `你是一位擁有 20 年經驗的專業旅遊行程分析專家。你的任務是從文字中「完整無遺漏」地提取所有旅遊相關地點名稱，並確保提取的名稱足夠具體、完整，以便後續能精確定位。

## 🚨 最重要規則
1. **完整無遺漏**：必須提取文字中出現的「每一個」具體地點名稱
2. **名稱精確**：提取的名稱必須足夠具體，能夠唯一識別該地點

## 📄 待分析內容
${sanitizedText}

## 🎯 提取規則

### 名稱完整性要求（最重要）
提取時必須保留完整、可識別的名稱：

| 類型 | 正確提取 | 錯誤提取 |
|------|----------|----------|
| 車站 | 「新宿站」「東京駅」「渋谷駅」 | 「新宿」「東京」 |
| 寺廟 | 「淺草寺」「清水寺」「金閣寺」 | 「寺廟」「那間寺」 |
| 餐廳 | 「一蘭拉麵本店」「敘敘苑六本木店」 | 「拉麵店」「燒肉店」 |
| 商場 | 「澀谷109」「LaLaport豐洲」 | 「百貨公司」「商場」 |
| 連鎖店 | 「星巴克淺草店」「唐吉訶德新宿店」 | 「星巴克」「唐吉訶德」（除非文中只有品牌名） |

### 特殊處理規則
1. **連鎖品牌**：
   - 若文中有分店資訊 →「一蘭拉麵道頓堀店」
   - 若文中只有品牌名 →「一蘭拉麵」（保持原文）

2. **日文/英文名稱**：
   - 保留原文格式：「東京スカイツリー」「Tokyo Tower」「teamLab」
   - 不要翻譯或轉換

3. **複合地點**：
   - 「晴空塔」和「晴空塔城」是不同地點，都要提取
   - 「築地市場」和「築地場外市場」是不同地點，都要提取

### 必須提取的地點類型
- 交通：車站、機場、碼頭、巴士站
- 觀光：寺廟、神社、城堡、塔、展望台、公園、庭園
- 餐飲：餐廳、拉麵店、壽司店、咖啡廳、居酒屋（有具體店名的）
- 購物：百貨、商場、商店街、市場、藥妝店（有具體名稱的）
- 住宿：飯店、旅館、民宿（有具體名稱的）
- 娛樂：博物館、美術館、遊樂園、動物園、水族館

### 不要提取
- ❌ 純地區名：「東京」「大阪」「新宿區」「銀座」
- ❌ 模糊描述：「附近餐廳」「某間咖啡廳」「那家店」
- ❌ 非地點資訊：時間、價格、人數、交通方式

## 📤 輸出要求
- 格式：JSON 字串陣列
- 去重：相同地點只保留一個
- 順序：依文字中出現順序
- 上限：50 個

## ⚠️ 最終檢查
輸出前確認：
1. 每個地點名稱是否足夠具體？（能否在 Google Maps 搜尋到？）
2. 是否遺漏任何地點？
3. 名稱是否保留了原文的完整格式？`

## ⚠️ 最終檢查
輸出前請再次確認：
1. 是否逐行檢查了所有文字？
2. 是否有任何地點被遺漏？
3. 總數是否合理？（如果原文有明顯的多個地點，輸出也應該有對應數量）`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "從文字中提取的所有地點名稱，必須完整無遺漏"
        }
      }
    });

    const output = response.text;
    if (!output) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const spots = JSON.parse(output) as string[];
    // Remove duplicates and limit
    const uniqueSpots = [...new Set(spots)].slice(0, 50);
    return new Response(JSON.stringify(uniqueSpots), {
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
