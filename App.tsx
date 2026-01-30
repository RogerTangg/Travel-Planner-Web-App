import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  DayPlan, 
  Spot, 
  SpotCategory,
  Trip
} from './types';
import { 
  Plus, 
  Sparkles, 
  Map as MapIcon, 
  Search,
  Calendar,
  ListTodo,
  MapPin,
  Upload,
  FolderPlus,
  Trash2,
  ChevronRight,
  Save,
  Tag,
  PenLine,
  X,
  Undo2
} from 'lucide-react';
import { 
  DndContext, 
  DragOverlay, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  pointerWithin,
  useDroppable
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { createRoot } from 'react-dom/client';

import { SpotCard } from './components/SpotCard';
import { MapPreview } from './components/MapPreview';
import { ConfirmDialog } from './components/ConfirmDialog';
import { analyzeSpotWithAI, optimizeDaySchedule, extractSpotsFromText, scheduleUnscheduledSpots } from './services/geminiService';

// --- Constants ---
const UNSCHEDULED_ID = 'unscheduled-container';
const LOCAL_STORAGE_KEY = 'travel-planner-trips';

// --- Confirm Dialog State Type ---
interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

// --- Helper Components ---
const LoadingOverlay = ({ text = 'AI 優化中...' }: { text?: string }) => (
  <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-2xl">
    <div className="flex flex-col items-center">
      <div className="bg-white p-3 rounded-full shadow-lg border border-sakura-100 mb-2 animate-pulse">
        <Sparkles className="text-sakura-500" size={20} />
      </div>
      <span className="text-sakura-500 font-bold text-xs">{text}</span>
    </div>
  </div>
);

// Wrapper to make a container explicitly droppable
const DroppableContainer = ({ 
  id, 
  children, 
  className,
  active 
}: { 
  id: string, 
  children?: React.ReactNode, 
  className?: string,
  active?: boolean 
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`${className} ${isOver && !active ? 'ring-2 ring-sakura-300 ring-opacity-50 bg-sakura-50/30' : ''} transition-all`}
    >
      {children}
    </div>
  );
};

// --- Local Storage Helpers ---
const loadTripsFromStorage = (): Trip[] => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Trip[];
    }
  } catch (e) {
    console.error('Error loading trips from storage:', e);
  }
  return [];
};

const saveTripsToStorage = (trips: Trip[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trips));
  } catch (e) {
    console.error('Error saving trips to storage:', e);
  }
};

