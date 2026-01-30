import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

const SYSTEM_INSTRUCTION = `
你是專業旅遊規劃師，請用繁體中文回答。

【任務】根據地點名稱提供精確的旅遊資訊。

【座標要求】
- 提供精確到小數點後 4 位的經緯度
- 指向地點主要入口或中心位置
- 必須是真實存在的座標

【類別定義】
- '通勤': 車站、機場、碼頭等交通設施
- '餐廳': 正式用餐場所（餐廳、居酒屋、拉麵店）
- '咖啡廳': 輕食場所（咖啡廳、甜點店、茶室）
- '酒吧': 夜間飲酒場所
- '飯店': 住宿設施
- '購物': 購物場所（百貨、商店街、藥妝店）
- '博物館': 文化展覽場所
- '神社寺廟': 宗教建築
- '公園': 自然場所（公園、花園、溫泉）
- '娛樂': 遊樂設施（遊樂園、電影院、動物園）
- '景點': 地標建築、展望台、歷史遺跡
- '自定義': 不屬於上述類別

【描述要求】
- 50 字以內
- 包含核心特色或亮點
- 避免空泛形容詞
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
      contents: `請分析以下旅遊地點並提供專業資訊：「${sanitizedName}」

請根據地點名稱推測最可能的地理位置、類型和特色。如果是知名景點，請提供精確座標；如果是通用描述，請推薦該類型中最具代表性的選項。`,
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
