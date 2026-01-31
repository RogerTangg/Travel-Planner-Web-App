import { Spot, AIAnalysisResponse, Coordinates } from "../types";

// API calls go through Cloudflare Functions
const API_BASE = '/api';

// 擴展的分析結果，包含資料來源資訊
export interface EnhancedAnalysisResponse extends AIAnalysisResponse {
  source?: 'places_api' | 'ai';
  placeId?: string;
}

export const analyzeSpotWithAI = async (spotName: string): Promise<EnhancedAnalysisResponse> => {
  try {
    const response = await fetch(`${API_BASE}/analyze-spot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotName: spotName.trim().slice(0, 200) })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as EnhancedAnalysisResponse;

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      name: spotName,
      description: "無法取得資訊，請稍後再試。",
      category: "自定義",
      coordinates: [35.6895, 139.6917],
      address: "日本東京",
      suggestedTime: "60 分鐘",
      source: 'ai'
    };
  }
};

export interface GeocodeResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export const geocodeAddress = async (address: string): Promise<GeocodeResult | null> => {
  try {
    const response = await fetch(`${API_BASE}/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: address.trim().slice(0, 500) })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as GeocodeResult;

  } catch (error) {
    console.error("Geocoding Error:", error);
    return null;
  }
};

export const optimizeDaySchedule = async (spots: Spot[]): Promise<string[]> => {
  if (spots.length < 2) return spots.map(s => s.id);

  try {
    const spotsData = spots.map(s => ({ 
      id: s.id, 
      name: s.name, 
      coordinates: s.coordinates, 
      category: s.category 
    }));

    const response = await fetch(`${API_BASE}/optimize-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spots: spotsData })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as string[];

  } catch (error) {
    console.error("AI Sorting Error:", error);
    return spots.map(s => s.id);
  }
};

// ====== 文字提取景點（結合 Google Places API 驗證）======

export interface ExtractedSpot {
  name: string;
  verifiedName?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  placeId?: string;
  verified: boolean;
}

export interface ExtractResponse {
  spots: ExtractedSpot[];
  stats: {
    extracted: number;
    verified: number;
  };
}

/**
 * 從文字中提取景點名稱，並透過 Google Places API 驗證獲取完整資訊
 */
export const extractSpotsFromText = async (text: string): Promise<ExtractResponse> => {
  try {
    const response = await fetch(`${API_BASE}/extract-spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim().slice(0, 10000) })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    
    // 兼容舊格式（純字串陣列）
    if (Array.isArray(result)) {
      return {
        spots: result.map((name: string) => ({ name, verified: false })),
        stats: { extracted: result.length, verified: 0 }
      };
    }
    
    return result as ExtractResponse;

  } catch (error) {
    console.error("AI Extraction Error:", error);
    return { spots: [], stats: { extracted: 0, verified: 0 } };
  }
};

export const scheduleUnscheduledSpots = async (
  unscheduledSpots: Spot[], 
  existingDays: { id: string; title: string; spotsCount: number }[]
): Promise<{ dayId: string; spots: { id: string; startTime: string }[] }[]> => {
  if (unscheduledSpots.length === 0) return [];

  try {
    const spotsData = unscheduledSpots.map(s => ({ 
      id: s.id, 
      name: s.name, 
      coordinates: s.coordinates, 
      category: s.category,
      suggestedTime: s.suggestedTime 
    }));

    const response = await fetch(`${API_BASE}/schedule-spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        unscheduledSpots: spotsData,
        existingDays 
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as { dayId: string; spots: { id: string; startTime: string }[] }[];

  } catch (error) {
    console.error("AI Scheduling Error:", error);
    return [];
  }
};
