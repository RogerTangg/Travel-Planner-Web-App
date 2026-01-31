import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { Spot, SpotCategory } from '../types';

// Google Maps API Key - 會從 API 端點獲取或使用環境變數
let cachedApiKey: string | null = null;

const getGoogleMapsApiKey = async (): Promise<string> => {
  // 優先使用已快取的 key
  if (cachedApiKey) return cachedApiKey;
  
  // 嘗試從 window 或環境變數獲取
  const envKey = (window as any).__GOOGLE_MAPS_API_KEY__ || import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey) {
    cachedApiKey = envKey;
    return envKey;
  }
  
  // 從 API 端點獲取
  try {
    const response = await fetch('/api/maps-config');
    if (response.ok) {
      const data = await response.json();
      if (data.apiKey) {
        cachedApiKey = data.apiKey;
        return data.apiKey;
      }
    }
  } catch (e) {
    console.error('Failed to fetch maps config:', e);
  }
  
  return '';
};

// Category color mapping for markers
const getCategoryColor = (category: SpotCategory): string => {
  switch (category) {
    case SpotCategory.FOOD: return '#F97316'; // orange
    case SpotCategory.CAFE: return '#F59E0B'; // amber
    case SpotCategory.BAR: return '#8B5CF6'; // violet
    case SpotCategory.HOTEL: return '#3B82F6'; // blue
    case SpotCategory.COMMUTE: return '#64748B'; // slate
    case SpotCategory.SHOPPING: return '#EC4899'; // pink
    case SpotCategory.MUSEUM: return '#6366F1'; // indigo
    case SpotCategory.SHRINE_TEMPLE: return '#EF4444'; // red
    case SpotCategory.PARK: return '#22C55E'; // green
    case SpotCategory.ENTERTAINMENT: return '#06B6D4'; // cyan
    case SpotCategory.CUSTOM: return '#A855F7'; // purple
    default: return '#F43F5E'; // rose - sightseeing
  }
};

// Create SVG marker icon
const createMarkerIcon = (color: string, isSelected: boolean): string => {
  const size = isSelected ? 40 : 32;
  const strokeWidth = isSelected ? 3 : 2;
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path 
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
        fill="${color}" 
        stroke="white" 
        stroke-width="${strokeWidth}"
      />
      <circle cx="12" cy="9" r="3" fill="white"/>
    </svg>
  `)}`;
};

interface MapPreviewProps {
  spots: Spot[];
  selectedSpot: Spot | null;
}

// 全域載入狀態
let googleMapsLoadPromise: Promise<void> | null = null;
let isGoogleMapsLoaded = false;

