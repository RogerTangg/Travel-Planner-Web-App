/**
 * 景點集合卡片元件 (Spot Group Card Component)
 * 
 * 顯示景點集合，支援：
 * - 展開/收合顯示
 * - 集合內景點拖曳
 * - 集合編輯與刪除
 * 
 * @module components/SpotGroupCard
 */

import React, { useState, memo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Ungroup,
  X,
  Check,
  GripVertical
} from 'lucide-react';
import { SpotGroup, Spot } from '../types';
import { useTripStore, useUIStore } from '../stores';
import { SpotCard } from './SpotCard';
import { useHistory } from '../hooks';

interface SpotGroupCardProps {
  group: SpotGroup;
  spots: Spot[];
  onDeleteSpot: (id: string) => void;
  onUpdateSpot: (id: string, updates: Partial<Spot>) => void;
  onDuplicateSpot: (spot: Spot) => void;
}

// 預設顏色選項
const GROUP_COLORS = [
  '#F472B6', // 粉色
  '#FB923C', // 橙色
  '#FBBF24', // 黃色
  '#34D399', // 綠色
  '#60A5FA', // 藍色
  '#A78BFA', // 紫色
  '#F87171', // 紅色
  '#94A3B8', // 灰色
];

export const SpotGroupCard: React.FC<SpotGroupCardProps> = memo(({
  group,
  spots,
  onDeleteSpot,
  onUpdateSpot,
  onDuplicateSpot
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editColor, setEditColor] = useState(group.color || GROUP_COLORS[0]);
  
  const updateSpotGroup = useTripStore(state => state.updateSpotGroup);
  const deleteSpotGroup = useTripStore(state => state.deleteSpotGroup);
  const toggleGroupCollapsed = useTripStore(state => state.toggleGroupCollapsed);
  const setSelectedSpot = useUIStore(state => state.setSelectedSpot);
  const showConfirm = useUIStore(state => state.showConfirm);
  const hideConfirm = useUIStore(state => state.hideConfirm);
  const { saveBeforeAction } = useHistory();

  const handleSaveEdit = () => {
    saveBeforeAction('編輯集合');
    updateSpotGroup(group.id, { 
      name: editName.trim() || group.name,
      color: editColor 
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(group.name);
    setEditColor(group.color || GROUP_COLORS[0]);
    setIsEditing(false);
  };

  const handleDelete = () => {
    showConfirm({
      title: '刪除集合',
      message: '確定要刪除此集合嗎？您可以選擇保留或同時刪除集合內的景點。',
      type: 'warning',
      onConfirm: () => {
        saveBeforeAction('刪除集合');
        deleteSpotGroup(group.id, false); // 保留景點
        hideConfirm();
      }
    });
  };

  const handleDeleteWithSpots = () => {
    showConfirm({
      title: '刪除集合與景點',
      message: `確定要刪除此集合以及其中的 ${spots.length} 個景點嗎？此操作無法復原。`,
      type: 'danger',
      onConfirm: () => {
        saveBeforeAction('刪除集合與景點');
        deleteSpotGroup(group.id, true);
        hideConfirm();
      }
    });
  };

  const handleUngroup = () => {
    saveBeforeAction('解散集合');
    deleteSpotGroup(group.id, false);
  };

  return (
    <div 
      className="mb-3 rounded-xl border-2 overflow-hidden transition-all"
      style={{ borderColor: group.color || GROUP_COLORS[0] }}
    >
      {/* 集合標題列 */}
      <div 
        className="flex items-center gap-2 px-3 py-2 cursor-pointer"
        style={{ backgroundColor: `${group.color || GROUP_COLORS[0]}15` }}
      >
        {/* 拖曳把手 */}
        <div className="text-gray-400 cursor-grab">
          <GripVertical size={14} />
        </div>

        {/* 展開/收合按鈕 */}
        <button
          onClick={() => toggleGroupCollapsed(group.id)}
          className="p-0.5 hover:bg-white/50 rounded transition-colors"
        >
          {group.collapsed ? (
            <ChevronRight size={16} style={{ color: group.color }} />
          ) : (
            <ChevronDown size={16} style={{ color: group.color }} />
          )}
        </button>

        {/* 集合名稱 */}
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sakura-200"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
            />
            {/* 顏色選擇 */}
            <div className="flex gap-1">
              {GROUP_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`w-5 h-5 rounded-full border-2 transition-transform ${
                    editColor === color ? 'scale-110 border-gray-600' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button 
              onClick={handleSaveEdit}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <Check size={14} />
            </button>
            <button 
              onClick={handleCancelEdit}
              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <span 
              className="flex-1 text-sm font-semibold truncate"
              style={{ color: group.color }}
            >
              {group.name}
            </span>
            <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-white/50 rounded-full">
              {spots.length} 個景點
            </span>
          </>
        )}

        {/* 操作按鈕 */}
        {!isEditing && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
              title="編輯集合"
            >
              <Edit3 size={12} />
            </button>
            <button
              onClick={handleUngroup}
              className="p-1.5 text-gray-400 hover:text-amber-500 hover:bg-amber-50 rounded transition-colors"
              title="解散集合（保留景點）"
            >
              <Ungroup size={12} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
              title="刪除集合"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* 集合內的景點列表 */}
      {!group.collapsed && (
        <div className="p-2 bg-white/50 space-y-1">
          {spots.length === 0 ? (
            <div className="text-center text-xs text-gray-400 py-4">
              集合內沒有景點
            </div>
          ) : (
            spots.map(spot => (
              <SpotCard
                key={spot.id}
                spot={spot}
                onDelete={onDeleteSpot}
                onClick={setSelectedSpot}
                onUpdate={onUpdateSpot}
                onDuplicate={onDuplicateSpot}
                compact={true}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
});

SpotGroupCard.displayName = 'SpotGroupCard';

export default SpotGroupCard;
