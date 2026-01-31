/**
 * 拖曳操作 Hook (Drag and Drop Hook)
 * 
 * 封裝 @dnd-kit 的拖曳邏輯，處理：
 * - 跨容器拖曳（待安排 <-> 各天行程）
 * - 同容器排序
 * - 拖曳狀態管理
 * 
 * @module hooks/useDragAndDrop
 */

import { useCallback } from 'react';
import {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useTripStore, useUIStore } from '../stores';

// 常數定義
const UNSCHEDULED_ID = 'unscheduled-container';

export const useDragAndDrop = () => {
  const { getCurrentTrip, updateCurrentTrip } = useTripStore();
  const { setDragState, clearDragState, activeSpot } = useUIStore();

  // 設定拖曳感應器
  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { distance: 5 } 
    }),
    useSensor(KeyboardSensor)
  );

  /**
   * 找出景點所在的容器 (Find Container for Spot)
   */
  const findContainer = useCallback((id: string): string | null => {
    const currentTrip = getCurrentTrip();
    if (!currentTrip) return null;
    
    // 檢查是否為容器本身
    if (id === UNSCHEDULED_ID) return UNSCHEDULED_ID;
    if (currentTrip.days.some(d => d.id === id)) return id;
    
    // 檢查是否在待安排區
    if (currentTrip.unscheduledSpots.some(s => s.id === id)) return UNSCHEDULED_ID;
    
    // 檢查是否在某天的行程中
    const foundDay = currentTrip.days.find(d => d.spots.some(s => s.id === id));
    return foundDay ? foundDay.id : null;
  }, [getCurrentTrip]);

  /**
   * 拖曳開始事件處理 (Handle Drag Start)
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const currentTrip = getCurrentTrip();
    if (!currentTrip) return;
    
    const { active } = event;
    const spotId = active.id as string;
    
    // 找出被拖曳的景點
    const spot = 
      currentTrip.unscheduledSpots.find(s => s.id === spotId) || 
      currentTrip.days.flatMap(d => d.spots).find(s => s.id === spotId);
    
    setDragState(spotId, spot || null);
  }, [getCurrentTrip, setDragState]);

  /**
   * 拖曳經過事件處理 - 跨容器移動 (Handle Drag Over)
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const currentTrip = getCurrentTrip();
    if (!currentTrip || !activeSpot) return;
    
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);

    // 同容器或無效容器則不處理
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    updateCurrentTrip(trip => {
      let newUnscheduled = [...trip.unscheduledSpots];
      let newDays = [...trip.days];

      // 從來源容器移除
      if (activeContainer === UNSCHEDULED_ID) {
        newUnscheduled = newUnscheduled.filter(s => s.id !== active.id);
      } else {
        newDays = newDays.map(day => 
          day.id === activeContainer 
            ? { ...day, spots: day.spots.filter(s => s.id !== active.id) }
            : day
        );
      }

      // 新增到目標容器
      if (overContainer === UNSCHEDULED_ID) {
        newUnscheduled = [...newUnscheduled, activeSpot];
      } else {
        newDays = newDays.map(day =>
          day.id === overContainer
            ? { ...day, spots: [...day.spots, activeSpot] }
            : day
        );
      }

      return { ...trip, unscheduledSpots: newUnscheduled, days: newDays };
    });
  }, [getCurrentTrip, activeSpot, findContainer, updateCurrentTrip]);

  /**
   * 拖曳結束事件處理 - 同容器排序 (Handle Drag End)
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const currentTrip = getCurrentTrip();
    if (!currentTrip) {
      clearDragState();
      return;
    }
    
    const { active, over } = event;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over?.id as string || '');

    // 同容器內排序
    if (activeContainer && overContainer && activeContainer === overContainer) {
      if (activeContainer === UNSCHEDULED_ID) {
        // 待安排區排序
        const oldIndex = currentTrip.unscheduledSpots.findIndex(s => s.id === active.id);
        const newIndex = currentTrip.unscheduledSpots.findIndex(s => s.id === over?.id);
        
        if (oldIndex !== newIndex && newIndex !== -1) {
          updateCurrentTrip(trip => ({
            ...trip,
            unscheduledSpots: arrayMove(trip.unscheduledSpots, oldIndex, newIndex)
          }));
        }
      } else {
        // 日行程排序
        const dayIndex = currentTrip.days.findIndex(d => d.id === activeContainer);
        const spots = currentTrip.days[dayIndex].spots;
        const oldIndex = spots.findIndex(s => s.id === active.id);
        
        let newIndex;
        // 如果放在天容器上（而非具體景點），則移到最後
        if (currentTrip.days.some(d => d.id === over?.id)) {
          newIndex = spots.length - 1;
        } else {
          newIndex = spots.findIndex(s => s.id === over?.id);
        }

        if (oldIndex !== newIndex && newIndex !== -1) {
          updateCurrentTrip(trip => ({
            ...trip,
            days: trip.days.map((day, idx) => 
              idx === dayIndex 
                ? { ...day, spots: arrayMove(day.spots, oldIndex, newIndex) }
                : day
            )
          }));
        }
      }
    }
    
    clearDragState();
  }, [getCurrentTrip, findContainer, updateCurrentTrip, clearDragState]);

  return {
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    UNSCHEDULED_ID
  };
};
