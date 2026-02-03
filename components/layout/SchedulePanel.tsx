/**
 * 行程面板元件 (Schedule Panel Component)
 * 
 * 中間區域的行程總覽，包含：
 * - 每日行程卡片（含背景圖）
 * - 智慧排序功能
 * - 收回全部功能
 * 
 * @module components/layout/SchedulePanel
 */

import React, { memo, useMemo } from 'react';
import { Calendar, Sparkles, Save, Undo2, Redo2, Image as ImageIcon } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTripStore, useUIStore } from '../../stores';
import { useSpotActions, useHistory } from '../../hooks';
import { SpotCard } from '../SpotCard';
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

  // 包裝 handleDeleteSpot 以加入歷史紀錄
  const handleDeleteSpotWithHistory = (id: string) => {
    saveBeforeAction('刪除景點');
    handleDeleteSpot(id);
  };

  return (
    <div className="relative pl-8 md:pl-8 border-l-2 border-dashed border-gray-200/80">
      {/* 日期標記 (Day Marker) - 行動端調整位置 */}
      <div className="absolute -left-[21px] md:-left-[21px] top-0 flex flex-col items-center">
        <div className="w-10 h-10 md:w-10 md:h-10 rounded-full bg-white border-4 border-sakura-100 flex items-center justify-center shadow-sm z-10 text-sakura-600 font-black text-sm md:text-sm">
          {dayIndex + 1}
        </div>
      </div>
      
      {/* 標題列 (Header) */}
      <div className="flex items-center justify-between mb-5 md:mb-4 pl-2">
        <div className="flex items-center gap-2.5 md:gap-2">
          <h3 className="text-lg md:text-lg font-bold text-gray-800">{title}</h3>
          {totalPhotos > 0 && (
            <span className="flex items-center gap-1 px-2.5 md:px-2 py-1 md:py-0.5 bg-sakura-50 text-sakura-600 text-xs md:text-xs rounded-full">
              <ImageIcon size={14} className="md:w-[12px] md:h-[12px]" />
              {totalPhotos}
            </span>
          )}
        </div>
        <button 
          onClick={() => handleOptimizeDay(dayId)}
          disabled={day.spots.length < 2}
          className="flex items-center gap-2 md:gap-1.5 px-4 md:px-3 py-2.5 md:py-1.5 bg-white border border-gray-200 rounded-full text-sm md:text-xs font-medium text-gray-600 hover:text-sakura-600 hover:border-sakura-200 active:bg-sakura-50 active:scale-95 transition-all disabled:opacity-50 min-h-[44px] md:min-h-0"
          aria-label="智慧排序此日景點"
        >
          <Sparkles size={16} className="md:w-[12px] md:h-[12px]" />
          <span className="hidden xs:inline">智慧排序</span>
          <span className="xs:hidden">排序</span>
        </button>
      </div>

      {/* 放置區域 (Drop Area) - 含背景圖 */}
      <DroppableContainer 
        id={dayId}
        className="min-h-[120px] md:min-h-[100px] bg-white rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden"
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
        <div className="relative z-10 p-5 md:p-4">
          {isOptimizing === dayId && <LoadingOverlay />}
          
          {/* 景點列表 */}
          <SortableContext 
            id={dayId}
            items={day.spots.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {day.spots.length === 0 ? (
              <DayEmptyState />
            ) : (
              day.spots.map((spot, index) => (
                <div key={spot.id} className="relative">
                  <SpotCard 
                    spot={spot} 
                    onDelete={handleDeleteSpotWithHistory}
                    onClick={setSelectedSpot}
                    onUpdate={handleUpdateSpot}
                    onDuplicate={handleDuplicateSpot}
                  />
                  {/* 連接線 */}
                  {index < day.spots.length - 1 && (
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
  const { saveBeforeAction, handleUndo, handleRedo, canUndo, canRedo, lastAction } = useHistory();

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
      <div className="h-16 md:h-14 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center px-5 md:px-6 sticky top-0 z-30 justify-between">
        <h2 className="font-bold text-gray-800 flex items-center gap-2.5 md:gap-2 text-base md:text-base">
          <Calendar size={20} className="text-sakura-500 md:w-[18px] md:h-[18px]" />
          <span className="hidden xs:inline">行程總覽</span>
          <span className="xs:hidden">行程</span>
        </h2>
        
        <div className="flex items-center gap-3 md:gap-3">
          {/* Undo/Redo 按鈕 - 行動端增大觸控區域 */}
          <div className="flex items-center gap-1.5 md:gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title={canUndo ? `復原：${lastAction}` : '沒有可復原的操作'}
              aria-label={canUndo ? `復原：${lastAction}` : '沒有可復原的操作'}
              className="flex items-center justify-center gap-1 px-3 md:px-2 py-2.5 md:py-1 bg-white border border-gray-200 text-gray-600 rounded-xl md:rounded-lg text-xs md:text-xs font-medium hover:border-sakura-300 hover:text-sakura-600 active:bg-sakura-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
            >
              <Undo2 size={18} className="md:w-[12px] md:h-[12px]" />
              <span className="hidden sm:inline">復原</span>
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="重做"
              aria-label="重做上一步操作"
              className="flex items-center justify-center gap-1 px-3 md:px-2 py-2.5 md:py-1 bg-white border border-gray-200 text-gray-600 rounded-xl md:rounded-lg text-xs md:text-xs font-medium hover:border-sakura-300 hover:text-sakura-600 active:bg-sakura-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
            >
              <Redo2 size={18} className="md:w-[12px] md:h-[12px]" />
              <span className="hidden sm:inline">重做</span>
            </button>
          </div>

          <div className="w-px h-6 md:h-5 bg-gray-200 hidden sm:block" />
          
          <div className="text-xs md:text-xs text-gray-400 hidden xs:block">
            {totalScheduledSpots} 個行程點
          </div>
          
          {totalScheduledSpots > 0 && (
            <button
              onClick={handleCollectAllSpots}
              aria-label="收回全部景點至待安排清單"
              className="flex items-center justify-center gap-1.5 md:gap-1 px-3 md:px-2 py-2.5 md:py-1 bg-white border border-gray-200 text-gray-600 rounded-xl md:rounded-lg text-xs md:text-xs font-medium hover:border-amber-300 hover:text-amber-600 active:bg-amber-50 active:scale-95 transition-all min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0"
              title="收回全部景點至待安排清單"
            >
              <Undo2 size={18} className="md:w-[12px] md:h-[12px]" />
              <span className="hidden sm:inline">收回全部</span>
            </button>
          )}
          
          <div className="hidden sm:flex items-center gap-1 text-xs md:text-xs text-green-600 bg-green-50 px-2.5 md:px-2 py-1.5 md:py-1 rounded-full">
            <Save size={14} className="md:w-[12px] md:h-[12px]" />
            自動儲存
          </div>
        </div>
      </div>

      {/* 行程內容區 (Schedule Content) - 手機版留底部空間 */}
      <div className="flex-1 overflow-y-auto p-5 md:p-8 custom-scrollbar pb-28 md:pb-8">
        <div className="max-w-3xl mx-auto space-y-10 md:space-y-12">
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
