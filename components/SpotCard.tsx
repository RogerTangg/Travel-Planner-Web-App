import React, { useState, useMemo } from 'react';
import { Spot, SpotCategory } from '../types';
import { MapPin, Clock, Utensils, Bed, Train, Map as MapIcon, GripVertical, Trash2, Edit3, X, ShoppingBag, Building2, Torii, TreePine, Coffee, Wine, Gamepad2 } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SpotCardProps {
  spot: Spot;
  onDelete: (id: string) => void;
  onClick: (spot: Spot) => void;
  onUpdate?: (id: string, updates: Partial<Spot>) => void;
  isOverlay?: boolean;
  compact?: boolean; // For Staging area
}

const getIcon = (category: SpotCategory) => {
  switch (category) {
    case SpotCategory.FOOD: return <Utensils size={14} />;
    case SpotCategory.CAFE: return <Coffee size={14} />;
    case SpotCategory.BAR: return <Wine size={14} />;
    case SpotCategory.HOTEL: return <Bed size={14} />;
    case SpotCategory.COMMUTE: return <Train size={14} />;
    case SpotCategory.SHOPPING: return <ShoppingBag size={14} />;
    case SpotCategory.MUSEUM: return <Building2 size={14} />;
    case SpotCategory.SHRINE_TEMPLE: return <Torii size={14} />;
    case SpotCategory.PARK: return <TreePine size={14} />;
    case SpotCategory.ENTERTAINMENT: return <Gamepad2 size={14} />;
    case SpotCategory.CUSTOM: return <MapIcon size={14} />;
    default: return <MapPin size={14} />;
  }
};

const getCategoryColor = (category: SpotCategory) => {
  switch (category) {
    case SpotCategory.FOOD: return 'bg-orange-50 text-orange-600 border-orange-100';
    case SpotCategory.CAFE: return 'bg-amber-50 text-amber-600 border-amber-100';
    case SpotCategory.BAR: return 'bg-violet-50 text-violet-600 border-violet-100';
    case SpotCategory.HOTEL: return 'bg-blue-50 text-blue-600 border-blue-100';
    case SpotCategory.COMMUTE: return 'bg-slate-50 text-slate-600 border-slate-100';
    case SpotCategory.SHOPPING: return 'bg-pink-50 text-pink-600 border-pink-100';
    case SpotCategory.MUSEUM: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    case SpotCategory.SHRINE_TEMPLE: return 'bg-red-50 text-red-600 border-red-100';
    case SpotCategory.PARK: return 'bg-green-50 text-green-600 border-green-100';
    case SpotCategory.ENTERTAINMENT: return 'bg-cyan-50 text-cyan-600 border-cyan-100';
    case SpotCategory.CUSTOM: return 'bg-purple-50 text-purple-600 border-purple-100';
    default: return 'bg-rose-50 text-rose-600 border-rose-100';
  }
};

// Helper to parse duration string to minutes (e.g., "1.5小時" -> 90, "30分鐘" -> 30)
const parseDuration = (durationStr?: string): number => {
  if (!durationStr) return 0;
  
  // Try to find numbers
  const numberMatch = durationStr.match(/(\d+(\.\d+)?)/);
  if (!numberMatch) return 0;
  
  const value = parseFloat(numberMatch[0]);
  
  if (durationStr.includes('小時') || durationStr.includes('hr') || durationStr.includes('h')) {
    return Math.round(value * 60);
  }
  
  return Math.round(value);
};

// Helper to format minutes into "h小時m分鐘"
const formatDurationDisplay = (minutes: number): string => {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  
  if (h > 0 && m > 0) return `${h}小時${m}分鐘`;
  if (h > 0) return `${h}小時`;
  return `${m}分鐘`;
};

