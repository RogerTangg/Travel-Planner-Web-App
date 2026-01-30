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

    const sanitizedText = text.trim().slice(0, 5000);
    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: `請閱讀以下文字內容，並從中提取所有可能的「旅遊地點」、「餐廳名稱」或「車站名稱」。
      
      使用者提供的內容：
      """
      ${sanitizedText}
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
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const spots = JSON.parse(output) as string[];
    return new Response(JSON.stringify(spots.slice(0, 30)), {
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
