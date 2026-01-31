/**
 * 行程狀態管理 (Trip Store)
 * 
 * 使用 Zustand 管理行程相關狀態，包括：
 * - 行程 CRUD 操作
 * - 景點管理
 * - localStorage 持久化
 * 
 * @module stores/tripStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Trip, DayPlan, Spot, SpotCategory } from '../types';

// --- Constants ---
const LOCAL_STORAGE_KEY = 'travel-planner-trips';

// --- Helper Functions ---

/**
 * 建立新行程 (Create New Trip)
 * @param title - 行程標題
 * @returns 新建立的行程物件
 */
export const createNewTrip = (title: string = '新行程'): Trip => ({
  id: crypto.randomUUID(),
  title,
  dayCount: 3,
  days: [
    { id: 'day-1', title: 'Day 1', spots: [] },
    { id: 'day-2', title: 'Day 2', spots: [] },
    { id: 'day-3', title: 'Day 3', spots: [] }
  ],
  unscheduledSpots: [],
  createdAt: Date.now(),
  updatedAt: Date.now()
});

/**
 * 建立佔位景點 (Create Placeholder Spot)
 * 用於 AI 分析時顯示載入狀態
 */
export const createPlaceholderSpot = (name: string): Spot => ({
  id: crypto.randomUUID(),
  name,
  description: 'AI 正在探索詳情...',
  category: SpotCategory.CUSTOM,
  coordinates: { lat: 35.6895, lng: 139.6917 },
  isLoading: true
});

/**
 * 建立手動景點 (Create Manual Spot)
 */
export const createManualSpot = (name: string): Spot => ({
  id: crypto.randomUUID(),
  name,
  description: '手動新增的景點',
  category: SpotCategory.CUSTOM,
  coordinates: { lat: 35.6895, lng: 139.6917 },
  suggestedTime: '60 分鐘',
  isManual: true,
  isLoading: false
});

// --- Store Interface ---
interface TripState {
  // 狀態 (State)
  trips: Trip[];
  currentTripId: string | null;
  
  // 計算屬性 (Computed)
  getCurrentTrip: () => Trip | null;
  getAllSpots: () => Spot[];
  getAllTags: () => string[];
  
  // 行程操作 (Trip Actions)
  setCurrentTripId: (id: string | null) => void;
  createTrip: (title?: string) => Trip;
  deleteTrip: (tripId: string) => boolean;
  updateTrip: (tripId: string, updates: Partial<Trip>) => void;
  updateCurrentTrip: (updater: (trip: Trip) => Trip) => void;
  
  // 天數操作 (Day Actions)
  updateDayCount: (count: number) => void;
  updateDaySpots: (dayId: string, spots: Spot[]) => void;
  
  // 景點操作 (Spot Actions)
  addSpot: (spot: Spot, dayId?: string) => void;
  addSpotToUnscheduled: (spot: Spot) => void;
  updateSpot: (spotId: string, updates: Partial<Spot>) => void;
  deleteSpot: (spotId: string) => void;
  duplicateSpot: (spot: Spot) => void;
  moveSpot: (spotId: string, fromContainer: string, toContainer: string, newIndex?: number) => void;
  reorderSpots: (containerId: string, oldIndex: number, newIndex: number) => void;
  clearUnscheduledSpots: () => void;
  collectAllSpots: () => void;
  
  // 批次操作 (Batch Actions)
  batchAddSpots: (spots: Spot[]) => void;
  updateSpotsAfterSchedule: (schedule: { dayId: string; spots: { id: string; startTime?: string }[] }[]) => void;
  
  // 初始化 (Initialization)
  initializeStore: () => void;
}

/**
 * 行程 Store (Trip Store)
 * 
 * 使用 Zustand persist middleware 自動同步 localStorage
 */
