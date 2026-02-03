/**
 * 行程狀態管理 (Trip Store)
 * 
 * 使用 Zustand 管理行程相關狀態，包括：
 * - 行程 CRUD 操作
 * - 景點管理
 * - 景點集合管理
 * - localStorage 持久化
 * - 匯出/匯入功能
 * 
 * @module stores/tripStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Trip, DayPlan, Spot, SpotCategory, SpotGroup, TripSnapshot, ExportableTripData } from '../types';

// --- Constants ---
const LOCAL_STORAGE_KEY = 'travel-planner-trips';
const EXPORT_VERSION = '1.0.0';

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
  spotGroups: [],
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
  _hasHydrated: boolean;
  
  // Hydration
  setHasHydrated: (state: boolean) => void;
  
  // 計算屬性 (Computed)
  getCurrentTrip: () => Trip | null;
  getAllSpots: () => Spot[];
  getAllTags: () => string[];
  getSnapshot: () => TripSnapshot | null;
  
  // 行程操作 (Trip Actions)
  setCurrentTripId: (id: string | null) => void;
  createTrip: (title?: string) => Trip;
  deleteTrip: (tripId: string) => boolean;
  updateTrip: (tripId: string, updates: Partial<Trip>) => void;
  updateCurrentTrip: (updater: (trip: Trip) => Trip) => void;
  restoreSnapshot: (snapshot: TripSnapshot) => void;
  
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
  
  // 景點集合操作 (Spot Group Actions)
  createSpotGroup: (name: string, spotIds: string[], color?: string) => SpotGroup;
  updateSpotGroup: (groupId: string, updates: Partial<SpotGroup>) => void;
  deleteSpotGroup: (groupId: string, deleteSpots?: boolean) => void;
  addSpotsToGroup: (groupId: string, spotIds: string[]) => void;
  removeSpotsFromGroup: (groupId: string, spotIds: string[]) => void;
  toggleGroupCollapsed: (groupId: string) => void;
  getGroupSpots: (groupId: string) => Spot[];
  
  // 匯出/匯入操作 (Export/Import Actions)
  exportTrip: () => ExportableTripData | null;
  importTrip: (data: ExportableTripData) => boolean;
  
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
      _hasHydrated: false,
      
      // --- Hydration ---
      setHasHydrated: (state) => set({ _hasHydrated: state }),
      
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
      
      /**
       * 取得當前行程快照 (Get Current Trip Snapshot)
       * 用於 Undo 功能
       */
      getSnapshot: () => {
        const trip = get().getCurrentTrip();
        if (!trip) return null;
        return {
          days: JSON.parse(JSON.stringify(trip.days)),
          unscheduledSpots: JSON.parse(JSON.stringify(trip.unscheduledSpots)),
          spotGroups: JSON.parse(JSON.stringify(trip.spotGroups || []))
        };
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
      
      /**
       * 從快照還原行程 (Restore from Snapshot)
       * 用於 Undo/Redo 功能
       */
      restoreSnapshot: (snapshot) => {
        const { currentTripId } = get();
        if (!currentTripId) return;
        
        set(state => ({
          trips: state.trips.map(t => 
            t.id === currentTripId 
              ? { 
                  ...t, 
                  days: snapshot.days,
                  unscheduledSpots: snapshot.unscheduledSpots,
                  spotGroups: snapshot.spotGroups,
                  updatedAt: Date.now() 
                }
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
      
      // --- 景點集合操作 (Spot Group Actions) ---
      
      /**
       * 建立景點集合 (Create Spot Group)
       */
      createSpotGroup: (name, spotIds, color) => {
        const newGroup: SpotGroup = {
          id: crypto.randomUUID(),
          name,
          color: color || '#F472B6', // 預設櫻花粉色
          spotIds,
          collapsed: false
        };
        
        get().updateCurrentTrip(trip => ({
          ...trip,
          spotGroups: [...(trip.spotGroups || []), newGroup]
        }));
        
        return newGroup;
      },
      
      /**
       * 更新景點集合 (Update Spot Group)
       */
      updateSpotGroup: (groupId, updates) => {
        get().updateCurrentTrip(trip => ({
          ...trip,
          spotGroups: (trip.spotGroups || []).map(g => 
            g.id === groupId ? { ...g, ...updates } : g
          )
        }));
      },
      
      /**
       * 刪除景點集合 (Delete Spot Group)
       * @param deleteSpots - 是否同時刪除集合內的景點
       */
      deleteSpotGroup: (groupId, deleteSpots = false) => {
        get().updateCurrentTrip(trip => {
          const group = (trip.spotGroups || []).find(g => g.id === groupId);
          if (!group) return trip;
          
          let newTrip = {
            ...trip,
            spotGroups: (trip.spotGroups || []).filter(g => g.id !== groupId)
          };
          
          // 若需要刪除集合內的景點
          if (deleteSpots) {
            const spotIdsToDelete = new Set(group.spotIds);
            newTrip = {
              ...newTrip,
              unscheduledSpots: newTrip.unscheduledSpots.filter(s => !spotIdsToDelete.has(s.id)),
              days: newTrip.days.map(d => ({
                ...d,
                spots: d.spots.filter(s => !spotIdsToDelete.has(s.id))
              }))
            };
          }
          
          return newTrip;
        });
      },
      
      /**
       * 新增景點到集合 (Add Spots to Group)
       */
      addSpotsToGroup: (groupId, spotIds) => {
        get().updateCurrentTrip(trip => ({
          ...trip,
          spotGroups: (trip.spotGroups || []).map(g => 
            g.id === groupId 
              ? { ...g, spotIds: [...new Set([...g.spotIds, ...spotIds])] }
              : g
          )
        }));
      },
      
      /**
       * 從集合移除景點 (Remove Spots from Group)
       */
      removeSpotsFromGroup: (groupId, spotIds) => {
        const spotIdSet = new Set(spotIds);
        get().updateCurrentTrip(trip => ({
          ...trip,
          spotGroups: (trip.spotGroups || []).map(g => 
            g.id === groupId 
              ? { ...g, spotIds: g.spotIds.filter(id => !spotIdSet.has(id)) }
              : g
          )
        }));
      },
      
      /**
       * 切換集合展開/收合 (Toggle Group Collapsed)
       */
      toggleGroupCollapsed: (groupId) => {
        get().updateCurrentTrip(trip => ({
          ...trip,
          spotGroups: (trip.spotGroups || []).map(g => 
            g.id === groupId ? { ...g, collapsed: !g.collapsed } : g
          )
        }));
      },
      
      /**
       * 取得集合內的景點 (Get Group Spots)
       */
      getGroupSpots: (groupId) => {
        const trip = get().getCurrentTrip();
        if (!trip) return [];
        
        const group = (trip.spotGroups || []).find(g => g.id === groupId);
        if (!group) return [];
        
        const allSpots = [...trip.unscheduledSpots, ...trip.days.flatMap(d => d.spots)];
        const spotMap = new Map(allSpots.map(s => [s.id, s]));
        
        return group.spotIds
          .map(id => spotMap.get(id))
          .filter(Boolean) as Spot[];
      },
      
      // --- 匯出/匯入操作 (Export/Import Actions) ---
      
      /**
       * 匯出當前行程為 JSON (Export Trip)
       */
      exportTrip: () => {
        const trip = get().getCurrentTrip();
        if (!trip) return null;
        
        const exportData: ExportableTripData = {
          version: EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          trip: {
            title: trip.title,
            dayCount: trip.dayCount,
            days: trip.days,
            unscheduledSpots: trip.unscheduledSpots,
            spotGroups: trip.spotGroups || []
          }
        };
        
        return exportData;
      },
      
      /**
       * 匯入行程 JSON (Import Trip)
       * @returns 是否匯入成功
       */
      importTrip: (data) => {
        try {
          // 驗證資料格式
          if (!data.version || !data.trip) {
            console.error('Invalid import data format');
            return false;
          }
          
          // 建立新行程
          const newTrip: Trip = {
            id: crypto.randomUUID(),
            title: data.trip.title || '匯入的行程',
            dayCount: data.trip.dayCount || data.trip.days.length,
            days: data.trip.days.map((day, index) => ({
              ...day,
              id: `day-${index + 1}-${Date.now()}` // 重新產生 ID 避免衝突
            })),
            unscheduledSpots: data.trip.unscheduledSpots.map(spot => ({
              ...spot,
              id: crypto.randomUUID() // 重新產生 ID 避免衝突
            })),
            spotGroups: (data.trip.spotGroups || []).map(group => ({
              ...group,
              id: crypto.randomUUID() // 重新產生 ID 避免衝突
            })),
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          
          // 更新景點 ID 對應（因為景點 ID 已重新產生）
          // 這裡需要建立舊 ID -> 新 ID 的映射
          const oldToNewSpotIds = new Map<string, string>();
          
          // 處理 days 內的景點
          newTrip.days = data.trip.days.map((day, dayIndex) => ({
            ...day,
            id: `day-${dayIndex + 1}-${Date.now()}`,
            spots: day.spots.map(spot => {
              const newId = crypto.randomUUID();
              oldToNewSpotIds.set(spot.id, newId);
              return { ...spot, id: newId };
            })
          }));
          
          // 處理未排程景點
          newTrip.unscheduledSpots = data.trip.unscheduledSpots.map(spot => {
            const newId = crypto.randomUUID();
            oldToNewSpotIds.set(spot.id, newId);
            return { ...spot, id: newId };
          });
          
          // 更新集合內的景點 ID 對應
          newTrip.spotGroups = (data.trip.spotGroups || []).map(group => ({
            ...group,
            id: crypto.randomUUID(),
            spotIds: group.spotIds
              .map(oldId => oldToNewSpotIds.get(oldId))
              .filter(Boolean) as string[]
          }));
          
          set(state => ({
            trips: [newTrip, ...state.trips],
            currentTripId: newTrip.id
          }));
          
          return true;
        } catch (error) {
          console.error('Import trip error:', error);
          return false;
        }
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
        const { trips, currentTripId, _hasHydrated } = get();
        
        // 防止重複初始化
        if (_hasHydrated) return;
        
        // 使用單一 set 呼叫避免多次更新
        if (trips.length === 0) {
          const newTrip = createNewTrip('我的旅行計畫');
          set({
            trips: [newTrip],
            currentTripId: newTrip.id,
            _hasHydrated: true
          });
        } else {
          set({
            currentTripId: currentTripId || trips[0].id,
            _hasHydrated: true
          });
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
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Zustand hydration error:', error);
          return;
        }
        // 使用 queueMicrotask 確保在 React 渲染後執行
        if (state) {
          queueMicrotask(() => {
            state.initializeStore();
          });
        }
      }
    }
  )
);
