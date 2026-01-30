import { Spot, AIAnalysisResponse } from "../types";

// API calls go through Cloudflare Functions
const API_BASE = '/api';

export const analyzeSpotWithAI = async (spotName: string): Promise<AIAnalysisResponse> => {
  try {
    const response = await fetch(`${API_BASE}/analyze-spot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spotName: spotName.trim().slice(0, 200) })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as AIAnalysisResponse;

  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      name: spotName,
      description: "無法取得 AI 資訊，請稍後再試。",
      category: "自定義",
      coordinates: [35.6895, 139.6917],
      suggestedTime: "60 分鐘"
    };
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

export const extractSpotsFromText = async (text: string): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE}/extract-spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim().slice(0, 5000) })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as string[];

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

    const response = await fetch(`${API_BASE}/schedule-spots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        unscheduledSpots: spotsData,
        existingDays 
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json() as { dayId: string; spotIds: string[] }[];

  } catch (error) {
    console.error("AI Scheduling Error:", error);
    return [];
  }
};
