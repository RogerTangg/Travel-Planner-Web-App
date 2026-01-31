/**
 * 行程面板元件 (Schedule Panel Component)
 * 
 * 中間區域的行程總覽，包含：
 * - 每日行程卡片
 * - 智慧排序功能
 * - 收回全部功能
 * 
 * @module components/layout/SchedulePanel
 */

import React, { memo, useMemo } from 'react';
import { Calendar, Sparkles, Save, Undo2 } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTripStore, useUIStore } from '../../stores';
import { useSpotActions } from '../../hooks';
import { SpotCard } from '../SpotCard';
import { DroppableContainer, LoadingOverlay, DayEmptyState } from '../common';

/**
 * 單日行程卡片子元件 (Day Card)
 */
interface DayCardProps {
  dayId: string;
  dayIndex: number;
  title: string;
}

const DayCard: React.FC<DayCardProps> = memo(({ dayId, dayIndex, title }) => {
  const currentTrip = useTripStore(state => state.getCurrentTrip());
  const { isOptimizing, activeId, setSelectedSpot } = useUIStore();
  const { handleOptimizeDay, handleDeleteSpot, handleUpdateSpot, handleDuplicateSpot } = useSpotActions();

  if (!currentTrip) return null;
  
  const day = currentTrip.days.find(d => d.id === dayId);
  if (!day) return null;

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
        <h3 className="text-lg font-bold text-gray-800">{title}</h3>
        <button 
          onClick={() => handleOptimizeDay(dayId)}
          disabled={day.spots.length < 2}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:text-sakura-600 hover:border-sakura-200 transition-all disabled:opacity-50"
        >
          <Sparkles size={12} />
          智慧排序
        </button>
      </div>

      {/* 放置區域 (Drop Area) */}
      <DroppableContainer 
        id={dayId}
        className="min-h-[100px] bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative"
        active={activeId !== null}
      >
        {isOptimizing === dayId && <LoadingOverlay />}
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
                  onDelete={handleDeleteSpot}
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
      </DroppableContainer>
    </div>
  );
});

DayCard.displayName = 'DayCard';

/**
 * 行程面板主元件 (Schedule Panel Main Component)
 */
export const SchedulePanel: React.FC = () => {
  const currentTrip = useTripStore(state => state.getCurrentTrip());
  const { showConfirm, hideConfirm, setSelectedSpot } = useUIStore();
  const collectAllSpots = useTripStore(state => state.collectAllSpots);

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
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-20 md:pb-8">
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
