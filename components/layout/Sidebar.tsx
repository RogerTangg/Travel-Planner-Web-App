/**
 * 側邊欄元件 (Sidebar Component)
 * 
 * 包含：
 * - 應用程式標題
 * - 行程選擇器
 * - 景點搜尋/新增
 * - 工具列（Undo、匯出/匯入、建立集合）
 * - 快速模組
 * - 標籤篩選
 * - 待安排景點清單
 * 
 * @module components/layout/Sidebar
 */

import React, { useRef, useMemo, memo, useState } from 'react';
import {
  Plus,
  Sparkles,
  Search,
  ListTodo,
  Upload,
  FolderPlus,
  Trash2,
  ChevronRight,
  Tag,
  PenLine,
  X,
  Download,
  FolderInput,
  Layers
} from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTripStore, useUIStore } from '../../stores';
import { useSpotActions, useHistory, useExportImport } from '../../hooks';
import { SpotCategory } from '../../types';
import { SpotCard } from '../SpotCard';
import { SpotGroupCard } from '../SpotGroupCard';
import { DroppableContainer, LoadingOverlay, EmptyState } from '../common';

// 常數
const UNSCHEDULED_ID = 'unscheduled-container';

// 快速模組定義
const QUICK_MODULES = [
  { label: '景點', icon: '🏛️', category: SpotCategory.SIGHTSEEING },
  { label: '交通', icon: '🚃', category: SpotCategory.COMMUTE },
  { label: '餐飲', icon: '🍜', category: SpotCategory.FOOD },
  { label: '購物', icon: '🛍️', category: SpotCategory.SHOPPING },
  { label: '住宿', icon: '🏨', category: SpotCategory.HOTEL },
  { label: '文化', icon: '🎨', category: SpotCategory.MUSEUM },
  { label: '娛樂', icon: '🎢', category: SpotCategory.ENTERTAINMENT },
  { label: '自然', icon: '🌳', category: SpotCategory.PARK },
] as const;

/**
 * 行程選擇器子元件 (Trip Selector)
 */
