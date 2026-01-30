import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

const SYSTEM_INSTRUCTION = `
你是一位專業的旅遊嚮導，熟悉世界各地的旅遊景點。
使用繁體中文回答。
當使用者輸入地點名稱時，請回傳該地點的詳細資訊。
請提供精確或大約的經緯度座標。

關於類別 (Category) 的嚴格定義：
- '通勤': 包含地鐵站、JR 車站、新幹線、機場、巴士總站等交通設施。
- '餐廳': 包含餐廳、居酒屋、拉麵店、壽司店、燒肉店等正式用餐場所。
- '咖啡廳': 包含咖啡廳、甜點店、茶室、下午茶等輕食場所。
- '酒吧': 包含酒吧、居酒屋、夜店等夜間娛樂場所。
- '飯店': 包含飯店、旅館、民宿、膠囊旅館等住宿設施。
- '購物': 包含百貨公司、購物中心、商店街、藥妝店、便利商店、市場等購物場所。
- '博物館': 包含美術館、博物館、展覽館、科學館等文化場所。
- '神社寺廟': 包含神社、寺廟、教堂、宗教建築等宗教場所。
- '公園': 包含公園、花園、自然景觀、海灘等自然場所。
- '娛樂': 包含遊樂園、電影院、卡拉OK、電玩城、動物園、水族館等娛樂場所。
- '景點': 其他觀光勝地、地標、展望台等不屬於上述類別的觀光景點。
- '自定義': 不屬於上述任何類別的地點。

關於建議時間 (Suggested Time)：
- 請盡量以「分鐘」為單位提供估計值，例如 "60 分鐘"、"90 分鐘"、"120 分鐘"。
- 若為純交通點，預設 "30 分鐘"。
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
      model: "gemini-2.5-flash-lite",
      contents: `分析這個旅遊地點：${sanitizedName}。請根據地點名稱推測最可能的地理位置和類型。`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "地點的正式名稱" },
            description: { type: Type.STRING, description: "50字以內的簡短介紹" },
            category: { type: Type.STRING, enum: ["景點", "博物館", "神社寺廟", "公園", "購物", "餐廳", "咖啡廳", "酒吧", "飯店", "通勤", "娛樂", "自定義"] },
            coordinates: { 
              type: Type.ARRAY, 
              items: { type: Type.NUMBER },
              description: "緯度 (Latitude) 和 經度 (Longitude)"
            },
            suggestedTime: { type: Type.STRING, description: "建議停留時間，例如 '90 分鐘'" }
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
