/**
 * 匯出匯入 Hook (Export Import Hook)
 * 
 * 封裝行程匯出/匯入的業務邏輯
 * 
 * @module hooks/useExportImport
 */

import { useCallback } from 'react';
import { useTripStore, useUIStore } from '../stores';
import { ExportableTripData } from '../types';

export const useExportImport = () => {
  /**
   * 匯出當前行程為 JSON 檔案 (Export Trip to JSON File)
   */
  const handleExportTrip = useCallback(() => {
    const { exportTrip, getCurrentTrip } = useTripStore.getState();
    const { showToast } = useUIStore.getState();
    
    const trip = getCurrentTrip();
    if (!trip) {
      showToast('無法匯出：找不到當前行程', 'error');
      return;
    }
    
    const exportData = exportTrip();
    if (!exportData) {
      showToast('匯出失敗', 'error');
      return;
    }
    
    try {
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // 建立下載連結
      const link = document.createElement('a');
      link.href = url;
      link.download = `${trip.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast(`✅ 已匯出「${trip.title}」`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('匯出時發生錯誤', 'error');
    }
  }, []);

  /**
   * 從 JSON 檔案匯入行程 (Import Trip from JSON File)
   */
  const handleImportTrip = useCallback(async (file: File) => {
    const { importTrip } = useTripStore.getState();
    const { showToast } = useUIStore.getState();
    
    try {
      const text = await file.text();
      const data: ExportableTripData = JSON.parse(text);
      
      // 基本驗證
      if (!data.version || !data.trip) {
        showToast('無效的行程檔案格式', 'error');
        return false;
      }
      
      const success = importTrip(data);
      
      if (success) {
        showToast(`✅ 已匯入「${data.trip.title}」`, 'success');
        return true;
      } else {
        showToast('匯入失敗：無法解析行程資料', 'error');
        return false;
      }
    } catch (error) {
      console.error('Import error:', error);
      if (error instanceof SyntaxError) {
        showToast('無效的 JSON 格式', 'error');
      } else {
        showToast('匯入時發生錯誤', 'error');
      }
      return false;
    }
  }, []);

  /**
   * 觸發檔案選擇對話框 (Trigger File Input)
   */
  const triggerImportDialog = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        await handleImportTrip(file);
      }
    };
    input.click();
  }, [handleImportTrip]);

  return {
    handleExportTrip,
    handleImportTrip,
    triggerImportDialog
  };
};