// Helper to add minutes to HH:MM time
const addMinutesToTime = (timeStr: string, minutes: number): string => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  
  const date = new Date();
  date.setHours(h, m + minutes);
  
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export const SpotCard: React.FC<SpotCardProps> = ({ spot, onDelete, onClick, onUpdate, isOverlay, compact }) => {
  const [isEditing, setIsEditing] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: spot.id, data: { ...spot } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    scale: isDragging ? 1.02 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  const durationMinutes = useMemo(() => parseDuration(spot.suggestedTime), [spot.suggestedTime]);
  
  // Calculate End Time
  const endTime = useMemo(() => {
    if (!spot.startTime || durationMinutes === 0) return null;
    return addMinutesToTime(spot.startTime, durationMinutes);
  }, [spot.startTime, durationMinutes]);

  const durationDisplay = useMemo(() => formatDurationDisplay(durationMinutes), [durationMinutes]);

  if (spot.isLoading) {
    return (
      <div className="p-4 mb-3 bg-white/80 backdrop-blur-sm rounded-xl border border-sakura-200 shadow-sm animate-pulse">
        <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-sakura-100/50"></div>
            <div className="flex-1 py-1">
                <div className="h-4 bg-sakura-100/50 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </div>
        </div>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<Spot>) => {
      if (onUpdate) onUpdate(spot.id, updates);
  };

  // Helper to stop drag propagation on inputs/buttons
  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes} 
      {...listeners}
      className={`group relative bg-white rounded-xl border transition-all duration-200 mb-3 overflow-hidden select-none touch-none
        ${isOverlay ? 'shadow-2xl ring-2 ring-sakura-300 rotate-2 cursor-grabbing z-50' : 'shadow-sm hover:shadow-md border-gray-100 hover:border-sakura-200 cursor-grab active:cursor-grabbing'}
      `}
      onClick={() => !isEditing && onClick(spot)}
    >
      <div className="p-3 flex gap-3">
        {/* Time Column (Only in Timeline) */}
        {!compact && (
            <div className="flex flex-col items-center gap-1 pt-1 w-14 flex-shrink-0 border-r border-gray-50 pr-2">
                <div className="text-gray-300 group-hover:text-sakura-300 transition-colors mb-1 cursor-grab">
                     <GripVertical size={14} />
                </div>
                
                {/* Start Time */}
                <div className="flex flex-col items-center w-full">
                    {isEditing ? (
                        <input 
                            type="time" 
                            className="text-[10px] w-full p-0.5 bg-gray-50 border rounded text-center cursor-text outline-none focus:border-sakura-300"
                            value={spot.startTime || ''}
                            onChange={(e) => handleUpdate({ startTime: e.target.value })}
                            onPointerDown={stopPropagation}
                            onClick={stopPropagation}
                        />
                    ) : (
                        <div className={`text-xs font-bold font-mono tracking-tight text-center ${spot.startTime ? 'text-gray-600' : 'text-gray-300'}`}>
                            {spot.startTime || '--:--'}
                        </div>
                    )}
                </div>

                {/* Duration Indicator */}
                <div className="h-4 w-0.5 bg-gray-100 my-0.5 rounded-full relative group/time">
                     {/* Hover toolip for calculated duration could go here */}
                </div>

                {/* End Time (Calculated) */}
                <div className="text-[10px] font-mono text-gray-400 text-center">
                    {endTime || '--:--'}
                </div>
            </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* Header */}
            <div className="flex justify-between items-start gap-2">
              <h4 className="font-bold text-gray-800 text-sm truncate leading-tight pt-0.5">{spot.name}</h4>
              <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${getCategoryColor(spot.category)}`}>
                {getIcon(spot.category)}
                <span className="truncate max-w-[60px]">{spot.category}</span>
              </span>
            </div>
            
            {/* Description */}
            <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed tracking-wide">
              {spot.description}
            </p>

            {/* Actions/Footer */}
            <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2">
                 <div className="flex items-center gap-2 flex-1">
                    {isEditing ? (
                         <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-200 flex-1 animate-in fade-in max-w-[120px]">
                            <Clock size={10} className="text-gray-400" />
                            <input 
                                type="text" 
                                value={spot.suggestedTime || ''} 
                                onChange={(e) => handleUpdate({ suggestedTime: e.target.value })}
                                placeholder="90"
                                className="bg-transparent text-xs w-full outline-none text-gray-600 placeholder-gray-300 cursor-text"
                                onPointerDown={stopPropagation}
                                onClick={stopPropagation}
                            />
                            <span className="text-[10px] text-gray-400">分</span>
                        </div>
                    ) : (
                        durationDisplay && (
                            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md" title="建議停留時間">
                                <Clock size={10} />
                                {durationDisplay}
                            </span>
                        )
                    )}
                 </div>

                 {/* Action Buttons */}
                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button 
                        onClick={(e) => {
                            stopPropagation(e);
                            setIsEditing(!isEditing);
                        }}
                        onPointerDown={stopPropagation}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${isEditing ? 'text-sakura-500 bg-sakura-50' : 'text-gray-400 hover:text-sakura-500 hover:bg-gray-50'}`}
                        title="編輯詳情"
                    >
                        {isEditing ? <X size={13} /> : <Edit3 size={13} />}
                    </button>
                    <button 
                        onClick={(e) => {
                            stopPropagation(e);
                            onDelete(spot.id);
                        }}
                        onPointerDown={stopPropagation}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                        title="刪除"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Notes */}
            {(isEditing || spot.notes) && (
                <div className="mt-2 animate-in slide-in-from-top-1">
                    {isEditing ? (
                        <input
                            type="text"
                            value={spot.notes || ''}
                            onChange={(e) => handleUpdate({ notes: e.target.value })}
                            placeholder="新增備註..."
                            className="w-full text-[11px] bg-yellow-50/50 border border-yellow-100 rounded px-2 py-1.5 text-gray-600 focus:ring-1 focus:ring-yellow-200 outline-none placeholder-gray-300 cursor-text"
                            onPointerDown={stopPropagation}
                            onClick={stopPropagation}
                        />
                    ) : (
                        <div className="text-[10px] text-gray-500 bg-yellow-50/50 px-2 py-1 rounded border border-yellow-100/50 flex items-start gap-1">
                            <span className="text-yellow-500 mt-0.5">✎</span>
                            {spot.notes}
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};