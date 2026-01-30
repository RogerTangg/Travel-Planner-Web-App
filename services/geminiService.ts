import { GoogleGenAI, Type } from "@google/genai";
import { Spot, SpotCategory, AIAnalysisResponse } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION_ANALYSIS = `
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

export const analyzeSpotWithAI = async (spotName: string): Promise<AIAnalysisResponse> => {
  try {
    const model = "gemini-3-flash-preview";
    
    const response = await ai.models.generateContent({
      model: model,
      contents: `分析這個旅遊地點：${spotName}。請根據地點名稱推測最可能的地理位置和類型。`,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION_ANALYSIS,
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
    
    return JSON.parse(text) as AIAnalysisResponse;

  } catch (error) {
    console.error("AI Analysis Error:", error);
    // Fallback data in case of error
    return {
      name: spotName,
      description: "無法取得 AI 資訊，請稍後再試。",
      category: "自定義",
      coordinates: [35.6895, 139.6917], // Default Tokyo coordinates
      suggestedTime: "60 分鐘"
    };
  }
};

export const optimizeDaySchedule = async (spots: Spot[]): Promise<string[]> => {
  if (spots.length < 2) return spots.map(s => s.id);

  try {
    const spotsData = spots.map(s => ({ id: s.id, name: s.name, coordinates: s.coordinates, category: s.category }));
    
    const prompt = `
      請重新排序以下東京旅遊行程，使其在交通路線上最順暢。
      只考慮地理位置的鄰近性和合理的旅遊邏輯（例如餐廳通常在中午或晚上，飯店通常在最後）。
      請回傳一個 JSON 陣列，只包含排序後的 ID 字串。
      
      地點清單: ${JSON.stringify(spotsData)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    if (!text) return spots.map(s => s.id);
    
    return JSON.parse(text) as string[];

  } catch (error) {
    console.error("AI Sorting Error:", error);
    return spots.map(s => s.id);
  }
};

export const extractSpotsFromText = async (text: string): Promise<string[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `請閱讀以下文字內容，並從中提取所有可能的「旅遊地點」、「餐廳名稱」或「車站名稱」。
      
      使用者提供的內容：
      """
      ${text}
      """

      請只回傳一個包含地點名稱字串的 JSON 陣列。忽略無關的文字描述或日期。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "地點名稱列表"
        }
      }
    });

    const output = response.text;
    if (!output) return [];
    
    return JSON.parse(output) as string[];

  } catch (error) {
    console.error("AI Extraction Error:", error);
    return [];
  }
};

export const scheduleUnscheduledSpots = async (
  unscheduledSpots: Spot[], 
  existingDays: { id: string; title: string; spotsCount: number }[]
): Promise<{ dayId: string; spotIds: string[] }[]> => {
  if (unscheduledSpots.length === 0) return [];

  try {
    const spotsData = unscheduledSpots.map(s => ({ 
      id: s.id, 
      name: s.name, 
      coordinates: s.coordinates, 
      category: s.category,
      suggestedTime: s.suggestedTime 
    }));
    
    const daysData = existingDays.map(d => ({
      dayId: d.id,
      title: d.title,
      currentSpotsCount: d.spotsCount
    }));
    
    const prompt = `
      你是一位專業的旅遊行程規劃師。請將以下「待安排景點」分配到各個旅遊天數中。

      待安排景點：
      ${JSON.stringify(spotsData, null, 2)}

      可用天數：
      ${JSON.stringify(daysData, null, 2)}

      分配原則：
      1. 根據地理位置將鄰近的景點安排在同一天
      2. 考慮景點類型的合理搭配（例如：不要把多個博物館排在同一天）
      3. 考慮建議停留時間，每天總時間不宜超過 8-10 小時
      4. 餐廳、咖啡廳適合安排在觀光景點之間
      5. 飯店通常安排在行程最後
      6. 盡量平均分配到各天，避免某天行程過多

      請回傳每天要分配的景點 ID 陣列。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { 
            type: Type.OBJECT,
            properties: {
              dayId: { type: Type.STRING, description: "天數 ID" },
              spotIds: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "分配到該天的景點 ID 列表"
              }
            },
            required: ["dayId", "spotIds"]
          },
          description: "各天的景點分配結果"
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as { dayId: string; spotIds: string[] }[];

  } catch (error) {
    console.error("AI Scheduling Error:", error);
    return [];
  }
};