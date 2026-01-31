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

import React, { memo, Component, ErrorInfo, ReactNode } from 'react';
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
 * 錯誤邊界元件 (Error Boundary)
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-50 p-8">
          <div className="text-center">
            <h1 className="text-xl font-bold text-red-600 mb-4">應用程式發生錯誤</h1>
            <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-sakura-500 text-white rounded-lg"
            >
              重新載入
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
  const trips = useTripStore(state => state.trips);
  const currentTripId = useTripStore(state => state.currentTripId);
  const hasHydrated = useTripStore(state => state._hasHydrated);
  
  // 在組件內計算當前行程，避免 selector 返回新物件導致的無限循環
  const currentTrip = trips.find(t => t.id === currentTripId) || null;
  const { mobileView, setMobileView } = useUIStore();
  const { 
    sensors, 
    handleDragStart, 
    handleDragOver, 
    handleDragEnd 
  } = useDragAndDrop();

  // 等待 Zustand hydration 完成
  if (!hasHydrated) {
    return <LoadingScreen />;
  }

  // 顯示載入畫面直到有行程資料
  if (!currentTrip) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 text-warm-800 font-sans overflow-hidden pb-14 md:pb-0">
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
 * 負責渲染主內容，初始化由 Zustand persist 的 onRehydrateStorage 處理
 */
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
};

// --- 應用程式掛載 (App Mount) ---
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
} else {
  console.error('Root element not found');
}

export default App;
