/**
 * 地圖面板元件 (Map Panel Component)
 * 
 * 右側地圖區域，封裝 MapPreview 並提供額外的 UI 元素
 * 支援響應式設計：手機版全螢幕、桌面版側邊欄
 * 
 * @module components/layout/MapPanel
 */

import React, { memo, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { useTripStore, useUIStore } from '../../stores';
import { useSpotActions } from '../../hooks';
import { MapPreview } from '../MapPreview';

/**
 * 地圖面板主元件 (Map Panel Main Component)
 */
export const MapPanel: React.FC = memo(() => {
  const trips = useTripStore(state => state.trips);
  const currentTripId = useTripStore(state => state.currentTripId);
  const { selectedSpot } = useUIStore();
  const { handleAddSpotFromMap } = useSpotActions();

  // 使用 useMemo 計算所有景點，避免無限循環
  const allSpots = useMemo(() => {
    const currentTrip = trips.find(t => t.id === currentTripId);
    if (!currentTrip) return [];
    return [
      ...currentTrip.unscheduledSpots,
      ...currentTrip.days.flatMap(d => d.spots)
    ].filter(s => !s.isLoading);
  }, [trips, currentTripId]);

  // 提示文字
  const hintText = useMemo(() => {
    if (selectedSpot) {
      return `位置: ${selectedSpot.name}`;
    }
    return '點擊地圖上的地點可新增';
  }, [selectedSpot]);

  return (
    <div className="w-full h-full bg-white border-l border-gray-200 relative shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
      {/* 提示標籤 (Hint Badge) */}
      <div className="absolute top-3 md:top-4 right-3 md:right-4 z-[400] bg-white/90 backdrop-blur px-2 md:px-3 py-1 md:py-1.5 rounded-lg shadow-md text-[10px] md:text-xs font-bold flex items-center gap-1.5 md:gap-2 border border-gray-100 max-w-[200px] md:max-w-none">
        <MapPin size={12} className="text-sakura-500 flex-shrink-0 md:w-[14px] md:h-[14px]" />
        <span className="truncate">{hintText}</span>
      </div>

      {/* 地圖元件 */}
      <MapPreview
        spots={allSpots}
        selectedSpot={selectedSpot}
        onAddSpotFromMap={handleAddSpotFromMap}
      />
    </div>
  );
});

MapPanel.displayName = 'MapPanel';

export default MapPanel;
