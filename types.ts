export enum SpotCategory {
  SIGHTSEEING = '景點',
  MUSEUM = '博物館',
  SHRINE_TEMPLE = '神社寺廟',
  PARK = '公園',
  SHOPPING = '購物',
  FOOD = '餐廳',
  CAFE = '咖啡廳',
  BAR = '酒吧',
  HOTEL = '飯店',
  COMMUTE = '通勤',
  ENTERTAINMENT = '娛樂',
  CUSTOM = '自定義'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Spot {
  id: string;
  name: string;
  description: string;
  category: SpotCategory;
  coordinates: Coordinates;
  address?: string;         // Street address for the location
  suggestedTime?: string; // e.g. "1.5 小時"
  startTime?: string;     // e.g. "10:00"
  endTime?: string;       // e.g. "11:30" - manually set or auto-calculated
  notes?: string;         // User editable notes
  tags?: string[];        // Custom user tags
  isLoading?: boolean;
  isManual?: boolean;     // True if manually created (not AI)
  placeId?: string;       // Google Maps Place ID (optional)
}

export interface DayPlan {
  id: string;
  title: string; // e.g., "Day 1"
  spots: Spot[];
}

export interface TripPlan {
  title: string;
  days: DayPlan[];
}

export interface Trip {
  id: string;
  title: string;
  dayCount: number;
  days: DayPlan[];
  unscheduledSpots: Spot[];
  createdAt: number;
  updatedAt: number;
}

export interface AIAnalysisResponse {
  name: string;
  description: string;
  category: string;
  coordinates: [number, number]; // [lat, lng]
  address: string;               // Street address
  suggestedTime: string;
}
