/**
 * Travel Planner Web App - 主應用程式進入點
 * 
 * 重構後的輕量化入口，主要負責：
 * - 響應式佈局結構
 * - DnD Context 提供
 * - 全域狀態初始化
 * - 手機版底部導航
 * 
 * @module App
 */

import React, { useEffect, memo } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import { ListTodo, Calendar, Map } from 'lucide-react';

// Stores
import { useTripStore, useUIStore } from './stores';

// Hooks
import { useDragAndDrop } from './hooks';

// Layout Components
import { Sidebar, SchedulePanel, MapPanel } from './components/layout';

// Common Components
import { ToastContainer } from './components/common';
import { ConfirmDialog } from './components/ConfirmDialog';
import { SpotCard } from './components/SpotCard';

// --- Drag Overlay 設定 ---
const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({ 
    styles: { active: { opacity: '0.5' } } 
  }),
};

/**
 * 拖曳 Overlay 元件 - 顯示正在拖曳的景點卡片
 */
const DragOverlayContent: React.FC = memo(() => {
  const { activeId, activeSpot } = useUIStore();

  if (!activeId || !activeSpot) return null;

  return (
    <DragOverlay dropAnimation={dropAnimation}>
      <div className="w-[280px] md:w-[300px]">
        <SpotCard 
          spot={activeSpot} 
          onDelete={() => {}} 
          onClick={() => {}} 
          isOverlay
        />
      </div>
    </DragOverlay>
  );
});

DragOverlayContent.displayName = 'DragOverlayContent';

/**
 * 確認對話框容器 - 連接 UI Store
 */
const ConfirmDialogContainer: React.FC = memo(() => {
  const { confirmState, hideConfirm } = useUIStore();

  if (!confirmState) return null;

  return (
    <ConfirmDialog
      isOpen={confirmState.isOpen}
      title={confirmState.title}
      message={confirmState.message}
      type={confirmState.type}
      onConfirm={confirmState.onConfirm}
      onCancel={hideConfirm}
    />
  );
});

ConfirmDialogContainer.displayName = 'ConfirmDialogContainer';

/**
 * 載入中畫面 (Loading Screen)
 */
const LoadingScreen: React.FC = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <div className="animate-spin h-8 w-8 border-4 border-sakura-500 border-t-transparent rounded-full" />
  </div>
);

/**
 * 手機底部導航列 (Mobile Bottom Navigation)
 */
type MobileView = 'spots' | 'schedule' | 'map';

const MobileNavigation: React.FC<{
  activeView: MobileView;
  onViewChange: (view: MobileView) => void;
}> = memo(({ activeView, onViewChange }) => {
  const navItems: { view: MobileView; label: string; Icon: typeof ListTodo }[] = [
    { view: 'spots', label: '景點', Icon: ListTodo },
    { view: 'schedule', label: '行程', Icon: Calendar },
    { view: 'map', label: '地圖', Icon: Map },
  ];

  return (
    <nav className="mobile-nav">
      {navItems.map(({ view, label, Icon }) => (
        <button
          key={view}
          onClick={() => onViewChange(view)}
          className={`mobile-nav-item ${activeView === view ? 'active' : ''}`}
        >
          <Icon size={20} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
});

MobileNavigation.displayName = 'MobileNavigation';

/**
 * 主應用程式內容 (Main App Content)
 */
const AppContent: React.FC = memo(() => {
  const currentTrip = useTripStore(state => state.getCurrentTrip());
  const { mobileView, setMobileView } = useUIStore();
  const { 
    sensors, 
    handleDragStart, 
    handleDragOver, 
    handleDragEnd 
  } = useDragAndDrop();

  // 顯示載入畫面直到有行程資料
  if (!currentTrip) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 text-warm-800 font-sans overflow-hidden">
      <DndContext 
        sensors={sensors}
        collisionDetection={pointerWithin} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* 桌面版：三欄佈局 */}
        {/* 手機版：根據 mobileView 顯示對應面板 */}
        
        {/* 左側面板 - 待安排景點 */}
        <div className={`
          ${mobileView === 'spots' ? 'flex' : 'hidden'}
          md:flex
          w-full md:w-[320px] lg:w-[340px]
          flex-shrink-0
        `}>
          <Sidebar />
        </div>

        {/* 中間面板 - 行程總覽 */}
        <div className={`
          ${mobileView === 'schedule' ? 'flex' : 'hidden'}
          md:flex
          flex-1 min-w-0
        `}>
          <SchedulePanel />
        </div>

        {/* 右側面板 - 地圖 */}
        <div className={`
          ${mobileView === 'map' ? 'flex' : 'hidden'}
          xl:flex
          w-full xl:w-[38%]
        `}>
          <MapPanel />
        </div>

        {/* 拖曳 Overlay */}
        <DragOverlayContent />
      </DndContext>

      {/* 手機底部導航 */}
      <MobileNavigation 
        activeView={mobileView} 
        onViewChange={setMobileView} 
      />

      {/* 確認對話框 */}
      <ConfirmDialogContainer />

      {/* Toast 通知 */}
      <ToastContainer />
    </div>
  );
});

AppContent.displayName = 'AppContent';

/**
 * 應用程式主元件 (Main App Component)
 * 
 * 負責初始化 Store 與渲染主內容
 */
const App: React.FC = () => {
  const initializeStore = useTripStore(state => state.initializeStore);

  // 初始化 Store
  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  return <AppContent />;
};

// --- 應用程式掛載 (App Mount) ---
const root = createRoot(document.getElementById('root')!);
root.render(<App />);

export default App;
