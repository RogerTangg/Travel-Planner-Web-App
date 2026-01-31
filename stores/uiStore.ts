/**
 * UI 狀態管理 (UI Store)
 * 
 * 管理應用程式的 UI 狀態，包括：
 * - 拖曳狀態
 * - 載入狀態
 * - Toast 通知
 * - 確認對話框
 * - 篩選器狀態
 * - 響應式視圖狀態
 * - 景點詳情 Modal
 * - 照片牆 Modal
 * 
 * @module stores/uiStore
 */

import { create } from 'zustand';
import { Spot } from '../types';

// --- 手機版視圖類型 ---
export type MobileView = 'spots' | 'schedule' | 'map';

// --- Toast 類型定義 ---
export interface ToastState {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

// --- 確認對話框類型定義 ---
export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

// --- Store Interface ---
interface UIState {
  // 拖曳狀態 (Drag State)
  activeId: string | null;
  activeSpot: Spot | null;
  setDragState: (id: string | null, spot: Spot | null) => void;
  clearDragState: () => void;
  
  // 選取狀態 (Selection State)
  selectedSpot: Spot | null;
  setSelectedSpot: (spot: Spot | null) => void;
  
  // 景點詳情 Modal (Spot Detail Modal)
  spotDetailModal: { isOpen: boolean; spot: Spot | null };
  openSpotDetailModal: (spot: Spot) => void;
  closeSpotDetailModal: () => void;
  
  // 載入狀態 (Loading State)
  isAnalyzing: boolean;
  isOptimizing: string | null; // dayId 或 null
  isScheduling: boolean;
  setIsAnalyzing: (value: boolean) => void;
  setIsOptimizing: (dayId: string | null) => void;
  setIsScheduling: (value: boolean) => void;
  
  // 面板狀態 (Panel State)
  showTripList: boolean;
  setShowTripList: (value: boolean) => void;
  toggleTripList: () => void;
  
  // 輸入模式 (Input Mode)
  isManualMode: boolean;
  setIsManualMode: (value: boolean) => void;
  toggleManualMode: () => void;
  
  // 篩選器 (Filters)
  selectedTagFilter: string | null;
  setSelectedTagFilter: (tag: string | null) => void;
  
  // 響應式視圖狀態 (Responsive View State)
  mobileView: MobileView;
  setMobileView: (view: MobileView) => void;
  
  // Toast 通知 (Toast Notification)
  toast: ToastState;
  showToast: (message: string, type?: ToastState['type']) => void;
  hideToast: () => void;
  
  // 確認對話框 (Confirm Dialog)
  confirmState: ConfirmState | null;
  showConfirm: (config: Omit<ConfirmState, 'isOpen'>) => void;
  hideConfirm: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  // --- 拖曳狀態 (Drag State) ---
  activeId: null,
  activeSpot: null,
  setDragState: (id, spot) => set({ activeId: id, activeSpot: spot }),
  clearDragState: () => set({ activeId: null, activeSpot: null }),
  
  // --- 選取狀態 (Selection State) ---
  selectedSpot: null,
  setSelectedSpot: (spot) => set({ selectedSpot: spot }),
  
  // --- 景點詳情 Modal (Spot Detail Modal) ---
  spotDetailModal: { isOpen: false, spot: null },
  openSpotDetailModal: (spot) => set({ spotDetailModal: { isOpen: true, spot } }),
  closeSpotDetailModal: () => set({ spotDetailModal: { isOpen: false, spot: null } }),
  
  // --- 載入狀態 (Loading State) ---
  isAnalyzing: false,
  isOptimizing: null,
  isScheduling: false,
  setIsAnalyzing: (value) => set({ isAnalyzing: value }),
  setIsOptimizing: (dayId) => set({ isOptimizing: dayId }),
  setIsScheduling: (value) => set({ isScheduling: value }),
  
  // --- 面板狀態 (Panel State) ---
  showTripList: false,
  setShowTripList: (value) => set({ showTripList: value }),
  toggleTripList: () => set(state => ({ showTripList: !state.showTripList })),
  
  // --- 輸入模式 (Input Mode) ---
  isManualMode: false,
  setIsManualMode: (value) => set({ isManualMode: value }),
  toggleManualMode: () => set(state => ({ isManualMode: !state.isManualMode })),
  
  // --- 篩選器 (Filters) ---
  selectedTagFilter: null,
  setSelectedTagFilter: (tag) => set({ selectedTagFilter: tag }),
  
  // --- 響應式視圖狀態 (Responsive View State) ---
  mobileView: 'spots',
  setMobileView: (view) => set({ mobileView: view }),
  
  // --- Toast 通知 (Toast Notification) ---
  toast: { isVisible: false, message: '', type: 'info' },
  showToast: (message, type = 'info') => {
    set({ toast: { isVisible: true, message, type } });
    // 自動關閉
    setTimeout(() => {
      get().hideToast();
    }, 4000);
  },
  hideToast: () => set(state => ({ 
    toast: { ...state.toast, isVisible: false } 
  })),
  
  // --- 確認對話框 (Confirm Dialog) ---
  confirmState: null,
  showConfirm: (config) => set({ 
    confirmState: { ...config, isOpen: true } 
  }),
  hideConfirm: () => set({ confirmState: null })
}));
