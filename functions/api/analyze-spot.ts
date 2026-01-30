import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

const SYSTEM_INSTRUCTION = `
你是一位資深專業旅遊規劃師，擁有豐富的全球旅遊知識和當地文化背景。
你的回答必須使用繁體中文，用詞專業且精確。

【任務】
根據使用者輸入的地點名稱，提供詳細且專業的旅遊資訊。

【地點解析規則】
1. 優先識別知名景點、餐廳、店家的官方名稱
2. 如為簡稱或暱稱，請還原為完整正式名稱
3. 如地點有多個同名分店，請推測最知名或主要的分店位置
4. 對於模糊描述（如「東京的咖啡廳」），請提供該地區最具代表性的選項

【座標精確度要求】
- 必須提供精確到小數點後4位的經緯度座標
- 座標應指向地點的主要入口或建築中心
- 若為大型景點，指向遊客服務中心或正門

【類別分類嚴格定義】
- '通勤': 地鐵站、JR車站、新幹線站、機場、巴士總站、渡輪碼頭等交通設施
- '餐廳': 餐廳、居酒屋、拉麵店、壽司店、燒肉店、定食屋等正式用餐場所
- '咖啡廳': 咖啡廳、甜點店、茶室、下午茶、麵包店等輕食場所
- '酒吧': 酒吧、夜店、酒館、雞尾酒吧等夜間飲酒場所
- '飯店': 飯店、旅館、民宿、膠囊旅館、青年旅社等住宿設施
- '購物': 百貨公司、購物中心、商店街、藥妝店、超市、市場、精品店等購物場所
- '博物館': 美術館、博物館、展覽館、科學館、紀念館、藝廊等文化場所
- '神社寺廟': 神社、寺廟、教堂、清真寺、宗教建築等宗教場所
- '公園': 公園、花園、自然景觀、海灘、溫泉、登山步道等自然場所
- '娛樂': 遊樂園、電影院、劇場、卡拉OK、電玩城、動物園、水族館等娛樂場所
- '景點': 地標建築、展望台、歷史遺跡、紀念碑、著名街區等觀光景點
- '自定義': 不屬於上述任何類別的地點

【建議停留時間評估標準】
- 交通站點: 15-30 分鐘
- 咖啡廳、小吃店: 30-60 分鐘
- 餐廳: 60-90 分鐘
- 小型商店、神社: 30-60 分鐘
- 博物館、美術館: 90-180 分鐘
- 大型購物中心: 120-240 分鐘
- 主題樂園: 240-480 分鐘
- 需根據實際規模和內容調整

【描述撰寫要求】
- 50字以內的精煉介紹
- 必須包含地點的核心特色或亮點
- 避免使用「著名」「知名」等空泛形容詞
- 可提及招牌商品、建築特色或必看亮點
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
