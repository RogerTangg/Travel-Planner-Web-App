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
      contents: `你是一位擁有 20 年經驗的專業旅遊行程分析專家。你的任務是從文字中「完整無遺漏」地提取所有旅遊相關地點。

## 🚨 最重要規則
**必須提取文字中出現的「每一個」具體地點名稱，絕對不可遺漏任何一個！**
- 逐行、逐句仔細檢查文字
- 即使是看似不重要的小店、小景點也必須提取
- 如果不確定是否為地點，寧可提取也不要遺漏

## 📄 待分析內容
${sanitizedText}

## 🎯 必須提取的地點類型

### 交通設施
- 車站（JR站、私鐵站、地鐵站、新幹線站）
- 機場、碼頭、巴士站

### 觀光景點
- 寺廟、神社、教堂
- 城堡、古蹟、歷史建築
- 展望台、塔樓、地標建築
- 公園、花園、庭園
- 山、湖、海灘、溫泉、瀑布

### 餐飲場所
- 餐廳、食堂、拉麵店、壽司店、燒肉店、居酒屋
- 咖啡廳、茶館、甜點店、麵包店
- 小吃店、屋台、美食街攤位

### 購物場所
- 百貨公司、購物中心、商場
- 商店街、市場、魚市場
- 藥妝店、電器店、便利店（如有特定店名）
- 紀念品店、專賣店

### 住宿設施
- 飯店、旅館、民宿、青年旅社

### 娛樂設施
- 博物館、美術館、展覽館
- 遊樂園、動物園、水族館
- 劇場、電影院、音樂廳

## ✅ 提取範例
文字：「早上從新宿站出發，先去明治神宮參拜，然後到原宿竹下通逛街，中午在一蘭拉麵用餐，下午去澀谷109購物」
正確提取：["新宿站", "明治神宮", "竹下通", "一蘭拉麵", "澀谷109"]
（5個地點全部提取，一個都不能少）

## ❌ 不要提取
- 純地區名稱：「東京」「大阪」「新宿區」（但「新宿站」✓）
- 模糊描述：「附近餐廳」「某間店」
- 非地點：時間、價格、人數

## 📤 輸出格式
- JSON 字串陣列
- 去除重複
- 保持原文順序
- 上限 50 個

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
