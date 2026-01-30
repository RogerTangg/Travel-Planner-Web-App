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
      contents: `你是一位擁有 15 年經驗的專業旅遊行程分析專家，精通日本、台灣、韓國、歐美等地區的旅遊景點資訊。請從以下文字中精確提取所有旅遊相關地點。

## 📄 待分析內容
${sanitizedText}

## 🎯 提取目標（務必全面識別）

### 1. 交通設施（最高優先）
- 鐵路車站：JR、私鐵、地鐵站（如「新宿站」「東京駅」「渋谷駅」）
- 機場：國際機場、國內機場（如「成田機場」「羽田機場」）
- 碼頭、巴士總站、高速公路休息站

### 2. 觀光景點
- 歷史文化：寺廟、神社、城堡、歷史遺跡（如「淺草寺」「伏見稻荷大社」「大阪城」）
- 現代地標：展望台、塔樓、地標建築（如「東京鐵塔」「晴空塔」「101大樓」）
- 自然景觀：公園、花園、山岳、湖泊、海灘、溫泉（如「上野公園」「富士山」「箱根溫泉」）

### 3. 餐飲場所
- 餐廳：正式餐廳、拉麵店、居酒屋、燒肉店、壽司店
- 輕食：咖啡廳、甜點店、茶室、麵包店
- 小吃：屋台、美食街攤位
- 識別標誌：含有「〇〇食堂」「〇〇屋」「〇〇亭」「〇〇庵」等

### 4. 購物場所
- 百貨公司：如「伊勢丹」「高島屋」「LUMINE」
- 商店街：如「心齋橋筋」「竹下通」「仲見世通」
- 專賣店：藥妝店、電器行、免稅店（如「唐吉訶德」「BicCamera」）
- 市場：傳統市場、魚市場（如「築地市場」「黑門市場」）

### 5. 住宿設施
- 各類住宿：飯店、旅館、民宿、青年旅社、膠囊旅館
- 識別標誌：含有「Hotel」「Inn」「旅館」「民宿」等

### 6. 文化娛樂
- 博物館、美術館、展覽館（如「東京國立博物館」「teamLab」）
- 劇場、音樂廳、電影院
- 遊樂園、動物園、水族館（如「東京迪士尼樂園」「大阪環球影城」）

## ⚠️ 提取規則（嚴格遵守）

### 名稱標準化
1. **保留完整正式名稱**：「東京迪士尼樂園」✓「迪士尼」✗
2. **連鎖店保留分店資訊**：「星巴克淺草店」✓「星巴克」✗
3. **保留原文名稱**：優先使用中文，若原文為日文/英文則保留（如「teamLab Borderless」）
4. **去除修飾詞**：「美麗的淺草寺」→「淺草寺」

### 必須排除
- ❌ 純地理區域：「東京」「新宿區」「大阪市」「銀座」（但「銀座三越」✓）
- ❌ 模糊描述：「附近的餐廳」「某間咖啡廳」「好吃的店」
- ❌ 非地點資訊：時間、價格、人數、交通方式
- ❌ 活動名稱：「煙火大會」「祭典」（除非是特定場地）

## 📤 輸出要求
- 格式：JSON 字串陣列
- 去重：相同地點只保留一個
- 排序：依文字中出現順序排列
- 數量：最多 50 個地點`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "提取出的所有地點名稱列表"
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
