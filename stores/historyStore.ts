/**
 * 歷史紀錄狀態管理 (History Store)
 * 
 * 管理 Undo/Redo 功能，包括：
 * - 行程快照保存
 * - 歷史堆疊管理
 * - 還原操作
 * 
 * @module stores/historyStore
 */

import { create } from 'zustand';
import { HistoryItem, TripSnapshot, Trip } from '../types';

// --- Constants ---
const MAX_HISTORY_SIZE = 50;  // 最多保存 50 筆歷史

// --- Store Interface ---
interface HistoryState {
  // 狀態 (State)
  past: HistoryItem[];       // 過去的狀態（用於 Undo）
  future: HistoryItem[];     // 未來的狀態（用於 Redo）
  
  // 計算屬性 (Computed)
  canUndo: () => boolean;
  canRedo: () => boolean;
  getLastAction: () => string | null;
  
  // 操作 (Actions)
  pushHistory: (action: string, snapshot: TripSnapshot) => void;
  undo: () => TripSnapshot | null;
  redo: () => TripSnapshot | null;
  clearHistory: () => void;
}

/**
 * 建立快照 (Create Snapshot)
 * 從當前行程建立可還原的快照
 */
export const createSnapshot = (trip: Trip): TripSnapshot => ({
  days: JSON.parse(JSON.stringify(trip.days)),
  unscheduledSpots: JSON.parse(JSON.stringify(trip.unscheduledSpots)),
  spotGroups: JSON.parse(JSON.stringify(trip.spotGroups || []))
});

/**
 * 歷史紀錄 Store (History Store)
 */
export const useHistoryStore = create<HistoryState>((set, get) => ({
  // --- 狀態初始值 (Initial State) ---
  past: [],
  future: [],
  
  // --- 計算屬性 (Computed Properties) ---
  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
  getLastAction: () => {
    const { past } = get();
    return past.length > 0 ? past[past.length - 1].action : null;
  },
  
  // --- 操作 (Actions) ---
  
  /**
   * 將當前狀態推入歷史堆疊 (Push to History)
   * @param action - 操作描述（如「移動景點」、「刪除景點」）
   * @param snapshot - 操作前的快照
   */
  pushHistory: (action, snapshot) => {
    const historyItem: HistoryItem = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action,
      snapshot
    };
    
    set(state => {
      let newPast = [...state.past, historyItem];
      
      // 限制歷史大小
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast = newPast.slice(-MAX_HISTORY_SIZE);
      }
      
      return {
        past: newPast,
        future: []  // 推入新歷史時清空 Redo 堆疊
      };
    });
  },
  
  /**
   * 返回上一步 (Undo)
   * @returns 上一步的快照，若無則回傳 null
   */
  undo: () => {
    const { past } = get();
    if (past.length === 0) return null;
    
    const previous = past[past.length - 1];
    
    set(state => ({
      past: state.past.slice(0, -1),
      future: [...state.future, previous]
    }));
    
    return previous.snapshot;
  },
  
  /**
   * 重做 (Redo)
   * @returns 下一步的快照，若無則回傳 null
   */
  redo: () => {
    const { future } = get();
    if (future.length === 0) return null;
    
    const next = future[future.length - 1];
    
    set(state => ({
      past: [...state.past, next],
      future: state.future.slice(0, -1)
    }));
    
    return next.snapshot;
  },
  
  /**
   * 清空歷史 (Clear History)
   * 用於切換行程或重置時
   */
  clearHistory: () => {
    set({ past: [], future: [] });
  }
}));
