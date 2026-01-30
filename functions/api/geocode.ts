import { GoogleGenAI, Type } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { address } = await context.request.json() as { address: string };
    
    if (!address || typeof address !== 'string') {
      return new Response(JSON.stringify({ error: 'address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sanitizedAddress = address.trim().slice(0, 500);
    const ai = new GoogleGenAI({ apiKey: context.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `你是一位專業的地理定位專家。請根據以下地址提供精確的 GPS 座標。

## 地址
${sanitizedAddress}

## 任務
1. 解析地址，識別國家、城市、區域、街道等資訊
2. 提供該地址的精確經緯度座標
3. 如果地址不完整或模糊，請根據可用資訊推測最可能的位置
4. 座標必須精確到小數點後 4-6 位

## 注意事項
- 如果是日本地址，注意日本地址格式（從大到小：都道府縣 → 市區町村 → 丁目番地）
- 如果地址包含知名地標或店家名稱，可以直接定位到該地點
- 如果完全無法識別，返回該國家/地區的主要城市中心座標`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER, description: "緯度，小數點後至少4位" },
            lng: { type: Type.NUMBER, description: "經度，小數點後至少4位" },
            formattedAddress: { type: Type.STRING, description: "標準化的完整地址格式" }
          },
          required: ["lat", "lng", "formattedAddress"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return new Response(text, {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Geocoding API Error:", error);
    return new Response(JSON.stringify({ 
      error: 'Geocoding failed',
      lat: 35.6895,
      lng: 139.6917,
      formattedAddress: ''
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