const loadGoogleMapsScript = async (): Promise<void> => {
  if (isGoogleMapsLoaded && window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsLoadPromise) {
    return googleMapsLoadPromise;
  }

  const apiKey = await getGoogleMapsApiKey();
  
  if (!apiKey) {
    throw new Error('No API Key available');
  }

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    // 檢查是否已經載入
    if (window.google?.maps) {
      isGoogleMapsLoaded = true;
      resolve();
      return;
    }

    // 建立 callback
    const callbackName = '__googleMapsCallback__' + Date.now();
    (window as any)[callbackName] = () => {
      isGoogleMapsLoaded = true;
      delete (window as any)[callbackName];
      resolve();
    };

    // 載入腳本
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&libraries=marker`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      delete (window as any)[callbackName];
      googleMapsLoadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

export const MapPreview: React.FC<MapPreviewProps> = ({ spots, selectedSpot }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 初始化 Google Maps
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error('Google Maps load error:', error);
        if (error.message === 'No API Key available') {
          setLoadError('請設定 Google Maps API Key');
        } else {
          setLoadError('無法載入 Google Maps');
        }
      });
  }, []);

  // 建立地圖實例
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return;

    const newMap = new google.maps.Map(mapRef.current, {
      center: { lat: 35.6895, lng: 139.6917 }, // 東京預設位置
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: [
        // 淡雅風格
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }]
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#c9d7e5' }]
        },
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ color: '#f5f5f5' }]
        }
      ]
    });

    const newInfoWindow = new google.maps.InfoWindow();
    
    setMap(newMap);
    setInfoWindow(newInfoWindow);
  }, [isLoaded, map]);

  // 更新標記
  useEffect(() => {
    if (!map || !infoWindow) return;

    // 清除舊標記
    markers.forEach(marker => marker.setMap(null));

    if (spots.length === 0) {
      setMarkers([]);
      return;
    }

    // 建立新標記
    const newMarkers = spots.map((spot, index) => {
      const isSelected = selectedSpot?.id === spot.id;
      const color = getCategoryColor(spot.category);
      
      const marker = new google.maps.Marker({
        position: { lat: spot.coordinates.lat, lng: spot.coordinates.lng },
        map: map,
        title: spot.name,
        icon: {
          url: createMarkerIcon(color, isSelected),
          scaledSize: new google.maps.Size(isSelected ? 40 : 32, isSelected ? 40 : 32),
          anchor: new google.maps.Point(isSelected ? 20 : 16, isSelected ? 40 : 32),
        },
        zIndex: isSelected ? 1000 : index,
        animation: isSelected ? google.maps.Animation.BOUNCE : undefined,
      });

      // 點擊標記顯示資訊視窗
      marker.addListener('click', () => {
        const content = `
          <div style="padding: 8px; min-width: 180px; max-width: 250px;">
            <div style="display: flex; align-items: center; gap: 8px; padding-bottom: 8px; margin-bottom: 8px; border-bottom: 1px solid ${color}40;">
              <div style="width: 12px; height: 12px; border-radius: 50%; background-color: ${color};"></div>
              <span style="font-size: 10px; font-weight: 500; padding: 2px 6px; border-radius: 4px; background-color: ${color}20; color: ${color};">
                ${spot.category}
              </span>
            </div>
            <h3 style="font-weight: bold; font-size: 14px; color: #1f2937; margin-bottom: 4px;">
              ${spot.name}
            </h3>
            <p style="font-size: 12px; color: #6b7280; line-height: 1.4; margin-bottom: 8px;">
              ${spot.description.slice(0, 80)}${spot.description.length > 80 ? '...' : ''}
            </p>
            ${spot.address ? `
              <p style="font-size: 11px; color: #9ca3af; display: flex; align-items: center; gap: 4px;">
                📍 ${spot.address}
              </p>
            ` : ''}
            ${(spot.startTime || spot.endTime) ? `
              <div style="display: flex; align-items: center; gap: 4px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f3f4f6;">
                <span style="font-size: 10px; color: #9ca3af;">🕐</span>
                <span style="font-size: 12px; font-weight: 500; color: #4b5563;">
                  ${spot.startTime || '--:--'} ~ ${spot.endTime || '--:--'}
                </span>
              </div>
            ` : ''}
          </div>
        `;
        
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      });

      // 選中的標記停止彈跳動畫（1秒後）
      if (isSelected) {
        setTimeout(() => {
          marker.setAnimation(null);
        }, 1000);
      }

      return marker;
    });

    setMarkers(newMarkers);

    // 自動調整視野
    if (selectedSpot) {
      map.panTo({ lat: selectedSpot.coordinates.lat, lng: selectedSpot.coordinates.lng });
      map.setZoom(16);
    } else if (spots.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      spots.forEach(spot => {
        bounds.extend({ lat: spot.coordinates.lat, lng: spot.coordinates.lng });
      });
      map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      
      // 限制最大縮放
      const listener = google.maps.event.addListener(map, 'idle', () => {
        const currentZoom = map.getZoom();
        if (currentZoom && currentZoom > 15) {
          map.setZoom(15);
        }
        google.maps.event.removeListener(listener);
      });
    }
  }, [map, spots, selectedSpot, infoWindow]);

  // 載入錯誤顯示
  if (loadError) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
        <div className="text-4xl mb-4">🗺️</div>
        <p className="text-sm font-medium">{loadError}</p>
        <p className="text-xs mt-2 text-gray-400">請檢查 API Key 設定</p>
      </div>
    );
  }

  // 載入中顯示
  if (!isLoaded) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-100">
        <div className="animate-spin h-8 w-8 border-4 border-sakura-500 border-t-transparent rounded-full mb-4" />
        <p className="text-sm text-gray-500">載入 Google Maps...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      {/* 地圖容器 */}
      <div ref={mapRef} className="h-full w-full" />
      
      {/* 地圖圖例 */}
      {spots.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-3 min-w-[180px]">
          <div className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-sakura-400 to-sakura-500"></div>
            地圖圖例
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {Array.from(new Set(spots.map(s => s.category))).slice(0, 8).map(cat => (
              <div key={cat} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: getCategoryColor(cat) }}
                />
                <span className="text-[11px] text-gray-700 font-medium truncate">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Google Maps 標誌（保持可見以符合使用條款） */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/80 backdrop-blur-sm rounded px-2 py-1">
        <span className="text-[10px] text-gray-500">Powered by Google Maps</span>
      </div>
    </div>
  );
};