const createNewTrip = (title: string = '新行程'): Trip => ({
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

const App: React.FC = () => {
  // --- Trips State ---
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [showTripList, setShowTripList] = useState(false);

  // Get current trip
  const currentTrip = trips.find(t => t.id === currentTripId) || null;

  // --- UI / Drag State ---
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeSpot, setActiveSpot] = useState<Spot | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [isOptimizing, setIsOptimizing] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);

  // Input State
  const [newSpotName, setNewSpotName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get all unique tags from current trip
  const allTags = useMemo(() => {
    if (!currentTrip) return [];
    const tagSet = new Set<string>();
    [...currentTrip.unscheduledSpots, ...currentTrip.days.flatMap(d => d.spots)].forEach(spot => {
      (spot.tags || []).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [currentTrip]);

  // --- Load trips on mount ---
  useEffect(() => {
    const storedTrips = loadTripsFromStorage();
    if (storedTrips.length > 0) {
      setTrips(storedTrips);
      setCurrentTripId(storedTrips[0].id);
    } else {
      // Create default trip
      const defaultTrip = createNewTrip('我的旅行計畫');
      setTrips([defaultTrip]);
      setCurrentTripId(defaultTrip.id);
    }
  }, []);

  // --- Auto-save trips ---
  useEffect(() => {
    if (trips.length > 0) {
      saveTripsToStorage(trips);
    }
  }, [trips]);

  // --- Trip Management ---
  const updateCurrentTrip = useCallback((updater: (trip: Trip) => Trip) => {
    setTrips(prev => prev.map(t => 
      t.id === currentTripId 
        ? { ...updater(t), updatedAt: Date.now() }
        : t
    ));
  }, [currentTripId]);

  const handleCreateTrip = () => {
    const newTrip = createNewTrip();
    setTrips(prev => [newTrip, ...prev]);
    setCurrentTripId(newTrip.id);
    setShowTripList(false);
  };

  const handleDeleteTrip = (tripId: string) => {
    if (trips.length <= 1) {
      alert('至少需要保留一個行程');
      return;
    }
    
    setConfirmState({
      isOpen: true,
      title: '刪除行程',
      message: '確定要刪除這個行程嗎？此操作無法復原。',
      type: 'danger',
      onConfirm: () => {
        setTrips(prev => {
          const newTrips = prev.filter(t => t.id !== tripId);
          if (currentTripId === tripId && newTrips.length > 0) {
            setCurrentTripId(newTrips[0].id);
          }
          return newTrips;
        });
        setConfirmState(null);
      }
    });
  };

  const handleSelectTrip = (tripId: string) => {
    setCurrentTripId(tripId);
    setShowTripList(false);
    setSelectedSpot(null);
  };

  // --- Helpers ---
  const updateDayCount = (count: number) => {
    if (!currentTrip) return;
    const safeCount = Math.max(1, Math.min(14, count));
    
    updateCurrentTrip(trip => {
      let newDays = [...trip.days];
      let newUnscheduled = [...trip.unscheduledSpots];

      if (newDays.length < safeCount) {
        const additionalDays = Array.from({ length: safeCount - newDays.length }).map((_, i) => ({
          id: `day-${newDays.length + i + 1}-${Date.now()}`,
          title: `Day ${newDays.length + i + 1}`,
          spots: []
        }));
        newDays = [...newDays, ...additionalDays];
      } else if (newDays.length > safeCount) {
        const deletedDays = newDays.slice(safeCount);
        const spotsToSave = deletedDays.flatMap(d => d.spots);
        newUnscheduled = [...newUnscheduled, ...spotsToSave];
        newDays = newDays.slice(0, safeCount);
      }

      return {
        ...trip,
        dayCount: safeCount,
        days: newDays,
        unscheduledSpots: newUnscheduled
      };
    });
  };

  const handleUpdateSpot = (id: string, updates: Partial<Spot>) => {
    updateCurrentTrip(trip => ({
      ...trip,
      unscheduledSpots: trip.unscheduledSpots.map(s => s.id === id ? { ...s, ...updates } : s),
      days: trip.days.map(day => ({
        ...day,
        spots: day.spots.map(s => s.id === id ? { ...s, ...updates } : s)
      }))
    }));
  };

  const handleDeleteSpot = (id: string) => {
    updateCurrentTrip(trip => ({
      ...trip,
      unscheduledSpots: trip.unscheduledSpots.filter(s => s.id !== id),
      days: trip.days.map(day => ({
        ...day,
        spots: day.spots.filter(s => s.id !== id)
      }))
    }));
    if (selectedSpot?.id === id) setSelectedSpot(null);
  };

  const createPlaceholderSpot = (name: string): Spot => ({
    id: crypto.randomUUID(),
    name: name,
    description: "AI 正在探索詳情...",
    category: SpotCategory.CUSTOM,
    coordinates: { lat: 35.6895, lng: 139.6917 },
    isLoading: true
  });

  const createManualSpot = (name: string): Spot => ({
    id: crypto.randomUUID(),
    name: name,
    description: "手動新增的景點",
    category: SpotCategory.CUSTOM,
    coordinates: { lat: 35.6895, lng: 139.6917 },
    suggestedTime: "60 分鐘",
    isManual: true,
    isLoading: false
  });

  const handleAddQuickModule = (category: SpotCategory, label: string) => {
    if (!currentTrip) return;
    
    const newSpot: Spot = {
      id: crypto.randomUUID(),
      name: `新${label}`,
      description: `請編輯此${label}的詳細資訊`,
      category: category,
      coordinates: { lat: 35.6895, lng: 139.6917 },
      suggestedTime: category === SpotCategory.COMMUTE ? "30 分鐘" : 
                     category === SpotCategory.FOOD ? "90 分鐘" :
                     category === SpotCategory.MUSEUM ? "120 分鐘" : "60 分鐘",
      isManual: true,
      isLoading: false
    };
    
    updateCurrentTrip(trip => ({
      ...trip,
      unscheduledSpots: [newSpot, ...trip.unscheduledSpots]
    }));
  };

  const analyzeAndFillSpot = async (id: string, name: string) => {
    const analysis = await analyzeSpotWithAI(name);
    
    updateCurrentTrip(trip => ({
      ...trip,
      unscheduledSpots: trip.unscheduledSpots.map(spot => {
        if (spot.id === id) {
          return {
            ...spot,
            name: analysis.name,
            description: analysis.description,
            category: analysis.category as SpotCategory,
            coordinates: { lat: analysis.coordinates[0], lng: analysis.coordinates[1] },
            address: analysis.address,
            suggestedTime: analysis.suggestedTime,
            isLoading: false
          };
        }
        return spot;
      })
    }));
  };

  const handleAddSpot = async (e?: React.FormEvent, directName?: string) => {
    if (e) e.preventDefault();
    if (!currentTrip) return;
    
    const nameToAdd = directName || newSpotName;
    if (!nameToAdd.trim()) return;

    setNewSpotName("");

    // Manual mode - no AI
    if (isManualMode) {
      const newSpot = createManualSpot(nameToAdd);
      updateCurrentTrip(trip => ({
        ...trip,
        unscheduledSpots: [newSpot, ...trip.unscheduledSpots]
      }));
      return;
    }

    // AI mode
    setIsAnalyzing(true);
    
    const newSpot = createPlaceholderSpot(nameToAdd);
    updateCurrentTrip(trip => ({
      ...trip,
      unscheduledSpots: [newSpot, ...trip.unscheduledSpots]
    }));

    await analyzeAndFillSpot(newSpot.id, nameToAdd);
    setIsAnalyzing(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTrip) return;

    setIsAnalyzing(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setIsAnalyzing(false);
        return;
      }

      try {
        const spotNames = await extractSpotsFromText(text);
        
        if (spotNames.length === 0) {
          alert("無法從檔案中識別出景點。請確認檔案包含文字描述。");
          setIsAnalyzing(false);
          return;
        }

        const newSpots = spotNames.map(name => createPlaceholderSpot(name));
        updateCurrentTrip(trip => ({
          ...trip,
          unscheduledSpots: [...newSpots, ...trip.unscheduledSpots]
        }));

        await Promise.all(newSpots.map(s => analyzeAndFillSpot(s.id, s.name)));

      } catch (error) {
        console.error("File processing error", error);
        alert("處理檔案時發生錯誤");
      } finally {
        setIsAnalyzing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleOptimizeDay = async (dayId: string) => {
    if (!currentTrip) return;
    const day = currentTrip.days.find(d => d.id === dayId);
    if (!day || day.spots.length < 2) return;

    setIsOptimizing(dayId);
    const sortedIds = await optimizeDaySchedule(day.spots);
    
    updateCurrentTrip(trip => ({
      ...trip,
      days: trip.days.map(d => {
        if (d.id === dayId) {
          const spotMap = new Map(d.spots.map(s => [s.id, s]));
          const newSpots = sortedIds.map(id => spotMap.get(id)).filter(Boolean) as Spot[];
          if (newSpots.length !== d.spots.length) return d;
          return { ...d, spots: newSpots };
        }
        return d;
      })
    }));
    setIsOptimizing(null);
  };

  // --- AI Smart Scheduling for Unscheduled Spots ---
  const handleSmartSchedule = async () => {
    if (!currentTrip || currentTrip.unscheduledSpots.length === 0) return;
    
    const loadingSpots = currentTrip.unscheduledSpots.filter(s => s.isLoading);
    if (loadingSpots.length > 0) {
      alert('請等待所有景點分析完成後再進行智慧排程');
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
        alert('智慧排程暫時無法處理，請稍後再試或手動安排');
        setIsScheduling(false);
        return;
      }

      updateCurrentTrip(trip => {
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
              // Apply the scheduled startTime
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

    } catch (error) {
      console.error("Smart scheduling error:", error);
      alert("智慧排程發生錯誤，請稍後再試");
    } finally {
      setIsScheduling(false);
    }
  };

  // --- Clear all unscheduled spots ---
  const handleClearUnscheduled = () => {
    if (!currentTrip || currentTrip.unscheduledSpots.length === 0) return;
    
    setConfirmState({
      isOpen: true,
      title: '清空待安排景點',
      message: `確定要刪除所有 ${currentTrip.unscheduledSpots.length} 個待安排景點嗎？此操作無法復原。`,
      type: 'danger',
      onConfirm: () => {
        updateCurrentTrip(trip => ({
          ...trip,
          unscheduledSpots: []
        }));
        setSelectedSpot(null);
        setConfirmState(null);
      }
    });
  };

  // --- Collect all spots from schedule back to unscheduled ---
  const handleCollectAllSpots = () => {
    if (!currentTrip) return;
    
    const totalScheduledSpots = currentTrip.days.reduce((acc, d) => acc + d.spots.length, 0);
    if (totalScheduledSpots === 0) return;
    
    setConfirmState({
      isOpen: true,
      title: '收回全部景點',
      message: `確定要將所有 ${totalScheduledSpots} 個已排程景點收回至待安排清單嗎？`,
      type: 'warning',
      onConfirm: () => {
        updateCurrentTrip(trip => {
          // Collect all spots from all days
          const allScheduledSpots = trip.days.flatMap(d => 
            d.spots.map(spot => ({
              ...spot,
              startTime: undefined // Clear the scheduled time
            }))
          );
          
          return {
            ...trip,
            days: trip.days.map(d => ({ ...d, spots: [] })),
            unscheduledSpots: [...allScheduledSpots, ...trip.unscheduledSpots]
          };
        });
        setSelectedSpot(null);
        setConfirmState(null);
      }
    });
  };



  // --- Drag & Drop Logic ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const findContainer = (id: string) => {
    if (!currentTrip) return null;
    if (id === UNSCHEDULED_ID) return UNSCHEDULED_ID;
    if (currentTrip.days.some(d => d.id === id)) return id;
    if (currentTrip.unscheduledSpots.some(s => s.id === id)) return UNSCHEDULED_ID;
    const foundDay = currentTrip.days.find(d => d.spots.some(s => s.id === id));
    return foundDay ? foundDay.id : null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    if (!currentTrip) return;
    const { active } = event;
    setActiveId(active.id as string);
    const spot = 
      currentTrip.unscheduledSpots.find(s => s.id === active.id) || 
      currentTrip.days.flatMap(d => d.spots).find(s => s.id === active.id);
    setActiveSpot(spot || null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!currentTrip || !activeSpot) return;
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over.id as string);

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    updateCurrentTrip(trip => {
      let newUnscheduled = [...trip.unscheduledSpots];
      let newDays = [...trip.days];

      // Remove from source
      if (activeContainer === UNSCHEDULED_ID) {
        newUnscheduled = newUnscheduled.filter(s => s.id !== active.id);
      } else {
        newDays = newDays.map(day => 
          day.id === activeContainer 
            ? { ...day, spots: day.spots.filter(s => s.id !== active.id) }
            : day
        );
      }

      // Add to destination
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
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!currentTrip) return;
    const { active, over } = event;
    const activeContainer = findContainer(active.id as string);
    const overContainer = findContainer(over?.id as string || '');

    if (activeContainer && overContainer && activeContainer === overContainer) {
      if (activeContainer === UNSCHEDULED_ID) {
        const oldIndex = currentTrip.unscheduledSpots.findIndex(s => s.id === active.id);
        const newIndex = currentTrip.unscheduledSpots.findIndex(s => s.id === over?.id);
        if (oldIndex !== newIndex && newIndex !== -1) {
          updateCurrentTrip(trip => ({
            ...trip,
            unscheduledSpots: arrayMove(trip.unscheduledSpots, oldIndex, newIndex)
          }));
        }
      } else {
        const dayIndex = currentTrip.days.findIndex(d => d.id === activeContainer);
        const spots = currentTrip.days[dayIndex].spots;
        const oldIndex = spots.findIndex(s => s.id === active.id);
        
        let newIndex;
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
    
    setActiveId(null);
    setActiveSpot(null);
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.5' } } }),
  };

  const allSpots = currentTrip 
    ? [...currentTrip.unscheduledSpots, ...currentTrip.days.flatMap(d => d.spots)].filter(s => !s.isLoading)
    : [];

  if (!currentTrip) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-sakura-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 text-warm-800 font-sans overflow-hidden">
      <DndContext 
        sensors={sensors}
        collisionDetection={pointerWithin} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
      
      {/* --- Column 1: Staging (Left) --- */}
      <div className="w-[320px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        {/* Title Block */}
        <div className="p-5 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src="/logo.svg" alt="Logo" className="w-7 h-7" />
              <h1 className="font-bold text-lg text-gray-800">Travel Planner</h1>
            </div>
          </div>

          {/* Trip Selector */}
          <div className="mb-3">
            <button
              onClick={() => setShowTripList(!showTripList)}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <span className="text-sm font-medium text-gray-700 truncate">{currentTrip.title}</span>
              <ChevronRight size={16} className={`text-gray-400 transition-transform ${showTripList ? 'rotate-90' : ''}`} />
            </button>
            
            {showTripList && (
              <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                <div className="max-h-[200px] overflow-y-auto">
                  {trips.map(trip => (
                    <div 
                      key={trip.id}
                      className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer ${trip.id === currentTripId ? 'bg-sakura-50' : ''}`}
                      onClick={() => handleSelectTrip(trip.id)}
                    >
                      <span className="text-sm truncate flex-1">{trip.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrip(trip.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 ml-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleCreateTrip}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 border-t border-gray-100 text-sakura-500 hover:bg-sakura-50 transition-colors"
                >
                  <FolderPlus size={16} />
                  <span className="text-sm font-medium">新增行程</span>
                </button>
              </div>
            )}
          </div>

          <input 
            type="text" 
            value={currentTrip.title} 
            onChange={(e) => updateCurrentTrip(trip => ({ ...trip, title: e.target.value }))}
            className="w-full text-base font-bold text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border-transparent focus:bg-white focus:ring-2 focus:ring-sakura-200 transition-all outline-none" 
          />
          <div className="flex items-center justify-between mt-3 bg-gray-50 p-2 rounded-lg">
            <span className="text-xs font-medium text-gray-500 ml-1">旅遊天數</span>
            <div className="flex items-center gap-2">
              <button onClick={() => updateDayCount(currentTrip.dayCount - 1)} className="w-6 h-6 rounded hover:bg-white text-gray-500 shadow-sm">-</button>
              <span className="text-sm font-bold w-4 text-center">{currentTrip.dayCount}</span>
              <button onClick={() => updateDayCount(currentTrip.dayCount + 1)} className="w-6 h-6 rounded hover:bg-white text-gray-500 shadow-sm">+</button>
            </div>
          </div>
        </div>

        {/* Search & Upload */}
        <div className="p-4 border-b border-gray-100">
          <form onSubmit={handleAddSpot} className="relative mb-3">
            {/* Main Input - Full Width */}
            <div className="relative mb-2">
              <input 
                type="text" 
                placeholder={isManualMode ? "手動輸入景點名稱..." : "輸入景點名稱 (AI 智慧分析)..."} 
                value={newSpotName}
                onChange={(e) => setNewSpotName(e.target.value)}
                className={`w-full pl-11 pr-4 py-4 bg-gray-50 border-2 rounded-2xl text-base focus:bg-white focus:ring-2 outline-none transition-all ${isManualMode ? 'border-amber-300 focus:ring-amber-200 focus:border-amber-400' : 'border-gray-200 focus:ring-sakura-200 focus:border-sakura-300'}`}
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>
            
            {/* Action Buttons Row */}
            <div className="flex gap-2">
              <button 
                type="submit"
                disabled={!newSpotName.trim() || (isAnalyzing && !isManualMode)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-sm hover:shadow-md border-2 disabled:opacity-50 font-medium transition-all ${isManualMode ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100' : 'bg-sakura-50 text-sakura-600 border-sakura-200 hover:bg-sakura-100'}`}
              >
                {isAnalyzing && newSpotName && !isManualMode ? (
                  <div className="animate-spin h-4 w-4 border-2 border-sakura-500 border-t-transparent rounded-full"/>
                ) : (
                  <>
                    <Plus size={16} />
                    <span className="text-sm">新增景點</span>
                  </>
                )}
              </button>

              {/* Manual Mode Toggle */}
              <button 
                type="button"
                onClick={() => setIsManualMode(!isManualMode)}
                title={isManualMode ? "切換為 AI 模式" : "切換為手動模式"}
                className={`px-3 py-2.5 rounded-xl shadow-sm hover:shadow border-2 transition-all ${isManualMode ? 'bg-amber-100 text-amber-600 border-amber-300' : 'bg-white text-gray-400 hover:text-amber-500 border-gray-200 hover:border-amber-200'}`}
              >
                <PenLine size={18} />
              </button>

              <div className="relative">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept=".txt,.csv,.md"
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnalyzing}
                  title="上傳行程文字檔"
                  className="px-3 py-2.5 bg-white text-gray-500 hover:text-sakura-500 rounded-xl shadow-sm hover:shadow border-2 border-gray-200 hover:border-sakura-200 disabled:opacity-50 transition-all"
                >
                  {isAnalyzing && !newSpotName ? <div className="animate-spin h-4 w-4 border-2 border-sakura-500 border-t-transparent rounded-full"/> : <Upload size={18} />}
                </button>
              </div>
            </div>
          </form>
          
          {/* Quick Module Tags */}
          <div className="mb-3 p-2 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-1 mb-2">
              <Sparkles size={12} className="text-sakura-400" />
              <span className="text-[10px] font-medium text-gray-500">快速新增模組</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '景點', icon: '🏛️', category: SpotCategory.SIGHTSEEING },
                { label: '交通', icon: '🚃', category: SpotCategory.COMMUTE },
                { label: '餐飲', icon: '🍜', category: SpotCategory.FOOD },
                { label: '購物', icon: '🛍️', category: SpotCategory.SHOPPING },
                { label: '住宿', icon: '🏨', category: SpotCategory.HOTEL },
                { label: '文化', icon: '🎨', category: SpotCategory.MUSEUM },
                { label: '娛樂', icon: '🎢', category: SpotCategory.ENTERTAINMENT },
                { label: '自然', icon: '🌳', category: SpotCategory.PARK },
              ].map(module => (
                <button
                  key={module.label}
                  type="button"
                  onClick={() => handleAddQuickModule(module.category, module.label)}
                  className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-sakura-300 hover:bg-sakura-50 hover:text-sakura-600 transition-all shadow-sm"
                >
                  <span>{module.icon}</span>
                  <span>{module.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1 mb-2">
                <Tag size={12} className="text-gray-400" />
                <span className="text-[10px] font-medium text-gray-500">標籤篩選</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedTagFilter && (
                  <button
                    onClick={() => setSelectedTagFilter(null)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                  >
                    <X size={10} />
                    清除
                  </button>
                )}
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTagFilter(selectedTagFilter === tag ? null : tag)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${selectedTagFilter === tag ? 'bg-sakura-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-sakura-100'}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Unscheduled List */}
        <DroppableContainer 
          id={UNSCHEDULED_ID}
          className="flex-1 overflow-y-auto bg-gray-50/50 p-3 custom-scrollbar relative"
          active={activeId !== null}
        >
          {isScheduling && <LoadingOverlay text="AI 智慧排程中..." />}
          
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <ListTodo size={14} className="text-sakura-500" />
              <span className="text-xs font-bold text-gray-600">待安排景點</span>
              <span className="bg-sakura-100 text-sakura-600 text-[10px] px-1.5 rounded-full font-bold">{currentTrip.unscheduledSpots.length}</span>
            </div>
            
            {currentTrip.unscheduledSpots.length > 0 && (
              <div className="flex items-center gap-1">
                {/* Clear All Button */}
                <button
                  onClick={handleClearUnscheduled}
                  className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-[10px] font-medium hover:border-red-200 hover:text-red-500 transition-all"
                  title="清空所有待安排景點"
                >
                  <Trash2 size={10} />
                </button>
                
                {/* Smart Schedule Button */}
                <button
                  onClick={handleSmartSchedule}
                  disabled={isScheduling || currentTrip.unscheduledSpots.some(s => s.isLoading)}
                  className="flex items-center gap-1 px-2 py-1 bg-sakura-500 text-white rounded-lg text-[10px] font-medium hover:bg-sakura-600 hover:shadow-md disabled:opacity-50 transition-all"
                >
                  <Sparkles size={10} />
                  智慧排程
                </button>
              </div>
            )}
          </div>
          
          {(() => {
            const filteredSpots = currentTrip.unscheduledSpots.filter(
              spot => !selectedTagFilter || (spot.tags || []).includes(selectedTagFilter)
            );
            return (
              <SortableContext 
                id={UNSCHEDULED_ID}
                items={filteredSpots.map(s => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {filteredSpots.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-2 opacity-50 min-h-[100px]">
                    <span className="text-xs">
                      {currentTrip.unscheduledSpots.length === 0 
                        ? '清單是空的' 
                        : '沒有符合篩選條件的景點'}
                    </span>
                  </div>
                )}
                {filteredSpots.map(spot => (
                  <SpotCard 
                    key={spot.id} 
                    spot={spot} 
                    onDelete={handleDeleteSpot} 
                    onClick={setSelectedSpot}
                    onUpdate={handleUpdateSpot}
                    compact={true}
                  />
                ))}
              </SortableContext>
            );
          })()}
        </DroppableContainer>
      </div>

      {/* --- Column 2: Timeline Itinerary (Middle - Fluid) --- */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F8F9FA] relative">
        <div className="h-14 border-b border-gray-200 bg-white/80 backdrop-blur flex items-center px-6 sticky top-0 z-30 justify-between">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={18} className="text-sakura-500" />
            行程總覽
          </h2>
          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-400">
              {currentTrip.days.reduce((acc, d) => acc + d.spots.length, 0)} 個行程點
            </div>
            {currentTrip.days.reduce((acc, d) => acc + d.spots.length, 0) > 0 && (
              <button
                onClick={handleCollectAllSpots}
                className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:border-amber-300 hover:text-amber-600 transition-all"
                title="收回全部景點至待安排清單"
              >
                <Undo2 size={12} />
                收回全部
              </button>
            )}
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <Save size={12} />
              自動儲存
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-12 pb-20">
            {currentTrip.days.map((day, dayIndex) => (
              <div key={day.id} className="relative pl-8 border-l-2 border-dashed border-gray-200/80">
                {/* Day Marker */}
                <div className="absolute -left-[21px] top-0 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-white border-4 border-sakura-100 flex items-center justify-center shadow-sm z-10 text-sakura-600 font-black text-sm">
                    {dayIndex + 1}
                  </div>
                </div>
                
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pl-2">
                  <h3 className="text-lg font-bold text-gray-800">{day.title}</h3>
                  <button 
                    onClick={() => handleOptimizeDay(day.id)}
                    disabled={day.spots.length < 2}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:text-sakura-600 hover:border-sakura-200 transition-all disabled:opacity-50"
                  >
                    <Sparkles size={12} />
                    智慧排序
                  </button>
                </div>

                {/* Drop Area */}
                <DroppableContainer 
                  id={day.id}
                  className="min-h-[100px] bg-white rounded-2xl border border-gray-100 shadow-sm p-4 relative"
                  active={activeId !== null}
                >
                  {isOptimizing === day.id && <LoadingOverlay />}
                  <SortableContext 
                    id={day.id}
                    items={day.spots.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {day.spots.length === 0 && (
                      <div className="h-24 flex flex-col items-center justify-center text-gray-300 border-2 border-dashed border-gray-50 rounded-xl">
                        <p className="text-xs">拖曳景點至此</p>
                      </div>
                    )}
                    {day.spots.map((spot, index) => (
                      <div key={spot.id} className="relative">
                        <SpotCard 
                          spot={spot} 
                          onDelete={handleDeleteSpot}
                          onClick={setSelectedSpot}
                          onUpdate={handleUpdateSpot}
                        />
                        {index < day.spots.length - 1 && (
                          <div className="absolute left-[26px] bottom-[-12px] top-[100%] w-0.5 bg-gray-100 z-0 h-3"></div>
                        )}
                      </div>
                    ))}
                  </SortableContext>
                </DroppableContainer>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- Column 3: Map (Right - Fixed) --- */}
      <div className="w-[38%] h-full bg-white border-l border-gray-200 relative hidden xl:block shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
        <div className="absolute top-4 right-4 z-[400] bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-md text-xs font-bold flex items-center gap-2 border border-gray-100">
          <MapPin size={14} className="text-sakura-500" />
          {selectedSpot ? `位置: ${selectedSpot.name}` : '地圖預覽'}
        </div>
        <MapPreview spots={allSpots} selectedSpot={selectedSpot} />
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeId && activeSpot ? (
          <div className="w-[300px]">
            <SpotCard 
              spot={activeSpot} 
              onDelete={() => {}} 
              onClick={() => {}} 
              isOverlay
            />
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>

      {/* Confirm Dialog */}
      {confirmState && (
        <ConfirmDialog
          isOpen={confirmState.isOpen}
          title={confirmState.title}
          message={confirmState.message}
          type={confirmState.type}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #E2E8F0;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #CBD5E1;
        }
      `}</style>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