export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      // --- 狀態初始值 (Initial State) ---
      trips: [],
      currentTripId: null,
      
      // --- 計算屬性 (Computed Properties) ---
      getCurrentTrip: () => {
        const { trips, currentTripId } = get();
        return trips.find(t => t.id === currentTripId) || null;
      },
      
      getAllSpots: () => {
        const trip = get().getCurrentTrip();
        if (!trip) return [];
        return [
          ...trip.unscheduledSpots,
          ...trip.days.flatMap(d => d.spots)
        ].filter(s => !s.isLoading);
      },
      
      getAllTags: () => {
        const trip = get().getCurrentTrip();
        if (!trip) return [];
        const tagSet = new Set<string>();
        [...trip.unscheduledSpots, ...trip.days.flatMap(d => d.spots)].forEach(spot => {
          (spot.tags || []).forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
      },
      
      // --- 行程操作 (Trip Actions) ---
      setCurrentTripId: (id) => set({ currentTripId: id }),
      
      createTrip: (title) => {
        const newTrip = createNewTrip(title);
        set(state => ({
          trips: [newTrip, ...state.trips],
          currentTripId: newTrip.id
        }));
        return newTrip;
      },
      
      deleteTrip: (tripId) => {
        const { trips, currentTripId } = get();
        if (trips.length <= 1) return false;
        
        set(state => {
          const newTrips = state.trips.filter(t => t.id !== tripId);
          return {
            trips: newTrips,
            currentTripId: currentTripId === tripId && newTrips.length > 0 
              ? newTrips[0].id 
              : currentTripId
          };
        });
        return true;
      },
      
      updateTrip: (tripId, updates) => {
        set(state => ({
          trips: state.trips.map(t => 
            t.id === tripId 
              ? { ...t, ...updates, updatedAt: Date.now() }
              : t
          )
        }));
      },
      
      updateCurrentTrip: (updater) => {
        const { currentTripId } = get();
        if (!currentTripId) return;
        
        set(state => ({
          trips: state.trips.map(t => 
            t.id === currentTripId 
              ? { ...updater(t), updatedAt: Date.now() }
              : t
          )
        }));
      },
      
      // --- 天數操作 (Day Actions) ---
      updateDayCount: (count) => {
        const trip = get().getCurrentTrip();
        if (!trip) return;
        
        const safeCount = Math.max(1, Math.min(14, count));
        
        get().updateCurrentTrip(t => {
          let newDays = [...t.days];
          let newUnscheduled = [...t.unscheduledSpots];

          if (newDays.length < safeCount) {
            // 增加天數
            const additionalDays = Array.from({ length: safeCount - newDays.length }).map((_, i) => ({
              id: `day-${newDays.length + i + 1}-${Date.now()}`,
              title: `Day ${newDays.length + i + 1}`,
              spots: []
            }));
            newDays = [...newDays, ...additionalDays];
          } else if (newDays.length > safeCount) {
            // 減少天數，收回被刪除天數的景點
            const deletedDays = newDays.slice(safeCount);
            const spotsToSave = deletedDays.flatMap(d => d.spots);
            newUnscheduled = [...newUnscheduled, ...spotsToSave];
            newDays = newDays.slice(0, safeCount);
          }

          return {
            ...t,
            dayCount: safeCount,
            days: newDays,
            unscheduledSpots: newUnscheduled
          };
        });
      },
      
      updateDaySpots: (dayId, spots) => {
        get().updateCurrentTrip(trip => ({
          ...trip,
          days: trip.days.map(day => 
            day.id === dayId ? { ...day, spots } : day
          )
        }));
      },
      
      // --- 景點操作 (Spot Actions) ---
      addSpot: (spot, dayId) => {
        get().updateCurrentTrip(trip => {
          if (dayId) {
            return {
              ...trip,
              days: trip.days.map(day => 
                day.id === dayId 
                  ? { ...day, spots: [...day.spots, spot] }
                  : day
              )
            };
          }
          return {
            ...trip,
            unscheduledSpots: [spot, ...trip.unscheduledSpots]
          };
        });
      },
      
      addSpotToUnscheduled: (spot) => {
        get().updateCurrentTrip(trip => ({
          ...trip,
          unscheduledSpots: [spot, ...trip.unscheduledSpots]
        }));
      },
      
      updateSpot: (spotId, updates) => {
        get().updateCurrentTrip(trip => ({
          ...trip,
          unscheduledSpots: trip.unscheduledSpots.map(s => 
            s.id === spotId ? { ...s, ...updates } : s
          ),
          days: trip.days.map(day => ({
            ...day,
            spots: day.spots.map(s => 
              s.id === spotId ? { ...s, ...updates } : s
            )
          }))
        }));
      },
      
      deleteSpot: (spotId) => {
        get().updateCurrentTrip(trip => ({
          ...trip,
          unscheduledSpots: trip.unscheduledSpots.filter(s => s.id !== spotId),
          days: trip.days.map(day => ({
            ...day,
            spots: day.spots.filter(s => s.id !== spotId)
          }))
        }));
      },
      
      duplicateSpot: (spot) => {
        const duplicatedSpot: Spot = {
          ...spot,
          id: crypto.randomUUID(),
          name: `${spot.name} (副本)`,
          startTime: undefined,
          endTime: undefined
        };
        get().addSpotToUnscheduled(duplicatedSpot);
      },
      
      moveSpot: (spotId, fromContainer, toContainer, newIndex) => {
        const trip = get().getCurrentTrip();
        if (!trip) return;
        
        // 找到要移動的景點
        let spotToMove: Spot | undefined;
        if (fromContainer === 'unscheduled-container') {
          spotToMove = trip.unscheduledSpots.find(s => s.id === spotId);
        } else {
          const fromDay = trip.days.find(d => d.id === fromContainer);
          spotToMove = fromDay?.spots.find(s => s.id === spotId);
        }
        
        if (!spotToMove) return;
        
        get().updateCurrentTrip(t => {
          let newUnscheduled = [...t.unscheduledSpots];
          let newDays = [...t.days];
          
          // 從來源移除
          if (fromContainer === 'unscheduled-container') {
            newUnscheduled = newUnscheduled.filter(s => s.id !== spotId);
          } else {
            newDays = newDays.map(day => 
              day.id === fromContainer 
                ? { ...day, spots: day.spots.filter(s => s.id !== spotId) }
                : day
            );
          }
          
          // 新增到目標
          if (toContainer === 'unscheduled-container') {
            newUnscheduled = [...newUnscheduled, spotToMove!];
          } else {
            newDays = newDays.map(day => {
              if (day.id === toContainer) {
                const spots = [...day.spots];
                if (newIndex !== undefined) {
                  spots.splice(newIndex, 0, spotToMove!);
                } else {
                  spots.push(spotToMove!);
                }
                return { ...day, spots };
              }
              return day;
            });
          }
          
          return { ...t, unscheduledSpots: newUnscheduled, days: newDays };
        });
      },
      
      reorderSpots: (containerId, oldIndex, newIndex) => {
        if (oldIndex === newIndex) return;
        
        get().updateCurrentTrip(trip => {
          if (containerId === 'unscheduled-container') {
            const newSpots = [...trip.unscheduledSpots];
            const [removed] = newSpots.splice(oldIndex, 1);
            newSpots.splice(newIndex, 0, removed);
            return { ...trip, unscheduledSpots: newSpots };
          }
          
          return {
            ...trip,
            days: trip.days.map(day => {
              if (day.id === containerId) {
                const newSpots = [...day.spots];
                const [removed] = newSpots.splice(oldIndex, 1);
                newSpots.splice(newIndex, 0, removed);
                return { ...day, spots: newSpots };
              }
              return day;
            })
          };
        });
      },
      
      clearUnscheduledSpots: () => {
        get().updateCurrentTrip(trip => ({
          ...trip,
          unscheduledSpots: []
        }));
      },
      
      collectAllSpots: () => {
        get().updateCurrentTrip(trip => {
          const allScheduledSpots = trip.days.flatMap(d => 
            d.spots.map(spot => ({
              ...spot,
              startTime: undefined // 清除排程時間
            }))
          );
          
          return {
            ...trip,
            days: trip.days.map(d => ({ ...d, spots: [] })),
            unscheduledSpots: [...allScheduledSpots, ...trip.unscheduledSpots]
          };
        });
      },
      
      // --- 批次操作 (Batch Actions) ---
      batchAddSpots: (spots) => {
        get().updateCurrentTrip(trip => ({
          ...trip,
          unscheduledSpots: [...spots, ...trip.unscheduledSpots]
        }));
      },
      
      updateSpotsAfterSchedule: (schedule) => {
        get().updateCurrentTrip(trip => {
          const spotMap = new Map(trip.unscheduledSpots.map(s => [s.id, s]));
          const assignedIds = new Set<string>();

          const newDays = trip.days.map(day => {
            const daySchedule = schedule.find(s => s.dayId === day.id);
            if (!daySchedule) return day;

            const spotsToAdd = daySchedule.spots
              .filter(item => spotMap.has(item.id) && !assignedIds.has(item.id))
              .map(item => {
                assignedIds.add(item.id);
                const spot = spotMap.get(item.id)!;
                return {
                  ...spot,
                  startTime: item.startTime || spot.startTime
                };
              });

            return {
              ...day,
              spots: [...day.spots, ...spotsToAdd]
            };
          });

          const newUnscheduled = trip.unscheduledSpots.filter(s => !assignedIds.has(s.id));

          return {
            ...trip,
            days: newDays,
            unscheduledSpots: newUnscheduled
          };
        });
      },
      
      // --- 初始化 (Initialization) ---
      initializeStore: () => {
        const { trips } = get();
        if (trips.length === 0) {
          get().createTrip('我的旅行計畫');
        } else if (!get().currentTripId) {
          set({ currentTripId: trips[0].id });
        }
      }
    }),
    {
      name: LOCAL_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        trips: state.trips,
        currentTripId: state.currentTripId
      }),
      onRehydrateStorage: () => (state) => {
        // 重新載入後初始化
        if (state) {
          state.initializeStore();
        }
      }
    }
  )
);
