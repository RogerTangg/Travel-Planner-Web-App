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
    <div className="relative pl-6 md:pl-8 border-l-2 border-dashed border-gray-200/80">
      {/* 日期標記 (Day Marker) */}
      <div className="absolute -left-[17px] md:-left-[21px] top-0 flex flex-col items-center">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white border-4 border-sakura-100 flex items-center justify-center shadow-sm z-10 text-sakura-600 font-black text-xs md:text-sm">
          {dayIndex + 1}
        </div>
      </div>
      
      {/* 標題列 (Header) */}
      <div className="flex items-center justify-between mb-3 md:mb-4 pl-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base md:text-lg font-bold text-gray-800">{title}</h3>
          {totalPhotos > 0 && (
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-sakura-50 text-sakura-600 text-[10px] md:text-xs rounded-full">
              <ImageIcon size={12} />
              {totalPhotos}
            </span>
          )}
        </div>
        <button 
          onClick={() => handleOptimizeDay(dayId)}
          disabled={day.spots.length < 2}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:text-sakura-600 hover:border-sakura-200 active:bg-sakura-50 active:scale-95 transition-all disabled:opacity-50"
          aria-label="智慧排序此日景點"
        >
          <Sparkles size={14} />
          <span>排序</span>
        </button>
      </div>

      {/* 放置區域 (Drop Area) - 含背景圖 */}
      <DroppableContainer 
        id={dayId}
        className="min-h-[80px] bg-white rounded-xl border border-gray-100 shadow-sm relative overflow-hidden"
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
        <div className="relative z-10 p-3 md:p-4">
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
      <div className="h-12 md:h-14 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center px-4 md:px-6 sticky top-0 z-30 justify-between">
        <h2 className="font-bold text-gray-800 flex items-center gap-2 text-sm md:text-base">
          <Calendar size={18} className="text-sakura-500" />
          <span>行程</span>
        </h2>
        
        <div className="flex items-center gap-2">
          {/* Undo/Redo 按鈕 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo}
              title={canUndo ? `復原：${lastAction}` : '沒有可復原的操作'}
              aria-label={canUndo ? `復原：${lastAction}` : '沒有可復原的操作'}
              className="flex items-center justify-center p-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:border-sakura-300 hover:text-sakura-600 active:bg-sakura-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo}
              title="重做"
              aria-label="重做上一步操作"
              className="flex items-center justify-center p-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:border-sakura-300 hover:text-sakura-600 active:bg-sakura-50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              <Redo2 size={16} />
            </button>
          </div>
          
          {totalScheduledSpots > 0 && (
            <button
              onClick={handleCollectAllSpots}
              aria-label="收回全部景點至待安排清單"
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:border-amber-300 hover:text-amber-600 active:bg-amber-50 active:scale-95 transition-all"
              title="收回全部"
            >
              <Undo2 size={14} />
              <span className="hidden xs:inline">收回</span>
            </button>
          )}
          
          <div className="hidden md:flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-1 rounded-full">
            <Save size={12} />
            自動儲存
          </div>
        </div>
      </div>

      {/* 行程內容區 (Schedule Content) - 手機版留底部空間 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8">
        <div className="max-w-3xl mx-auto space-y-6 md:space-y-12">
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
