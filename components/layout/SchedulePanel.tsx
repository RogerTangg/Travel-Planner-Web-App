/**
 * 行程面板元件 (Schedule Panel Component)
 * 
 * 中間區域的行程總覽，包含：
 * - 每日行程卡片（含背景圖）
 * - 智慧排序功能
 * - 收回全部功能
 * - 景點集合支援
 * 
 * @module components/layout/SchedulePanel
 */

import React, { memo, useMemo } from 'react';
import { Calendar, Sparkles, Save, Undo2, Image as ImageIcon } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTripStore, useUIStore } from '../../stores';
import { useSpotActions, useHistory } from '../../hooks';
import { SpotCard } from '../SpotCard';
import { SpotGroupCard } from '../SpotGroupCard';
import { DroppableContainer, LoadingOverlay, DayEmptyState } from '../common';

/**
 * 單日行程卡片子元件 (Day Card)
 * 支援背景圖顯示
 */
interface DayCardProps {
  dayId: string;
  dayIndex: number;
  title: string;
}

const DayCard: React.FC<DayCardProps> = memo(({ dayId, dayIndex, title }) => {
  const trips = useTripStore(state => state.trips);
  const currentTripId = useTripStore(state => state.currentTripId);
  const currentTrip = trips.find(t => t.id === currentTripId) || null;
  const isOptimizing = useUIStore(state => state.isOptimizing);
  const activeId = useUIStore(state => state.activeId);
  const setSelectedSpot = useUIStore(state => state.setSelectedSpot);
  const { handleOptimizeDay, handleDeleteSpot, handleUpdateSpot, handleDuplicateSpot } = useSpotActions();
  const { saveBeforeAction } = useHistory();

  if (!currentTrip) return null;
  
  const day = currentTrip.days.find(d => d.id === dayId);
  if (!day) return null;

  // 取得該日第一張照片作為背景
  const backgroundPhoto = useMemo(() => {
    for (const spot of day.spots) {
      if (spot.photos && spot.photos.length > 0) {
        return spot.photos[0];
      }
    }
    return null;
  }, [day.spots]);

  // 計算該日總照片數
  const totalPhotos = useMemo(() => {
    return day.spots.reduce((acc, spot) => acc + (spot.photos?.length || 0), 0);
  }, [day.spots]);

  // 取得該日景點所屬的集合
  const dayGroups = useMemo(() => {
    const spotIds = new Set(day.spots.map(s => s.id));
    return (currentTrip.spotGroups || []).filter(group => 
      group.spotIds.some(id => spotIds.has(id))
    );
  }, [currentTrip.spotGroups, day.spots]);

  // 取得已在集合中的景點 ID
  const groupedSpotIds = useMemo(() => {
    return new Set(dayGroups.flatMap(g => g.spotIds));
  }, [dayGroups]);

  // 未分組的景點
  const ungroupedSpots = useMemo(() => {
    return day.spots.filter(s => !groupedSpotIds.has(s.id));
  }, [day.spots, groupedSpotIds]);

  // 包裝 handleDeleteSpot 以加入歷史紀錄
  const handleDeleteSpotWithHistory = (id: string) => {
    saveBeforeAction('刪除景點');
    handleDeleteSpot(id);
  };

  return (
    <div className="relative pl-8 border-l-2 border-dashed border-gray-200/80">
      {/* 日期標記 (Day Marker) */}
      <div className="absolute -left-[21px] top-0 flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-white border-4 border-sakura-100 flex items-center justify-center shadow-sm z-10 text-sakura-600 font-black text-sm">
          {dayIndex + 1}
        </div>
      </div>
      
      {/* 標題列 (Header) */}
      <div className="flex items-center justify-between mb-4 pl-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-800">{title}</h3>
          {totalPhotos > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-sakura-50 text-sakura-600 text-xs rounded-full">
              <ImageIcon size={12} />
              {totalPhotos}
            </span>
          )}
        </div>
        <button 
          onClick={() => handleOptimizeDay(dayId)}
          disabled={day.spots.length < 2}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:text-sakura-600 hover:border-sakura-200 transition-all disabled:opacity-50"
        >
          <Sparkles size={12} />
          智慧排序
        </button>
      </div>

      {/* 放置區域 (Drop Area) - 含背景圖 */}
      <DroppableContainer 
        id={dayId}
        className="min-h-[100px] bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden"
        active={activeId !== null}
      >
        {/* 背景圖層 */}
        {backgroundPhoto && (
          <div className="absolute inset-0 z-0">
            <img
              src={`/api/place-photos?ref=${encodeURIComponent(backgroundPhoto.photoReference)}&w=800`}
              alt=""
              className="w-full h-full object-cover opacity-[0.08]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/60 via-white/80 to-white/95" />
          </div>
        )}
        
        {/* 內容層 */}
        <div className="relative z-10 p-4">
          {isOptimizing === dayId && <LoadingOverlay />}
          
          {/* 景點集合列表 */}
          {dayGroups.map(group => {
            const groupSpots = day.spots.filter(s => group.spotIds.includes(s.id));
            return (
              <SpotGroupCard
                key={group.id}
                group={group}
                spots={groupSpots}
                onDeleteSpot={handleDeleteSpotWithHistory}
                onUpdateSpot={handleUpdateSpot}
                onDuplicateSpot={handleDuplicateSpot}
              />
            );
          })}
          
          {/* 未分組景點列表 */}
          <SortableContext 
            id={dayId}
            items={ungroupedSpots.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {day.spots.length === 0 ? (
              <DayEmptyState />
            ) : (
              ungroupedSpots.map((spot, index) => (
                <div key={spot.id} className="relative">
                  <SpotCard 
                    spot={spot} 
                    onDelete={handleDeleteSpotWithHistory}
                    onClick={setSelectedSpot}
                    onUpdate={handleUpdateSpot}
                    onDuplicate={handleDuplicateSpot}
                  />
                  {/* 連接線 */}
                  {index < ungroupedSpots.length - 1 && (
                    <div className="absolute left-[26px] bottom-[-12px] top-[100%] w-0.5 bg-gray-100 z-0 h-3" />
                  )}
                </div>
              ))
            )}
          </SortableContext>
        </div>
      </DroppableContainer>
    </div>
  );
});

