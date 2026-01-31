import React, { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { Spot, SpotCategory } from '../types';

// Google Maps API Key - 會從 API 端點獲取或使用環境變數
let cachedApiKey: string | null = null;

// 地圖點擊新增景點的資訊
export interface MapClickSpotInfo {
  name: string;
  placeId: string;
  address?: string;
  coordinates: { lat: number; lng: number };
}

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
  onAddSpotFromMap?: (spotInfo: MapClickSpotInfo) => void;
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&libraries=marker,places`;
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

export const MapPreview: React.FC<MapPreviewProps> = ({ spots, selectedSpot, onAddSpotFromMap }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);

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
      // 將全螢幕按鈕移到左上角
      fullscreenControl: true,
      fullscreenControlOptions: {
        position: google.maps.ControlPosition.LEFT_TOP,
      },
      // 將縮放控制項移到右下角
      zoomControl: true,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM,
      },
      // 重要：啟用所有 POI 圖標點擊（包括車站、景點、餐廳等）
      clickableIcons: true,
      // 地圖樣式 - 保持所有圖標可見並可點擊
      styles: [
        // 水域顏色
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#c9d7e5' }]
        },
        // 地景顏色
        {
          featureType: 'landscape',
          elementType: 'geometry',
          stylers: [{ color: '#f5f5f5' }]
        },
        // 確保交通站點（車站、地鐵站等）圖標和文字都顯示
        {
          featureType: 'transit',
          elementType: 'all',
          stylers: [{ visibility: 'on' }]
        },
        {
          featureType: 'transit.station',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        },
        {
          featureType: 'transit.station.rail',
          elementType: 'labels.icon',
          stylers: [{ visibility: 'on' }]
        },
        // 確保所有 POI（景點、餐廳等）圖標顯示
        {
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        },
        {
          featureType: 'poi',
          elementType: 'labels.icon',
          stylers: [{ visibility: 'on' }]
        },
        // 確保商業 POI 顯示
        {
          featureType: 'poi.business',
          elementType: 'labels',
          stylers: [{ visibility: 'on' }]
        }
      ]
    });

    const newInfoWindow = new google.maps.InfoWindow({
      // 確保 InfoWindow 顯示在最上層
      zIndex: 9999,
      maxWidth: 300,
    });
    
    // 初始化 Places Service
    placesServiceRef.current = new google.maps.places.PlacesService(newMap);
    
    setMap(newMap);
    setInfoWindow(newInfoWindow);
  }, [isLoaded, map]);

  // 顯示 POI 確認新增的 InfoWindow
  const showAddSpotInfoWindow = useCallback((placeId: string, latLng: google.maps.LatLng) => {
    if (!placesServiceRef.current || !infoWindow || !map || !onAddSpotFromMap) return;

    // 使用 Places Service 獲取詳細資訊
    placesServiceRef.current.getDetails(
      {
        placeId: placeId,
        fields: ['name', 'formatted_address', 'geometry', 'place_id', 'types']
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const lat = place.geometry?.location?.lat() || latLng.lat();
          const lng = place.geometry?.location?.lng() || latLng.lng();
          
          // 顯示確認新增的 InfoWindow
          const uniqueId = `add-spot-btn-${Date.now()}`;
          const content = `
            <div style="padding: 12px; min-width: 200px; max-width: 280px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="font-size: 18px;">📍</span>
                <span style="font-size: 10px; font-weight: 500; padding: 2px 8px; border-radius: 4px; background-color: #f0fdf4; color: #16a34a;">
                  點擊新增景點
                </span>
              </div>
              <h3 style="font-weight: bold; font-size: 15px; color: #1f2937; margin-bottom: 6px;">
                ${place.name || '未知地點'}
              </h3>
              <p style="font-size: 11px; color: #6b7280; line-height: 1.4; margin-bottom: 12px;">
                ${place.formatted_address || ''}
              </p>
              <button 
                id="${uniqueId}"
                style="
                  width: 100%;
                  padding: 10px 16px;
                  background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%);
                  color: white;
                  border: none;
                  border-radius: 8px;
                  font-size: 13px;
                  font-weight: 600;
                  cursor: pointer;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 6px;
                  box-shadow: 0 2px 8px rgba(236, 72, 153, 0.3);
                  transition: all 0.2s;
                "
                onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(236, 72, 153, 0.4)';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(236, 72, 153, 0.3)';"
              >
                <span>✨</span>
                <span>新增至行程</span>
              </button>
            </div>
          `;
          
          infoWindow.setContent(content);
          infoWindow.setPosition({ lat, lng });
          infoWindow.open(map);
          
          // 等待 DOM 渲染後綁定事件
          setTimeout(() => {
            const btn = document.getElementById(uniqueId);
            if (btn) {
              btn.onclick = () => {
                onAddSpotFromMap({
                  name: place.name || '未知地點',
                  placeId: place.place_id || placeId,
                  address: place.formatted_address,
                  coordinates: { lat, lng }
                });
                infoWindow.close();
              };
            }
          }, 100);
        }
      }
    );
  }, [map, infoWindow, onAddSpotFromMap]);

  // 監聽地圖 POI 點擊事件（包含車站、景點等所有可點擊圖標）
  useEffect(() => {
    if (!map || !infoWindow || !onAddSpotFromMap) return;

    // 使用 nearbySearch 查找點擊位置附近的地點（優化版）
    const searchNearbyPlaces = (latLng: google.maps.LatLng) => {
      if (!placesServiceRef.current) return;
      
      // 顯示搜尋中狀態
      infoWindow.setContent(`
        <div style="padding: 16px; text-align: center;">
          <div style="display: inline-block; width: 24px; height: 24px; border: 3px solid #ec4899; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <p style="margin-top: 8px; font-size: 13px; color: #6b7280;">搜尋中...</p>
          <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
        </div>
      `);
      infoWindow.setPosition(latLng);
      infoWindow.open(map);
      
      // 搜尋附近地點，包含交通站點
      placesServiceRef.current.nearbySearch(
        {
          location: latLng,
          radius: 100, // 擴大到 100 公尺
          // 明確指定搜尋類型，包含交通站
          type: 'transit_station' as any,
        },
        (transitResults, transitStatus) => {
          // 如果找到交通站
          if (transitStatus === google.maps.places.PlacesServiceStatus.OK && transitResults && transitResults.length > 0) {
            const nearestPlace = transitResults[0];
            if (nearestPlace.place_id) {
              showAddSpotInfoWindow(nearestPlace.place_id, latLng);
              return;
            }
          }
          
          // 沒找到交通站，搜尋所有類型
          placesServiceRef.current?.nearbySearch(
            {
              location: latLng,
              radius: 80,
            },
            (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
                const nearestPlace = results[0];
                if (nearestPlace.place_id) {
                  showAddSpotInfoWindow(nearestPlace.place_id, latLng);
                  return;
                }
              }
              
              // 沒找到任何地點
              infoWindow.setContent(`
                <div style="padding: 12px; min-width: 180px;">
                  <div style="text-align: center; color: #6b7280;">
                    <span style="font-size: 24px;">🔍</span>
                    <p style="margin-top: 8px; font-size: 13px;">此位置附近沒有找到可新增的地點</p>
                    <p style="margin-top: 4px; font-size: 11px; color: #9ca3af;">請點擊地圖上的圖標或標籤</p>
                  </div>
                </div>
              `);
            }
          );
        }
      );
    };

    // 監聽地圖點擊事件
    const clickListener = map.addListener('click', (event: google.maps.MapMouseEvent & { placeId?: string }) => {
      if (!event.latLng) return;
      
      // 阻止預設的 InfoWindow
      event.stop?.();
      
      if (event.placeId) {
        // 有 placeId 直接使用
        showAddSpotInfoWindow(event.placeId, event.latLng);
      } else {
        // 沒有 placeId（如車站圖標），使用 nearbySearch 查找
        searchNearbyPlaces(event.latLng);
      }
    });

    return () => {
      google.maps.event.removeListener(clickListener);
    };
  }, [map, infoWindow, onAddSpotFromMap, showAddSpotInfoWindow]);

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
        // 使用較低的 zIndex 避免遮擋地圖原生 POI 圖標
        // 選中的標記提高 zIndex，但仍低於 InfoWindow
        zIndex: isSelected ? 100 : (10 + index),
        animation: isSelected ? google.maps.Animation.BOUNCE : undefined,
        // 設定為可點擊
        clickable: true,
      });

      // 點擊標記顯示資訊視窗（含照片預覽）
      marker.addListener('click', () => {
        // 檢查是否有照片
        const hasPhotos = spot.photos && spot.photos.length > 0;
        const photoUrl = hasPhotos 
          ? `/api/place-photos?ref=${encodeURIComponent(spot.photos![0].photoReference)}&w=400`
          : '';
        
        const content = `
          <div style="min-width: 240px; max-width: 300px; overflow: hidden; border-radius: 12px; background: white;">
            ${hasPhotos ? `
              <div style="position: relative; width: 100%; padding-top: 56.25%; overflow: hidden;">
                <img 
                  src="${photoUrl}" 
                  alt="${spot.name}"
                  style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; border-radius: 12px 12px 0 0;"
                  onerror="this.parentElement.style.display='none'"
                />
                <div style="position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(transparent, rgba(0,0,0,0.5)); border-radius: 0 0 0 0;"></div>
                ${spot.photos!.length > 1 ? `
                  <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.6); color: white; font-size: 10px; padding: 3px 8px; border-radius: 12px; backdrop-filter: blur(4px);">
                    📷 ${spot.photos!.length}
                  </div>
                ` : ''}
              </div>
            ` : ''}
            <div style="padding: 12px;">
              <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
                <div style="width: 8px; height: 8px; border-radius: 50%; background-color: ${color};"></div>
                <span style="font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 6px; background-color: ${color}15; color: ${color};">
                  ${spot.category}
                </span>
              </div>
              <h3 style="font-weight: 700; font-size: 15px; color: #1f2937; margin-bottom: 6px; line-height: 1.3;">
                ${spot.name}
              </h3>
              <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-bottom: 10px;">
                ${spot.description.slice(0, 80)}${spot.description.length > 80 ? '...' : ''}
              </p>
              ${spot.address ? `
                <p style="font-size: 11px; color: #9ca3af; display: flex; align-items: flex-start; gap: 4px; line-height: 1.4;">
                  <span style="flex-shrink: 0;">📍</span>
                  <span>${spot.address}</span>
                </p>
              ` : ''}
              ${(spot.startTime || spot.endTime) ? `
                <div style="display: flex; align-items: center; gap: 6px; margin-top: 10px; padding-top: 10px; border-top: 1px solid #f3f4f6;">
                  <span style="font-size: 11px; color: #9ca3af;">🕐</span>
                  <span style="font-size: 12px; font-weight: 600; color: #4b5563;">
                    ${spot.startTime || '--:--'} ~ ${spot.endTime || '--:--'}
                  </span>
                </div>
              ` : ''}
            </div>
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
      
      {/* 地圖圖例 - 放在左下角 */}
      {spots.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[5] bg-white/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-200/50 p-2 max-w-[140px]">
          <div className="text-[10px] font-bold text-gray-600 mb-1.5 flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-gradient-to-br from-sakura-400 to-sakura-500"></div>
            圖例
          </div>
          <div className="grid grid-cols-1 gap-1">
            {Array.from(new Set(spots.map(s => s.category))).slice(0, 6).map(cat => (
              <div key={cat} className="flex items-center gap-1.5">
                <div 
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: getCategoryColor(cat) }}
                />
                <span className="text-[10px] text-gray-600 truncate">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 點擊新增提示 - 放在底部中間 */}
      {onAddSpotFromMap && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[5] bg-pink-500/90 rounded-full shadow-md px-3 py-1.5">
          <div className="flex items-center gap-1.5 text-white">
            <span className="text-xs">📍</span>
            <span className="text-[10px] font-medium whitespace-nowrap">點擊地圖上的地點可新增景點</span>
          </div>
        </div>
      )}
    </div>
  );
};
