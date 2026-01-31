import React, { useState, useMemo, memo, useCallback } from 'react';
import { Spot, SpotCategory } from '../types';
import { MapPin, Utensils, Bed, Train, Map as MapIcon, GripVertical, Trash2, Edit3, X, Check, ShoppingBag, Building2, Landmark, TreePine, Coffee, Wine, Gamepad2, Tag, Plus, ChevronDown, Navigation, Copy, Camera, Eye } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TimePicker } from './TimePicker';
import { geocodeAddress } from '../services/geminiService';
import { SpotPhotoGallery, SpotPhotoStrip } from './SpotPhotoGallery';
import { useUIStore } from '../stores';

interface SpotCardProps {
  spot: Spot;
  onDelete: (id: string) => void;
  onClick: (spot: Spot) => void;
  onUpdate?: (id: string, updates: Partial<Spot>) => void;
  onDuplicate?: (spot: Spot) => void;
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

export const SpotCard: React.FC<SpotCardProps> = memo(({ spot, onDelete, onClick, onUpdate, onDuplicate, isOverlay, compact }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: spot.name,
    description: spot.description,
    category: spot.category,
    suggestedTime: spot.suggestedTime || '',
    address: spot.address || '',
    lat: spot.coordinates.lat.toString(),
    lng: spot.coordinates.lng.toString(),
  });
  const [newTag, setNewTag] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

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

  // Calculate display end time: use manual endTime or auto-calculate from startTime + duration
  const displayEndTime = useMemo(() => {
    if (spot.endTime) return spot.endTime;
    if (!spot.startTime || durationMinutes === 0) return null;
    return addMinutesToTime(spot.startTime, durationMinutes);
  }, [spot.endTime, spot.startTime, durationMinutes]);

  const durationDisplay = useMemo(() => formatDurationDisplay(durationMinutes), [durationMinutes]);

