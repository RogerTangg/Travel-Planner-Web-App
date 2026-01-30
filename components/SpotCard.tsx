import React, { useState, useMemo } from 'react';
import { Spot, SpotCategory } from '../types';
import { MapPin, Clock, Utensils, Bed, Train, Map as MapIcon, GripVertical, Trash2, Edit3, X, Check, ShoppingBag, Building2, Landmark, TreePine, Coffee, Wine, Gamepad2, Tag, Plus, ChevronDown } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TimePicker } from './TimePicker';

interface SpotCardProps {
  spot: Spot;
  onDelete: (id: string) => void;
  onClick: (spot: Spot) => void;
  onUpdate?: (id: string, updates: Partial<Spot>) => void;
  isOverlay?: boolean;
  compact?: boolean;
}

const CATEGORY_OPTIONS = Object.values(SpotCategory);

const getIcon = (category: SpotCategory) => {
  switch (category) {
    case SpotCategory.FOOD: return <Utensils size={14} />;
    case SpotCategory.CAFE: return <Coffee size={14} />;
    case SpotCategory.BAR: return <Wine size={14} />;
    case SpotCategory.HOTEL: return <Bed size={14} />;
    case SpotCategory.COMMUTE: return <Train size={14} />;
    case SpotCategory.SHOPPING: return <ShoppingBag size={14} />;
    case SpotCategory.MUSEUM: return <Building2 size={14} />;
    case SpotCategory.SHRINE_TEMPLE: return <Landmark size={14} />;
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

// Tag color palette
const TAG_COLORS = [
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-teal-100 text-teal-700',
  'bg-lime-100 text-lime-700',
];

const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

const parseDuration = (durationStr?: string): number => {
  if (!durationStr) return 0;
  const numberMatch = durationStr.match(/(\d+(\.\d+)?)/);
  if (!numberMatch) return 0;
  const value = parseFloat(numberMatch[0]);
  if (durationStr.includes('小時') || durationStr.includes('hr') || durationStr.includes('h')) {
    return Math.round(value * 60);
  }
  return Math.round(value);
};

const formatDurationDisplay = (minutes: number): string => {
  if (minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}小時${m}分鐘`;
  if (h > 0) return `${h}小時`;
  return `${m}分鐘`;
};

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
  const [editForm, setEditForm] = useState({
    name: spot.name,
    description: spot.description,
    category: spot.category,
    suggestedTime: spot.suggestedTime || '',
    lat: spot.coordinates.lat.toString(),
    lng: spot.coordinates.lng.toString(),
  });
  const [newTag, setNewTag] = useState('');
  
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

  const handleSaveEdit = () => {
    const lat = parseFloat(editForm.lat);
    const lng = parseFloat(editForm.lng);
    
    handleUpdate({
      name: editForm.name.trim() || spot.name,
      description: editForm.description.trim() || spot.description,
      category: editForm.category,
      suggestedTime: editForm.suggestedTime || spot.suggestedTime,
      coordinates: {
        lat: isNaN(lat) ? spot.coordinates.lat : lat,
        lng: isNaN(lng) ? spot.coordinates.lng : lng,
      }
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: spot.name,
      description: spot.description,
      category: spot.category,
      suggestedTime: spot.suggestedTime || '',
      lat: spot.coordinates.lat.toString(),
      lng: spot.coordinates.lng.toString(),
    });
    setIsEditing(false);
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    const currentTags = spot.tags || [];
    if (currentTags.includes(tag)) {
      setNewTag('');
      return;
    }
    handleUpdate({ tags: [...currentTags, tag] });
    setNewTag('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = spot.tags || [];
    handleUpdate({ tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const stopPropagation = (e: React.PointerEvent | React.MouseEvent) => {
    e.stopPropagation();
  };

  // Editing Mode - Full Form
  if (isEditing) {
    return (
      <div 
        ref={setNodeRef}
        className="bg-white rounded-xl border-2 border-sakura-200 shadow-lg mb-3 overflow-hidden"
      >
        <div className="bg-sakura-50 px-3 py-2 flex items-center justify-between border-b border-sakura-100">
          <span className="text-xs font-bold text-sakura-600 flex items-center gap-1">
            <Edit3 size={12} />
            編輯景點
          </span>
          <div className="flex gap-1">
            <button
              onClick={handleCancelEdit}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X size={14} />
            </button>
            <button
              onClick={handleSaveEdit}
              className="p-1 text-green-500 hover:text-green-600 rounded"
            >
              <Check size={14} />
            </button>
          </div>
        </div>
        
        <div className="p-3 space-y-3">
          {/* Name */}
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">名稱</label>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sakura-200 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">描述</label>
            <textarea
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              rows={2}
              className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sakura-200 outline-none resize-none"
            />
          </div>

          {/* Category & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-gray-500 mb-1 block">類別</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value as SpotCategory }))}
                className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sakura-200 outline-none"
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 mb-1 block">停留時間</label>
              <input
                type="text"
                value={editForm.suggestedTime}
                onChange={(e) => setEditForm(prev => ({ ...prev, suggestedTime: e.target.value }))}
                placeholder="60 分鐘"
                className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sakura-200 outline-none"
              />
            </div>
          </div>

          {/* Coordinates */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-medium text-gray-500 mb-1 block">緯度 (Lat)</label>
              <input
                type="text"
                value={editForm.lat}
                onChange={(e) => setEditForm(prev => ({ ...prev, lat: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sakura-200 outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-gray-500 mb-1 block">經度 (Lng)</label>
              <input
                type="text"
                value={editForm.lng}
                onChange={(e) => setEditForm(prev => ({ ...prev, lng: e.target.value }))}
                className="w-full px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sakura-200 outline-none font-mono"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">標籤</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {(spot.tags || []).map(tag => (
                <span
                  key={tag}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${getTagColor(tag)}`}
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="新增標籤..."
                className="flex-1 px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sakura-200 outline-none"
              />
              <button
                onClick={handleAddTag}
                className="px-2 py-1 bg-sakura-100 text-sakura-600 rounded-lg text-xs hover:bg-sakura-200"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal View Mode
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes} 
      {...listeners}
      className={`group relative bg-white rounded-xl border transition-all duration-200 mb-3 overflow-hidden select-none touch-none
        ${isOverlay ? 'shadow-2xl ring-2 ring-sakura-300 rotate-2 cursor-grabbing z-50' : 'shadow-sm hover:shadow-md border-gray-100 hover:border-sakura-200 cursor-grab active:cursor-grabbing'}
        ${spot.isManual ? 'border-l-4 border-l-amber-400' : ''}
      `}
      onClick={() => onClick(spot)}
    >
      <div className="p-3 flex gap-3">
        {/* Time Column (Only in Timeline) - Enhanced & Larger */}
        {!compact && (
          <div className="flex flex-col items-center gap-1 w-20 flex-shrink-0 border-r border-gray-100 pr-3">
            {/* Drag Handle */}
            <div className="text-gray-300 group-hover:text-sakura-300 transition-colors cursor-grab mb-1">
              <GripVertical size={16} />
            </div>
            
            {/* Start Time - Custom Picker */}
            <TimePicker
              value={spot.startTime || ''}
              onChange={(val) => handleUpdate({ startTime: val })}
              placeholder="--:--"
              size="sm"
            />

            {/* Duration indicator - Enhanced */}
            <div className="flex flex-col items-center py-1">
              <div className="w-0.5 h-3 bg-gradient-to-b from-sakura-300 to-sakura-400 rounded-full"></div>
              {durationDisplay && (
                <div className="text-[9px] text-sakura-500 font-semibold my-1 whitespace-nowrap bg-sakura-50 px-1.5 py-0.5 rounded-full">
                  {durationDisplay}
                </div>
              )}
              <div className="w-0.5 h-3 bg-gradient-to-b from-sakura-400 to-sakura-300 rounded-full"></div>
            </div>

            {/* End Time (calculated) - Larger */}
            <div className={`text-xs font-mono px-2 py-1 rounded-lg font-medium ${endTime ? 'text-gray-600 bg-gray-100' : 'text-gray-300 bg-gray-50'}`}>
              {endTime || '--:--'}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Header */}
          <div className="flex justify-between items-start gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-800 text-sm truncate leading-tight pt-0.5">
                {spot.name}
                {spot.isManual && <span className="ml-1 text-[10px] text-amber-500">(手動)</span>}
              </h4>
            </div>
            <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 font-medium ${getCategoryColor(spot.category)}`}>
              {getIcon(spot.category)}
              <span className="truncate max-w-[60px]">{spot.category}</span>
            </span>
          </div>
          
          {/* Description */}
          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed tracking-wide">
            {spot.description}
          </p>

          {/* Tags */}
          {spot.tags && spot.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {spot.tags.map(tag => (
                <span
                  key={tag}
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${getTagColor(tag)}`}
                >
                  <Tag size={8} className="mr-0.5" />
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Actions/Footer */}
          <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-2">
            <div className="flex items-center gap-2 flex-1">
              {durationDisplay && (
                <span className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md" title="建議停留時間">
                  <Clock size={10} />
                  {durationDisplay}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <button 
                onClick={(e) => {
                  stopPropagation(e);
                  setIsEditing(true);
                }}
                onPointerDown={stopPropagation}
                className="p-1.5 text-gray-400 hover:text-sakura-500 hover:bg-gray-50 rounded-md transition-colors cursor-pointer"
                title="編輯景點"
              >
                <Edit3 size={13} />
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
          {spot.notes && (
            <div className="mt-2">
              <div className="text-[10px] text-gray-500 bg-yellow-50/50 px-2 py-1 rounded border border-yellow-100/50 flex items-start gap-1">
                <span className="text-yellow-500 mt-0.5">✎</span>
                {spot.notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
