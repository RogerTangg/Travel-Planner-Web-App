/**
 * 景點操作 Hook (Spot Actions Hook)
 * 
 * 封裝景點相關的業務邏輯，包括：
 * - 新增景點（AI 分析 / 手動）
 * - 從地圖新增景點
 * - 檔案上傳批次提取
 * - 智慧排程
 * 
 * @module hooks/useSpotActions
 */

import { useCallback } from 'react';
import { useTripStore, createPlaceholderSpot, createManualSpot } from '../stores';
import { useUIStore } from '../stores';
import { Spot, SpotCategory } from '../types';
import {
  analyzeSpotWithAI,
  extractSpotsFromText,
  scheduleUnscheduledSpots,
  optimizeDaySchedule
} from '../services/geminiService';
import { MapClickSpotInfo } from '../components/MapPreview';
import pLimit from 'p-limit';

// 控制 AI 請求的並行數量
const aiRequestLimit = pLimit(3);

export const useSpotActions = () => {
  // 只訂閱需要響應變化的狀態
  const isManualMode = useUIStore(state => state.isManualMode);

  /**
   * 使用 AI 分析並填充景點資訊 (Analyze and Fill Spot with AI)
   * 包含照片、座標、地址等完整資訊
   */
  const analyzeAndFillSpot = useCallback(async (id: string, name: string) => {
    const { updateSpot } = useTripStore.getState();

    try {
      const analysis = await analyzeSpotWithAI(name);

      updateSpot(id, {
        name: analysis.name,
        description: analysis.description,
        category: analysis.category as SpotCategory,
        coordinates: { lat: analysis.coordinates[0], lng: analysis.coordinates[1] },
        address: analysis.address,
        suggestedTime: analysis.suggestedTime,
        placeId: analysis.placeId,
        photos: analysis.photos || [],  // 新增：照片資訊
        isLoading: false
      });
    } catch (error) {
      console.error('AI Analysis Error:', error);
      updateSpot(id, {
        description: '無法取得資訊，請稍後再試。',
        isLoading: false
      });
    }
  }, []);

  /**
   * 新增景點 (Add Spot)
   * 根據模式決定是 AI 分析還是手動新增
   */
  const handleAddSpot = useCallback(async (name: string) => {
    const { getCurrentTrip, addSpotToUnscheduled } = useTripStore.getState();
    const { setIsAnalyzing, showToast } = useUIStore.getState();

    const currentTrip = getCurrentTrip();
    if (!currentTrip || !name.trim()) return;

    if (isManualMode) {
      // 手動模式 - 不使用 AI
      const newSpot = createManualSpot(name);
      addSpotToUnscheduled(newSpot);
      showToast(`✅ 已新增「${name}」`, 'success');
      return;
    }

    // AI 模式
    setIsAnalyzing(true);
    const newSpot = createPlaceholderSpot(name);
    addSpotToUnscheduled(newSpot);

    await analyzeAndFillSpot(newSpot.id, name);
    setIsAnalyzing(false);
    showToast(`✅ 已新增「${name}」`, 'success');
  }, [isManualMode, analyzeAndFillSpot]);

  /**
   * 從地圖點擊新增景點 (Add Spot from Map Click)
   */
  const handleAddSpotFromMap = useCallback(async (spotInfo: MapClickSpotInfo) => {
    const { getCurrentTrip, addSpotToUnscheduled, updateSpot } = useTripStore.getState();
    const { showToast } = useUIStore.getState();

    const currentTrip = getCurrentTrip();
    if (!currentTrip) return;

    const newSpot: Spot = {
      id: crypto.randomUUID(),
      name: spotInfo.name,
      description: '正在獲取詳細資訊...',
      category: SpotCategory.SIGHTSEEING,
      coordinates: spotInfo.coordinates,
      address: spotInfo.address,
      placeId: spotInfo.placeId,
      suggestedTime: '60 分鐘',
      isLoading: true
    };

    addSpotToUnscheduled(newSpot);
    showToast(`📍 正在新增「${spotInfo.name}」...`, 'info');

    try {
      const analysis = await analyzeSpotWithAI(spotInfo.name);

      updateSpot(newSpot.id, {
        name: analysis.name || spotInfo.name,
        description: analysis.description,
        category: analysis.category as SpotCategory,
        // 優先使用地圖點擊獲得的座標和地址（更精確）
        coordinates: spotInfo.coordinates,
        address: spotInfo.address || analysis.address,
        suggestedTime: analysis.suggestedTime,
        placeId: analysis.placeId || spotInfo.placeId,
        photos: analysis.photos || [],  // 新增：照片資訊
        isLoading: false
      });

      showToast(`✅ 已新增「${analysis.name || spotInfo.name}」`, 'success');
    } catch (error) {
      console.error('Map spot analysis error:', error);
      updateSpot(newSpot.id, {
        description: '點擊編輯以新增描述',
        isLoading: false
      });
      showToast(`⚠️ 已新增「${spotInfo.name}」（部分資訊）`, 'warning');
    }
  }, []);

  /**
   * 快速新增模組 (Add Quick Module)
   */
  const handleAddQuickModule = useCallback((category: SpotCategory, label: string) => {
    const { getCurrentTrip, addSpotToUnscheduled } = useTripStore.getState();
    const { showToast } = useUIStore.getState();

    const currentTrip = getCurrentTrip();
    if (!currentTrip) return;

    const newSpot: Spot = {
      id: crypto.randomUUID(),
      name: `新${label}`,
      description: `請編輯此${label}的詳細資訊`,
      category,
      coordinates: { lat: 35.6895, lng: 139.6917 },
      suggestedTime: category === SpotCategory.COMMUTE ? '30 分鐘' :
        category === SpotCategory.FOOD ? '90 分鐘' :
          category === SpotCategory.MUSEUM ? '120 分鐘' : '60 分鐘',
      isManual: true,
      isLoading: false
    };

    addSpotToUnscheduled(newSpot);
    showToast(`✅ 已新增「新${label}」`, 'success');
  }, []);

  /**
   * 處理檔案上傳 (Handle File Upload)
   * 批次提取景點並使用 AI 補充資訊
   */
  const handleFileUpload = useCallback(async (text: string) => {
    const { getCurrentTrip, batchAddSpots } = useTripStore.getState();
    const { setIsAnalyzing, showToast } = useUIStore.getState();

    const currentTrip = getCurrentTrip();
    if (!currentTrip || !text) return;

    setIsAnalyzing(true);

    try {
      const result = await extractSpotsFromText(text);

      if (result.spots.length === 0) {
        showToast('無法從檔案中識別出景點。請確認檔案包含文字描述。', 'warning');
        setIsAnalyzing(false);
        return;
      }

      // 顯示提取統計
      const { extracted, verified } = result.stats;
      if (verified > 0) {
        showToast(`✅ 成功識別 ${extracted} 個景點，${verified} 個已驗證`, 'success');
      } else {
        showToast(`📍 識別到 ${extracted} 個景點`, 'info');
      }

      // 建立景點卡片
      const newSpots = result.spots.map(spot => {
        if (spot.verified && spot.coordinates && spot.address) {
          // 已驗證：直接使用 Places API 的資料
          return {
            ...createPlaceholderSpot(spot.verifiedName || spot.name),
            coordinates: { lat: spot.coordinates.lat, lng: spot.coordinates.lng },
            address: spot.address,
            placeId: spot.placeId,
            isLoading: false
          };
        }
        return createPlaceholderSpot(spot.name);
      });

      batchAddSpots(newSpots);

      // 使用 p-limit 控制並行，只對未驗證的景點進行 AI 分析
      const unverifiedSpots = newSpots.filter((_, index) => !result.spots[index].verified);
      if (unverifiedSpots.length > 0) {
        await Promise.all(
          unverifiedSpots.map(s =>
            aiRequestLimit(() => analyzeAndFillSpot(s.id, s.name))
          )
        );
      }

    } catch (error) {
      console.error('File processing error', error);
      showToast('處理檔案時發生錯誤', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [analyzeAndFillSpot]);

  /**
   * 智慧排程 (Smart Schedule)
   */
  const handleSmartSchedule = useCallback(async () => {
    const { getCurrentTrip, updateSpotsAfterSchedule } = useTripStore.getState();
    const { setIsScheduling, showToast } = useUIStore.getState();

    const currentTrip = getCurrentTrip();
    if (!currentTrip || currentTrip.unscheduledSpots.length === 0) return;

    const loadingSpots = currentTrip.unscheduledSpots.filter(s => s.isLoading);
    if (loadingSpots.length > 0) {
      showToast('請等待所有景點分析完成後再進行智慧排程', 'warning');
      return;
    }

    setIsScheduling(true);

    try {
      const existingDays = currentTrip.days.map(d => ({
        id: d.id,
        title: d.title,
        spotsCount: d.spots.length
      }));

      const schedule = await scheduleUnscheduledSpots(
        currentTrip.unscheduledSpots,
        existingDays
      );

      if (schedule.length === 0) {
        showToast('智慧排程暫時無法處理，請稍後再試或手動安排', 'warning');
        return;
      }

      updateSpotsAfterSchedule(schedule);
      showToast(`✅ 智慧排程完成！`, 'success');
    } catch (error) {
      console.error('Smart scheduling error:', error);
      showToast('智慧排程發生錯誤，請稍後再試', 'error');
    } finally {
      setIsScheduling(false);
    }
  }, []);

  /**
   * 優化單日行程 (Optimize Day Schedule)
   */
  const handleOptimizeDay = useCallback(async (dayId: string) => {
    const { getCurrentTrip, updateDaySpots } = useTripStore.getState();
    const { setIsOptimizing, showToast } = useUIStore.getState();

    const currentTrip = getCurrentTrip();
    if (!currentTrip) return;

    const day = currentTrip.days.find(d => d.id === dayId);
    if (!day || day.spots.length < 2) return;

    setIsOptimizing(dayId);

    try {
      const sortedIds = await optimizeDaySchedule(day.spots);

      const spotMap = new Map(day.spots.map(s => [s.id, s]));
      const newSpots = sortedIds
        .map(id => spotMap.get(id))
        .filter(Boolean) as Spot[];

      if (newSpots.length === day.spots.length) {
        updateDaySpots(dayId, newSpots);
        showToast(`✅ Day ${day.title} 已優化排序`, 'success');
      }
    } catch (error) {
      console.error('Day optimization error:', error);
      showToast('優化排序失敗，請稍後再試', 'error');
    } finally {
      setIsOptimizing(null);
    }
  }, []);

  /**
   * 刪除景點 (Delete Spot)
   */
  const handleDeleteSpot = useCallback((id: string) => {
    const { deleteSpot } = useTripStore.getState();
    const { selectedSpot, setSelectedSpot } = useUIStore.getState();

    deleteSpot(id);
    if (selectedSpot?.id === id) {
      setSelectedSpot(null);
    }
  }, []);

  /**
   * 複製景點 (Duplicate Spot)
   */
  const handleDuplicateSpot = useCallback((spot: Spot) => {
    const { duplicateSpot } = useTripStore.getState();
    duplicateSpot(spot);
  }, []);

  /**
   * 更新景點 (Update Spot)
   */
  const handleUpdateSpot = useCallback((id: string, updates: Partial<Spot>) => {
    const { updateSpot } = useTripStore.getState();
    updateSpot(id, updates);
  }, []);

  return {
    handleAddSpot,
    handleAddSpotFromMap,
    handleAddQuickModule,
    handleFileUpload,
    handleSmartSchedule,
    handleOptimizeDay,
    handleDeleteSpot,
    handleDuplicateSpot,
    handleUpdateSpot
  };
};
