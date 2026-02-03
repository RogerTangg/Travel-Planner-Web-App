/**
 * 歷史紀錄 Hook (History Hook)
 * 
 * 封裝 Undo/Redo 功能的業務邏輯
 * 自動記錄重要操作並支援返回
 * 
 * @module hooks/useHistory
 */

import { useCallback } from 'react';
import { useTripStore, useHistoryStore, useUIStore } from '../stores';

export const useHistory = () => {
  /**
   * 在執行操作前保存當前狀態 (Save State Before Action)
   * @param action - 操作描述
   */
  const saveBeforeAction = useCallback((action: string) => {
    const snapshot = useTripStore.getState().getSnapshot();
    if (snapshot) {
      useHistoryStore.getState().pushHistory(action, snapshot);
    }
  }, []);

  /**
   * 返回上一步 (Undo)
   */
  const handleUndo = useCallback(() => {
    const { undo, getLastAction } = useHistoryStore.getState();
    const { restoreSnapshot } = useTripStore.getState();
    const { showToast } = useUIStore.getState();
    
    const snapshot = undo();
    if (snapshot) {
      restoreSnapshot(snapshot);
      const action = getLastAction();
      showToast(`↩️ 已復原${action ? `「${action}」` : ''}`, 'info');
    }
  }, []);

  /**
   * 重做 (Redo)
   */
  const handleRedo = useCallback(() => {
    const { redo } = useHistoryStore.getState();
    const { restoreSnapshot } = useTripStore.getState();
    const { showToast } = useUIStore.getState();
    
    const snapshot = redo();
    if (snapshot) {
      restoreSnapshot(snapshot);
      showToast('↪️ 已重做', 'info');
    }
  }, []);

  /**
   * 清空歷史紀錄 (Clear History)
   * 用於切換行程時
   */
  const clearHistory = useCallback(() => {
    useHistoryStore.getState().clearHistory();
  }, []);

  // 訂閱狀態以便元件更新
  const canUndo = useHistoryStore(state => state.past.length > 0);
  const canRedo = useHistoryStore(state => state.future.length > 0);
  const lastAction = useHistoryStore(state => 
    state.past.length > 0 ? state.past[state.past.length - 1].action : null
  );

  return {
    saveBeforeAction,
    handleUndo,
    handleRedo,
    clearHistory,
    canUndo,
    canRedo,
    lastAction
  };
};
