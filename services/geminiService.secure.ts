import { Spot, SpotCategory, AIAnalysisResponse } from "../types";

// API Base URL - use environment variable or default to local server
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Helper function for API calls with timeout
const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 30000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const analyzeSpotWithAI = async (spotName: string): Promise<AIAnalysisResponse> => {
  try {
    // Input validation
    const sanitizedName = spotName.trim().slice(0, 200);
    if (!sanitizedName) {
      throw new Error("Spot name is required");
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/analyze-spot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ spotName: sanitizedName })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json() as AIAnalysisResponse;

  } catch (error) {
    console.error("AI Analysis Error:", error);
    // Fallback data in case of error
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

    const response = await fetchWithTimeout(`${API_BASE_URL}/optimize-day`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ spots: spotsData })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json() as string[];

  } catch (error) {
    console.error("AI Sorting Error:", error);
    return spots.map(s => s.id);
  }
};

export const extractSpotsFromText = async (text: string): Promise<string[]> => {
  try {
    // Limit text length
    const sanitizedText = text.trim().slice(0, 5000);
    if (!sanitizedText) {
      return [];
    }

    const response = await fetchWithTimeout(`${API_BASE_URL}/extract-spots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: sanitizedText })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

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

    const response = await fetchWithTimeout(`${API_BASE_URL}/schedule-spots`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        unscheduledSpots: spotsData,
        existingDays 
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json() as { dayId: string; spotIds: string[] }[];

  } catch (error) {
    console.error("AI Scheduling Error:", error);
    return [];
  }
};
