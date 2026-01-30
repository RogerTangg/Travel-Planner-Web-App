import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

// Security: Use Helmet for HTTP headers
app.use(helmet());

// Security: CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['POST'],
  allowedHeaders: ['Content-Type']
}));

// Security: Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Parse JSON bodies
app.use(express.json({ limit: '10kb' })); // Limit body size

// Initialize Gemini Client (API key stays on server)
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

// Input validation helper
const sanitizeInput = (input: string, maxLength: number = 200): string => {
  if (typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
};

const validateCoordinates = (coords: unknown): coords is [number, number] => {
  return Array.isArray(coords) && 
    coords.length === 2 && 
    typeof coords[0] === 'number' && 
    typeof coords[1] === 'number' &&
    coords[0] >= -90 && coords[0] <= 90 &&
    coords[1] >= -180 && coords[1] <= 180;
};

// System instructions (keep on server side)
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

// API Endpoints

// POST /api/analyze-spot
app.post('/api/analyze-spot', async (req, res) => {
  try {
    const spotName = sanitizeInput(req.body.spotName);
    
    if (!spotName) {
      return res.status(400).json({ error: 'spotName is required' });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
    if (!text) {
      throw new Error("No response from AI");
    }
    
    const result = JSON.parse(text);
    
    // Validate response
    if (!validateCoordinates(result.coordinates)) {
      result.coordinates = [35.6895, 139.6917]; // Default to Tokyo
    }
    
    res.json(result);

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      name: req.body.spotName || '未知地點',
      description: "無法取得 AI 資訊，請稍後再試。",
      category: "自定義",
      coordinates: [35.6895, 139.6917],
      suggestedTime: "60 分鐘"
    });
  }
});

// POST /api/optimize-day
app.post('/api/optimize-day', async (req, res) => {
  try {
    const spots = req.body.spots;
    
    if (!Array.isArray(spots) || spots.length < 2) {
      return res.status(400).json({ error: 'At least 2 spots required' });
    }

    // Validate and sanitize spots data
    const sanitizedSpots = spots.slice(0, 20).map((s: any) => ({
      id: sanitizeInput(s.id, 50),
      name: sanitizeInput(s.name),
      coordinates: validateCoordinates(s.coordinates) ? s.coordinates : null,
      category: sanitizeInput(s.category, 20)
    })).filter((s: any) => s.id && s.name);

    const prompt = `
      請重新排序以下旅遊行程，使其在交通路線上最順暢。
      只考慮地理位置的鄰近性和合理的旅遊邏輯（例如餐廳通常在中午或晚上，飯店通常在最後）。
      請回傳一個 JSON 陣列，只包含排序後的 ID 字串。
      
      地點清單: ${JSON.stringify(sanitizedSpots)}
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
    if (!text) {
      return res.json(sanitizedSpots.map((s: any) => s.id));
    }
    
    res.json(JSON.parse(text));

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/extract-spots
app.post('/api/extract-spots', async (req, res) => {
  try {
    const text = sanitizeInput(req.body.text, 5000);
    
    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

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
    if (!output) {
      return res.json([]);
    }
    
    const spots = JSON.parse(output) as string[];
    // Limit to 30 spots max
    res.json(spots.slice(0, 30));

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/schedule-spots
app.post('/api/schedule-spots', async (req, res) => {
  try {
    const { unscheduledSpots, existingDays } = req.body;
    
    if (!Array.isArray(unscheduledSpots) || unscheduledSpots.length === 0) {
      return res.status(400).json({ error: 'unscheduledSpots is required' });
    }
    
    if (!Array.isArray(existingDays) || existingDays.length === 0) {
      return res.status(400).json({ error: 'existingDays is required' });
    }

    // Sanitize input
    const sanitizedSpots = unscheduledSpots.slice(0, 50).map((s: any) => ({
      id: sanitizeInput(s.id, 50),
      name: sanitizeInput(s.name),
      coordinates: validateCoordinates(s.coordinates) ? s.coordinates : null,
      category: sanitizeInput(s.category, 20),
      suggestedTime: sanitizeInput(s.suggestedTime, 20)
    }));
    
    const sanitizedDays = existingDays.slice(0, 14).map((d: any) => ({
      dayId: sanitizeInput(d.id, 50),
      title: sanitizeInput(d.title, 50),
      currentSpotsCount: typeof d.spotsCount === 'number' ? Math.min(d.spotsCount, 20) : 0
    }));

    const prompt = `
      你是一位專業的旅遊行程規劃師。請將以下「待安排景點」分配到各個旅遊天數中。

      待安排景點：
      ${JSON.stringify(sanitizedSpots, null, 2)}

      可用天數：
      ${JSON.stringify(sanitizedDays, null, 2)}

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
    if (!text) {
      return res.json([]);
    }
    
    res.json(JSON.parse(text));

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});
