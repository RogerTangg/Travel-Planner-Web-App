/**
 * 拖曳操作 Hook (Drag and Drop Hook)
 * 
 * 封裝 @dnd-kit 的拖曳邏輯，處理：
 * - 跨容器拖曳（待安排 <-> 各天行程）
 * - 同容器排序
 * - 拖曳狀態管理
 * - 歷史紀錄整合
 * 
 * @module hooks/useDragAndDrop
 */

import { useCallback, useRef } from 'react';
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
import { useTripStore, useUIStore, useHistoryStore } from '../stores';
import { Trip, Spot, DayPlan } from '../types';

// 常數定義
const UNSCHEDULED_ID = 'unscheduled-container';

export const useDragAndDrop = () => {
  // 只訂閱需要響應變化的狀態
  const activeSpot = useUIStore(state => state.activeSpot);
  
  // 用於追蹤是否已保存快照（避免重複保存）
  const hasSnapshotSavedRef = useRef(false);

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
    const { getCurrentTrip } = useTripStore.getState();
    const currentTrip = getCurrentTrip();
    if (!currentTrip) return null;

    // 檢查是否為容器本身
    if (id === UNSCHEDULED_ID) return UNSCHEDULED_ID;
    if (currentTrip.days.some((d: DayPlan) => d.id === id)) return id;

    // 檢查是否在待安排區
    if (currentTrip.unscheduledSpots.some((s: Spot) => s.id === id)) return UNSCHEDULED_ID;

    // 檢查是否在某天的行程中
    const foundDay = currentTrip.days.find((d: DayPlan) => d.spots.some((s: Spot) => s.id === id));
    return foundDay ? foundDay.id : null;
  }, []);

  /**
   * 拖曳開始事件處理 (Handle Drag Start)
   * 在開始拖曳時保存快照，用於 Undo
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { getCurrentTrip, getSnapshot } = useTripStore.getState();
    const { setDragState } = useUIStore.getState();
    const { pushHistory } = useHistoryStore.getState();

    const currentTrip = getCurrentTrip();
    if (!currentTrip) return;

    const { active } = event;
    const activeId = active.id as string;

    // 找出被拖曳的景點
    const spot =
      currentTrip.unscheduledSpots.find((s: Spot) => s.id === activeId) ||
      currentTrip.days.flatMap((d: DayPlan) => d.spots).find((s: Spot) => s.id === activeId);

    setDragState(activeId, spot || null);
    
    // 保存拖曳前的快照
    const snapshot = getSnapshot();
    if (snapshot) {
      pushHistory('移動景點', snapshot);
      hasSnapshotSavedRef.current = true;
    }
  }, []);

  /**
   * 拖曳經過事件處理 - 跨容器移動 (Handle Drag Over)
   */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { getCurrentTrip, updateCurrentTrip } = useTripStore.getState();

    const currentTrip = getCurrentTrip();
    if (!currentTrip || !activeSpot) return;

    const { active, over } = event;
    if (!over) return;
    
    const overId = over.id as string;
    const activeId = active.id as string;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    // 同容器或無效容器則不處理
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    updateCurrentTrip((trip: Trip) => {
      let newUnscheduled = [...trip.unscheduledSpots];
      let newDays = [...trip.days];

      // 從來源容器移除
      if (activeContainer === UNSCHEDULED_ID) {
        newUnscheduled = newUnscheduled.filter((s: Spot) => s.id !== active.id);
      } else {
        newDays = newDays.map((day: DayPlan) =>
          day.id === activeContainer
            ? { ...day, spots: day.spots.filter((s: Spot) => s.id !== active.id) }
            : day
        );
      }

      // 新增到目標容器
      if (overContainer === UNSCHEDULED_ID) {
        newUnscheduled = [...newUnscheduled, activeSpot];
      } else {
        newDays = newDays.map((day: DayPlan) =>
          day.id === overContainer
            ? { ...day, spots: [...day.spots, activeSpot] }
            : day
        );
      }

      return { ...trip, unscheduledSpots: newUnscheduled, days: newDays };
    });
  }, [activeSpot, findContainer]);

  /**
   * 拖曳結束事件處理 - 同容器排序 (Handle Drag End)
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { getCurrentTrip, updateCurrentTrip } = useTripStore.getState();
    const { clearDragState } = useUIStore.getState();

    const currentTrip = getCurrentTrip();
    if (!currentTrip) {
      clearDragState();
      return;
    }

    const { active, over } = event;
    const activeId = active.id as string;
    const overId = over?.id as string || '';

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    // 同容器內排序
    if (activeContainer && overContainer && activeContainer === overContainer) {
      if (activeContainer === UNSCHEDULED_ID) {
        // 待安排區排序
        const oldIndex = currentTrip.unscheduledSpots.findIndex((s: Spot) => s.id === activeId);
        const newIndex = currentTrip.unscheduledSpots.findIndex((s: Spot) => s.id === overId);

        if (oldIndex !== newIndex && newIndex !== -1) {
          updateCurrentTrip((trip: Trip) => ({
            ...trip,
            unscheduledSpots: arrayMove(trip.unscheduledSpots, oldIndex, newIndex)
          }));
        }
      } else {
        // 日行程排序
        const dayIndex = currentTrip.days.findIndex((d: DayPlan) => d.id === activeContainer);
        if (dayIndex === -1) {
          clearDragState();
          hasSnapshotSavedRef.current = false;
          return;
        }
        const spots = currentTrip.days[dayIndex].spots;
        const oldIndex = spots.findIndex((s: Spot) => s.id === activeId);

        let newIndex;
        // 如果放在天容器上（而非具體景點），則移到最後
        if (currentTrip.days.some((d: DayPlan) => d.id === overId)) {
          newIndex = spots.length - 1;
        } else {
          newIndex = spots.findIndex((s: Spot) => s.id === overId);
        }

        if (oldIndex !== newIndex && newIndex !== -1) {
          updateCurrentTrip((trip: Trip) => ({
            ...trip,
            days: trip.days.map((day: DayPlan, idx: number) =>
              idx === dayIndex
                ? { ...day, spots: arrayMove(day.spots, oldIndex, newIndex) }
                : day
            )
          }));
        }
      }
    }

    clearDragState();
    hasSnapshotSavedRef.current = false;  // 重置快照標記
  }, [findContainer]);

  return {
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    UNSCHEDULED_ID
  };
};