const TripSelector: React.FC = memo(() => {
  const trips = useTripStore(state => state.trips);
  const currentTripId = useTripStore(state => state.currentTripId);
  const setCurrentTripId = useTripStore(state => state.setCurrentTripId);
  const createTrip = useTripStore(state => state.createTrip);
  const deleteTrip = useTripStore(state => state.deleteTrip);
  const showTripList = useUIStore(state => state.showTripList);
  const setShowTripList = useUIStore(state => state.setShowTripList);
  const showConfirm = useUIStore(state => state.showConfirm);
  const setSelectedSpot = useUIStore(state => state.setSelectedSpot);
  
  // 在組件內計算當前行程
  const currentTrip = trips.find(t => t.id === currentTripId) || null;
  if (!currentTrip) return null;

  const handleSelectTrip = (tripId: string) => {
    setCurrentTripId(tripId);
    setShowTripList(false);
    setSelectedSpot(null);
  };

  const handleDeleteTrip = (tripId: string) => {
    if (trips.length <= 1) {
      alert('至少需要保留一個行程');
      return;
    }
    
    showConfirm({
      title: '刪除行程',
      message: '確定要刪除這個行程嗎？此操作無法復原。',
      type: 'danger',
      onConfirm: () => {
        deleteTrip(tripId);
        useUIStore.getState().hideConfirm();
      }
    });
  };

  const handleCreateTrip = () => {
    createTrip();
    setShowTripList(false);
  };

  return (
    <div className="mb-3">
      <button
        onClick={() => setShowTripList(!showTripList)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span className="text-sm font-medium text-gray-700 truncate">{currentTrip.title}</span>
        <ChevronRight 
          size={16} 
          className={`text-gray-400 transition-transform ${showTripList ? 'rotate-90' : ''}`} 
        />
      </button>
      
      {showTripList && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-fade-in">
          <div className="max-h-[280px] overflow-y-auto">
            {trips.map(trip => {
              // 取得行程封面圖（第一張景點照片）
              const coverPhoto = (() => {
                for (const day of trip.days) {
                  for (const spot of day.spots) {
                    if (spot.photos && spot.photos.length > 0) {
                      return spot.photos[0];
                    }
                  }
                }
                for (const spot of trip.unscheduledSpots) {
                  if (spot.photos && spot.photos.length > 0) {
                    return spot.photos[0];
                  }
                }
                return null;
              })();
              
              const totalSpots = trip.days.reduce((acc, d) => acc + d.spots.length, 0) + trip.unscheduledSpots.length;

              return (
                <div 
                  key={trip.id}
                  className={`flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer ${trip.id === currentTripId ? 'bg-sakura-50' : ''}`}
                  onClick={() => handleSelectTrip(trip.id)}
                >
                  {/* 封面圖縮略圖 */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {coverPhoto ? (
                      <img
                        src={`/api/place-photos?ref=${encodeURIComponent(coverPhoto.photoReference)}&w=100`}
                        alt={trip.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <FolderPlus size={20} />
                      </div>
                    )}
                  </div>
                  
                  {/* 行程資訊 */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{trip.title}</span>
                    <span className="text-xs text-gray-400">
                      {trip.dayCount} 天 · {totalSpots} 個景點
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrip(trip.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={handleCreateTrip}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border-t border-gray-100 text-sakura-500 hover:bg-sakura-50 transition-colors"
          >
            <FolderPlus size={16} />
            <span className="text-sm font-medium">新增行程</span>
          </button>
        </div>
      )}
    </div>
  );
});

TripSelector.displayName = 'TripSelector';

/**
 * 景點搜尋輸入子元件 (Spot Search Input)
 */
const SpotSearchInput: React.FC = memo(() => {
  const [newSpotName, setNewSpotName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isManualMode = useUIStore(state => state.isManualMode);
  const isAnalyzing = useUIStore(state => state.isAnalyzing);
  const toggleManualMode = useUIStore(state => state.toggleManualMode);
  const { handleAddSpot, handleFileUpload } = useSpotActions();

  const onSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSpotName.trim()) return;
    
    await handleAddSpot(newSpotName.trim());
    setNewSpotName('');
  };

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (text) {
        await handleFileUpload(text);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <form onSubmit={onSubmit} className="relative mb-2">
      {/* 主輸入框 */}
      <div className="relative mb-1.5">
        <input 
          type="text" 
          placeholder={isManualMode ? "手動輸入景點名稱..." : "輸入景點名稱 (AI 智慧分析)..."} 
          value={newSpotName}
          onChange={(e) => setNewSpotName(e.target.value)}
          className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl text-sm focus:bg-white focus:ring-2 outline-none transition-all ${
            isManualMode 
              ? 'border-amber-300 focus:ring-amber-200 focus:border-amber-400' 
              : 'border-gray-200 focus:ring-sakura-200 focus:border-sakura-300'
          }`}
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      </div>
      
      {/* 操作按鈕列 */}
      <div className="flex gap-1.5">
        <button 
          type="submit"
          disabled={!newSpotName.trim() || (isAnalyzing && !isManualMode)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg shadow-sm hover:shadow-md border-2 disabled:opacity-50 font-medium transition-all ${
            isManualMode 
              ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' 
              : 'bg-sakura-50 text-sakura-600 border-sakura-200 hover:bg-sakura-100'
          }`}
        >
          {isAnalyzing && newSpotName && !isManualMode ? (
            <div className="animate-spin h-3.5 w-3.5 border-2 border-sakura-500 border-t-transparent rounded-full"/>
          ) : (
            <>
              <Plus size={14} />
              <span className="text-xs">新增景點</span>
            </>
          )}
        </button>

        {/* 手動模式切換 */}
        <button 
          type="button"
          onClick={toggleManualMode}
          title={isManualMode ? "切換為 AI 模式" : "切換為手動模式"}
          className={`px-2.5 py-2 rounded-lg shadow-sm hover:shadow border-2 transition-all ${
            isManualMode 
              ? 'bg-amber-100 text-amber-600 border-amber-300' 
              : 'bg-white text-gray-400 hover:text-amber-500 border-gray-200 hover:border-amber-200'
          }`}
        >
          <PenLine size={16} />
        </button>

        {/* 檔案上傳 */}
        <div className="relative">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onFileChange} 
            className="hidden" 
            accept=".txt,.csv,.md"
          />
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            title="上傳行程文字檔"
            className="px-2.5 py-2 bg-white text-gray-500 hover:text-sakura-500 rounded-lg shadow-sm hover:shadow border-2 border-gray-200 hover:border-sakura-200 disabled:opacity-50 transition-all"
          >
            {isAnalyzing && !newSpotName ? (
              <div className="animate-spin h-3.5 w-3.5 border-2 border-sakura-500 border-t-transparent rounded-full"/>
            ) : (
              <Upload size={16} />
            )}
          </button>
        </div>
      </div>
    </form>
  );
});

SpotSearchInput.displayName = 'SpotSearchInput';

/**
 * 快速模組子元件 (Quick Modules)
 * 包含各類景點快捷按鈕及「集合」按鈕
 */
const QuickModules: React.FC = memo(() => {
  const { handleAddQuickModule, handleAddEmptyGroup } = useSpotActions();

  return (
    <div className="mb-2 p-1.5 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-1 mb-1">
        <Sparkles size={10} className="text-sakura-400" />
        <span className="text-[9px] font-medium text-gray-500">快速新增模組</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {QUICK_MODULES.map(module => (
          <button
            key={module.label}
            type="button"
            onClick={() => handleAddQuickModule(module.category, module.label)}
            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded border border-gray-200 text-[10px] font-medium text-gray-600 hover:border-sakura-300 hover:bg-sakura-50 hover:text-sakura-600 transition-all shadow-sm"
          >
            <span className="text-[10px]">{module.icon}</span>
            <span>{module.label}</span>
          </button>
        ))}
        {/* 集合按鈕 */}
        <button
          type="button"
          onClick={handleAddEmptyGroup}
          className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded border border-purple-200 text-[10px] font-medium text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-all shadow-sm"
          title="新增空集合，可拖曳景點至其中"
        >
          <Layers size={10} />
          <span>集合</span>
        </button>
      </div>
    </div>
  );
});

QuickModules.displayName = 'QuickModules';

/**
 * 工具列子元件 (Toolbar)
 * 包含匯出/匯入功能
 */
const Toolbar: React.FC = memo(() => {
  const { handleExportTrip, triggerImportDialog } = useExportImport();

  return (
    <div className="flex items-center justify-center gap-1 mb-2 p-1.5 bg-gray-50 rounded-lg">
      <button
        onClick={handleExportTrip}
        title="匯出行程 JSON"
        className="flex items-center gap-1 px-2 py-1.5 bg-white rounded border border-gray-200 text-xs font-medium text-gray-600 hover:border-green-300 hover:text-green-600 transition-all shadow-sm"
      >
        <Download size={12} />
        <span className="hidden sm:inline">匯出</span>
      </button>
      <button
        onClick={triggerImportDialog}
        title="匯入行程 JSON"
        className="flex items-center gap-1 px-2 py-1.5 bg-white rounded border border-gray-200 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
      >
        <FolderInput size={12} />
        <span className="hidden sm:inline">匯入</span>
      </button>
    </div>
  );
});

Toolbar.displayName = 'Toolbar';

/**
 * 標籤篩選子元件 (Tag Filter)
 */
const TagFilter: React.FC = memo(() => {
  const trips = useTripStore(state => state.trips);
  const currentTripId = useTripStore(state => state.currentTripId);
  const selectedTagFilter = useUIStore(state => state.selectedTagFilter);
  const setSelectedTagFilter = useUIStore(state => state.setSelectedTagFilter);

  const allTags = useMemo(() => {
    const trip = trips.find(t => t.id === currentTripId);
    if (!trip) return [];
    
    const tagSet = new Set<string>();
    const spots = [
      ...trip.unscheduledSpots,
      ...trip.days.flatMap(d => d.spots)
    ];
    
    spots.forEach(spot => {
      (spot.tags || []).forEach(tag => tagSet.add(tag));
    });
    
    return Array.from(tagSet).sort();
  }, [trips, currentTripId]);

  if (allTags.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1 mb-2">
        <Tag size={12} className="text-gray-400" />
        <span className="text-[10px] font-medium text-gray-500">標籤篩選</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {selectedTagFilter && (
          <button
            onClick={() => setSelectedTagFilter(null)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
          >
            <X size={10} />
            清除
          </button>
        )}
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? null : tag)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              selectedTagFilter === tag 
                ? 'bg-sakura-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-sakura-100'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
});

TagFilter.displayName = 'TagFilter';

/**
 * 待安排景點清單子元件 (Unscheduled Spots List)
 */
const UnscheduledSpotsList: React.FC = memo(() => {
  const trips = useTripStore(state => state.trips);
  const currentTripId = useTripStore(state => state.currentTripId);
  const currentTrip = trips.find(t => t.id === currentTripId) || null;
  const clearUnscheduledSpots = useTripStore(state => state.clearUnscheduledSpots);
  const getGroupSpots = useTripStore(state => state.getGroupSpots);
  const selectedTagFilter = useUIStore(state => state.selectedTagFilter);
  const isScheduling = useUIStore(state => state.isScheduling);
  const activeId = useUIStore(state => state.activeId);
  const setSelectedSpot = useUIStore(state => state.setSelectedSpot);
  const showConfirm = useUIStore(state => state.showConfirm);
  const hideConfirm = useUIStore(state => state.hideConfirm);
  const { saveBeforeAction } = useHistory();
  const { 
    handleDeleteSpot, 
    handleUpdateSpot, 
    handleDuplicateSpot,
    handleSmartSchedule 
  } = useSpotActions();

  if (!currentTrip) return null;

  // 取得已在集合中的景點 ID
  const groupedSpotIds = useMemo(() => {
    return new Set((currentTrip.spotGroups || []).flatMap(g => g.spotIds));
  }, [currentTrip.spotGroups]);

  // 根據標籤篩選景點（排除已在集合中的）
  const filteredSpots = useMemo(() => {
    const ungroupedSpots = currentTrip.unscheduledSpots.filter(
      spot => !groupedSpotIds.has(spot.id)
    );
    
    if (!selectedTagFilter) return ungroupedSpots;
    return ungroupedSpots.filter(
      spot => (spot.tags || []).includes(selectedTagFilter)
    );
  }, [currentTrip.unscheduledSpots, selectedTagFilter, groupedSpotIds]);

  // 取得待安排區域的集合
  // 空集合或集合內有任何景點在待安排區域時，都應該顯示
  const unscheduledGroups = useMemo(() => {
    return (currentTrip.spotGroups || []).filter(group => {
      // 空集合應該顯示在待安排區域（讓使用者可以拖曳景點進去）
      if (group.spotIds.length === 0) return true;
      // 集合內有任何景點在待安排區域
      return group.spotIds.some(id => 
        currentTrip.unscheduledSpots.some(s => s.id === id)
      );
    });
  }, [currentTrip.spotGroups, currentTrip.unscheduledSpots]);

  const handleClearAll = () => {
    if (currentTrip.unscheduledSpots.length === 0) return;
    
    showConfirm({
      title: '清空待安排景點',
      message: `確定要刪除所有 ${currentTrip.unscheduledSpots.length} 個待安排景點嗎？此操作無法復原。`,
      type: 'danger',
      onConfirm: () => {
        saveBeforeAction('清空待安排景點');
        clearUnscheduledSpots();
        setSelectedSpot(null);
        hideConfirm();
      }
    });
  };

  // 包裝 handleDeleteSpot 以加入歷史紀錄
  const handleDeleteSpotWithHistory = (id: string) => {
    saveBeforeAction('刪除景點');
    handleDeleteSpot(id);
  };

  return (
    <DroppableContainer 
      id={UNSCHEDULED_ID}
      className="flex-1 min-h-0 overflow-y-auto bg-gray-50/50 p-3 custom-scrollbar relative"
      active={activeId !== null}
    >
      {isScheduling && <LoadingOverlay text="AI 智慧排程中..." />}
      
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <ListTodo size={14} className="text-sakura-500" />
          <span className="text-xs font-bold text-gray-600">待安排景點</span>
          <span className="bg-sakura-100 text-sakura-600 text-[10px] px-1.5 rounded-full font-bold">
            {currentTrip.unscheduledSpots.length}
          </span>
        </div>
        
        {currentTrip.unscheduledSpots.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearAll}
              className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-medium hover:border-red-200 hover:text-red-500 transition-all"
              title="清空所有待安排景點"
            >
              <Trash2 size={10} />
            </button>
            
            <button
              onClick={handleSmartSchedule}
              disabled={isScheduling || currentTrip.unscheduledSpots.some(s => s.isLoading)}
              className="flex items-center gap-1 px-2 py-1 bg-sakura-500 text-white rounded-lg text-[10px] font-medium hover:bg-sakura-600 hover:shadow-md disabled:opacity-50 transition-all"
            >
              <Sparkles size={10} />
              智慧排程
            </button>
          </div>
        )}
      </div>
      
      {/* 景點集合列表 */}
      {unscheduledGroups.map(group => {
        const groupSpots = currentTrip.unscheduledSpots.filter(
          s => group.spotIds.includes(s.id)
        );
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
        id={UNSCHEDULED_ID}
        items={[
          ...unscheduledGroups.map(g => `sortable-group-${g.id}`),
          ...filteredSpots.map(s => s.id)
        ]}
        strategy={verticalListSortingStrategy}
      >
        {filteredSpots.length === 0 && unscheduledGroups.length === 0 ? (
          <EmptyState 
            variant={currentTrip.unscheduledSpots.length === 0 ? 'unscheduled' : 'filtered'} 
          />
        ) : (
          filteredSpots.map(spot => (
            <SpotCard 
              key={spot.id} 
              spot={spot} 
              onDelete={handleDeleteSpotWithHistory} 
              onClick={setSelectedSpot}
              onUpdate={handleUpdateSpot}
              onDuplicate={handleDuplicateSpot}
              compact={true}
            />
          ))
        )}
      </SortableContext>
    </DroppableContainer>
  );
});

UnscheduledSpotsList.displayName = 'UnscheduledSpotsList';

/**
 * 側邊欄主元件 (Sidebar Main Component)
 */
export const Sidebar: React.FC = () => {
  const trips = useTripStore(state => state.trips);
  const currentTripId = useTripStore(state => state.currentTripId);
  const currentTrip = trips.find(t => t.id === currentTripId) || null;
  const updateDayCount = useTripStore(state => state.updateDayCount);
  const updateTrip = useTripStore(state => state.updateTrip);

  if (!currentTrip) return null;

  return (
    <div className="w-full md:w-[320px] lg:w-[340px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] h-full">
      {/* 標題區塊 */}
      <div className="p-4 md:p-5 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Logo" className="w-6 h-6 md:w-7 md:h-7" />
            <h1 className="font-bold text-base md:text-lg text-gray-800">Travel Planner</h1>
          </div>
        </div>

        <TripSelector />

        {/* 行程名稱輸入 */}
        <input 
          type="text" 
          value={currentTrip.title} 
          onChange={(e) => updateTrip(currentTrip.id, { title: e.target.value })}
          className="w-full text-sm md:text-base font-bold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border-transparent focus:bg-white focus:ring-2 focus:ring-sakura-200 transition-all outline-none" 
        />
        
        {/* 天數控制 */}
        <div className="flex items-center justify-between mt-3 bg-gray-50 p-2 rounded-lg">
          <span className="text-xs font-medium text-gray-500 ml-1">旅遊天數</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => updateDayCount(currentTrip.dayCount - 1)} 
              className="w-7 h-7 md:w-6 md:h-6 rounded hover:bg-white text-gray-500 shadow-sm active:scale-95 transition-transform"
            >
              -
            </button>
            <span className="text-sm font-bold w-4 text-center">{currentTrip.dayCount}</span>
            <button 
              onClick={() => updateDayCount(currentTrip.dayCount + 1)} 
              className="w-7 h-7 md:w-6 md:h-6 rounded hover:bg-white text-gray-500 shadow-sm active:scale-95 transition-transform"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 搜尋與工具區塊 */}
      <div className="p-3 border-b border-gray-100">
        <SpotSearchInput />
        <Toolbar />
        <QuickModules />
        <TagFilter />
      </div>

      {/* 待安排景點清單 - 手機版需要留底部空間給導航 */}
      <div className="flex-1 flex flex-col min-h-0 pb-16 md:pb-0">
        <UnscheduledSpotsList />
      </div>
    </div>
  );
};

export default Sidebar;