  if (spot.isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm mb-2 overflow-hidden">
        <div className="px-3 py-2 flex items-center gap-3">
          {/* Time Column skeleton */}
          {!compact && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="text-gray-200 mr-1">
                <GripVertical size={14} />
              </div>
              <div className="flex items-center gap-1 text-gray-300 text-xs font-mono">
                <span className="w-10 text-center">--:--</span>
                <span>-</span>
                <span className="w-10 text-center">--:--</span>
              </div>
            </div>
          )}
          {/* Content skeleton */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center gap-2 mb-1">
              <div className="h-4 bg-gray-100 rounded w-28 animate-pulse"></div>
              <div className="h-4 bg-gray-50 rounded w-14 animate-pulse"></div>
            </div>
            <div className="h-3 bg-gray-50 rounded w-40 animate-pulse"></div>
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
      address: editForm.address.trim() || spot.address,
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
      address: spot.address || '',
      lat: spot.coordinates.lat.toString(),
      lng: spot.coordinates.lng.toString(),
    });
    setIsEditing(false);
  };

  const handleGeocodeAddress = async () => {
    if (!editForm.address.trim()) return;

    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(editForm.address);
      if (result) {
        setEditForm(prev => ({
          ...prev,
          lat: result.lat.toString(),
          lng: result.lng.toString(),
          address: result.formattedAddress || prev.address
        }));
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    } finally {
      setIsGeocoding(false);
    }
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

          {/* Category */}
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

          {/* Address */}
          <div>
            <label className="text-[10px] font-medium text-gray-500 mb-1 block">地址</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="輸入完整地址..."
                className="flex-1 px-2 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-sakura-200 outline-none"
              />
              <button
                onClick={handleGeocodeAddress}
                disabled={isGeocoding || !editForm.address.trim()}
                className="px-2 py-1.5 bg-sakura-100 text-sakura-600 rounded-lg text-xs hover:bg-sakura-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                title="根據地址更新座標"
              >
                {isGeocoding ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <Navigation size={12} />
                )}
              </button>
            </div>
            <p className="text-[9px] text-gray-400 mt-0.5">修改地址後點擊定位按鈕更新座標</p>
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
      className={`group relative bg-white rounded-lg border transition-all duration-200 mb-2 overflow-hidden select-none touch-none
        ${isOverlay ? 'shadow-2xl ring-2 ring-sakura-300 rotate-2 cursor-grabbing z-50' : 'shadow-sm hover:shadow-md border-gray-100 hover:border-sakura-200 cursor-grab active:cursor-grabbing'}
        ${spot.isManual ? 'border-l-4 border-l-amber-400' : ''}
      `}
      onClick={() => onClick(spot)}
    >
      <div className="px-3 py-2 flex items-center gap-3">
        {/* Time Column (Only in Timeline) - Compact Design */}
        {!compact && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Drag Handle */}
            <div className="text-gray-300 group-hover:text-gray-400 transition-colors cursor-grab mr-1">
              <GripVertical size={14} />
            </div>

            {/* Start Time */}
            <TimePicker
              value={spot.startTime || ''}
              onChange={(val) => handleUpdate({ startTime: val })}
              label="開始時間"
            />

            {/* Separator */}
            <span className="text-gray-300 text-xs">-</span>

            {/* End Time */}
            <TimePicker
              value={spot.endTime || displayEndTime || ''}
              onChange={(val) => handleUpdate({ endTime: val })}
              label="結束時間"
            />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Header with Photo - 根據 compact 模式調整布局 */}
          <div className="flex flex-row gap-3 items-center">
            {/* 景點照片縮圖 (Spot Photo Thumbnail) */}
            {spot.photos && spot.photos.length > 0 && (
              <div className={`flex-shrink-0 ${compact ? 'w-12 h-12' : 'w-14 h-14'} rounded-lg overflow-hidden shadow-sm`}>
                <SpotPhotoGallery
                  photos={spot.photos}
                  spotName={spot.name}
                  thumbnailSize={compact ? 'sm' : 'md'}
                  className="w-full h-full"
                />
              </div>
            )}
            
            {/* 標題與資訊區塊 */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-gray-800 text-sm leading-tight">
                  <span className="line-clamp-1">{spot.name}</span>
                  {spot.isManual && <span className="ml-1 text-[10px] text-amber-500 font-medium">(手動)</span>}
                </h4>
                <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-md border flex items-center gap-0.5 font-medium ${getCategoryColor(spot.category)}`}>
                  {getIcon(spot.category)}
                </span>
              </div>

              {/* Description - Single Line */}
              <p className="text-[11px] text-gray-500 line-clamp-1 leading-relaxed mt-1.5">
                {spot.description}
              </p>

              {/* Address */}
              {spot.address && (
                <div className="flex items-center gap-1 mt-1">
                  <Navigation size={10} className="text-gray-400 flex-shrink-0" />
                  <p className="text-[10px] text-gray-400 line-clamp-1">
                    {spot.address}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {spot.tags && spot.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-50">
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
          <div className="mt-2 flex items-center justify-end">
            {/* Action Buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* 查看詳情按鈕 */}
              <button
                onClick={(e) => {
                  stopPropagation(e);
                  useUIStore.getState().openSpotDetailModal(spot);
                }}
                onPointerDown={stopPropagation}
                className="p-1.5 text-gray-400 hover:text-sakura-500 hover:bg-sakura-50 rounded-md transition-colors cursor-pointer"
                title="查看詳情"
              >
                <Eye size={13} />
              </button>
              {onDuplicate && (
                <button
                  onClick={(e) => {
                    stopPropagation(e);
                    onDuplicate(spot);
                  }}
                  onPointerDown={stopPropagation}
                  className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                  title="複製景點"
                >
                  <Copy size={13} />
                </button>
              )}
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
});

// 為 memo 元件設定 displayName 以便於調試 (Set displayName for debugging)
SpotCard.displayName = 'SpotCard';