DayCard.displayName = 'DayCard';

/**
 * 行程面板主元件 (Schedule Panel Main Component)
 */
export const SchedulePanel: React.FC = () => {
  const trips = useTripStore(state => state.trips);
  const currentTripId = useTripStore(state => state.currentTripId);
  const currentTrip = trips.find(t => t.id === currentTripId) || null;
  const showConfirm = useUIStore(state => state.showConfirm);
  const hideConfirm = useUIStore(state => state.hideConfirm);
  const setSelectedSpot = useUIStore(state => state.setSelectedSpot);
  const collectAllSpots = useTripStore(state => state.collectAllSpots);
  const { saveBeforeAction } = useHistory();

  // 計算總行程點數
  const totalScheduledSpots = useMemo(() => {
    if (!currentTrip) return 0;
    return currentTrip.days.reduce((acc, d) => acc + d.spots.length, 0);
  }, [currentTrip]);

  if (!currentTrip) return null;

  // 收回全部景點 (Collect All Spots)
  const handleCollectAllSpots = () => {
    if (totalScheduledSpots === 0) return;
    
    showConfirm({
      title: '收回全部景點',
      message: `確定要將所有 ${totalScheduledSpots} 個已排程景點收回至待安排清單嗎？`,
      type: 'warning',
      onConfirm: () => {
        saveBeforeAction('收回全部景點');
        collectAllSpots();
        setSelectedSpot(null);
        hideConfirm();
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] relative h-full">
      {/* 頂部標題列 (Top Header) */}
      <div className="h-12 md:h-14 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center px-4 md:px-6 sticky top-0 z-30 justify-between">
        <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm md:text-base">
          <Calendar size={16} className="text-sakura-500 md:w-[18px] md:h-[18px]" />
          <span className="hidden xs:inline">行程總覽</span>
          <span className="xs:hidden">行程</span>
        </h2>
        
        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-[10px] md:text-xs text-gray-400">
            {totalScheduledSpots} 個行程點
          </div>
          
          {totalScheduledSpots > 0 && (
            <button
              onClick={handleCollectAllSpots}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] md:text-xs font-medium hover:border-amber-300 hover:text-amber-600 active:scale-95 transition-all"
              title="收回全部景點至待安排清單"
            >
              <Undo2 size={12} />
              <span className="hidden sm:inline">收回全部</span>
            </button>
          )}
          
          <div className="hidden sm:flex items-center gap-1 text-[10px] md:text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <Save size={12} />
            自動儲存
          </div>
        </div>
      </div>

      {/* 行程內容區 (Schedule Content) - 手機版留底部空間 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto space-y-8 md:space-y-12">
          {currentTrip.days.map((day, dayIndex) => (
            <DayCard 
              key={day.id}
              dayId={day.id}
              dayIndex={dayIndex}
              title={day.title}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SchedulePanel;
