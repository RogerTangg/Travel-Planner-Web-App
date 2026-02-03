/**
 * 景點集合卡片元件 (Spot Group Card Component)
 * 
 * 採用虛線邊框卡片樣式（類似快速模組），支援：
 * - 接收拖曳的景點（Droppable）
 * - 集合內景點可拖曳出去
 * - 集合編輯與刪除
 * - 每個景點可單獨編輯
 * 
 * @module components/SpotGroupCard
 */

import React, { useState, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import {
  Edit3,
  Trash2,
  X,
  Check,
  GripVertical,
  Layers
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
  const removeSpotsFromGroup = useTripStore(state => state.removeSpotsFromGroup);
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
      message: spots.length > 0 
        ? '確定要刪除此集合嗎？集合內的景點將會保留在待安排區。'
        : '確定要刪除此空集合嗎？',
      type: 'warning',
      onConfirm: () => {
        saveBeforeAction('刪除集合');
        deleteSpotGroup(group.id, false); // 保留景點
        hideConfirm();
      }
    });
  };

  // 處理從集合移除景點
  const handleRemoveFromGroup = (spotId: string) => {
    saveBeforeAction('移除景點');
    removeSpotsFromGroup(group.id, [spotId]);
  };

  // 設定 Droppable，讓集合可以接收拖曳的景點
  const { setNodeRef, isOver } = useDroppable({
    id: `group-${group.id}`,
    data: {
      type: 'group',
      groupId: group.id
    }
  });

  const groupColor = group.color || GROUP_COLORS[0];

  return (
    <div 
      ref={setNodeRef}
      className={`mb-3 rounded-xl border-2 border-dashed overflow-hidden transition-all bg-white ${
        isOver 
          ? 'border-solid shadow-md scale-[1.01]' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      style={isOver ? { borderColor: groupColor } : {}}
    >
      {/* 集合標題列 */}
      <div 
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ 
          backgroundColor: `${groupColor}10`,
          borderColor: `${groupColor}30`
        }}
      >
        {/* 集合圖示 */}
        <div 
          className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
          style={{ backgroundColor: `${groupColor}20` }}
        >
          <Layers size={14} style={{ color: groupColor }} />
        </div>

        {/* 編輯模式 */}
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            {/* 第一行：名稱輸入 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sakura-200 min-w-0 bg-white"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <button 
                onClick={handleSaveEdit}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded shrink-0"
                title="儲存"
              >
                <Check size={14} />
              </button>
              <button 
                onClick={handleCancelEdit}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded shrink-0"
                title="取消"
              >
                <X size={14} />
              </button>
            </div>
            {/* 第二行：顏色選擇 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-gray-400 mr-1">顏色</span>
              {GROUP_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    editColor === color 
                      ? 'scale-110 border-gray-600 ring-2 ring-offset-1' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* 集合名稱 */}
            <span 
              className="flex-1 text-sm font-semibold truncate"
              style={{ color: groupColor }}
            >
              {group.name}
            </span>
            
            {/* 景點數量 */}
            <span 
              className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium"
              style={{ 
                backgroundColor: `${groupColor}15`,
                color: groupColor
              }}
            >
              {spots.length} 景點
            </span>

            {/* 操作按鈕 */}
            <div className="flex items-center gap-0.5 ml-1 shrink-0">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/80 rounded transition-colors"
                title="編輯集合"
              >
                <Edit3 size={12} />
              </button>
              <button
                onClick={handleDelete}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                title="刪除集合"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 集合內的景點列表 */}
      <div 
        className={`p-2 transition-colors ${
          isOver ? 'bg-gray-50/80' : 'bg-white'
        }`}
      >
        {spots.length === 0 ? (
          <div 
            className={`flex flex-col items-center justify-center text-xs py-6 rounded-lg border-2 border-dashed transition-all ${
              isOver 
                ? 'border-solid bg-white/80' 
                : 'border-gray-200 text-gray-400'
            }`}
            style={isOver ? { borderColor: groupColor, color: groupColor } : {}}
          >
            <GripVertical size={20} className="mb-1 opacity-40" />
            <span>{isOver ? '放開以加入集合' : '拖曳景點至此處'}</span>
          </div>
        ) : (
          <SortableContext
            items={spots.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {spots.map(spot => (
                <SpotCard
                  key={spot.id}
                  spot={spot}
                  onDelete={(id) => {
                    // 先從集合移除，再刪除景點
                    handleRemoveFromGroup(id);
                    onDeleteSpot(id);
                  }}
                  onClick={setSelectedSpot}
                  onUpdate={onUpdateSpot}
                  onDuplicate={onDuplicateSpot}
                  compact={true}
                />
              ))}
            </div>
            
            {/* 拖曳時的提示 */}
            {isOver && (
              <div 
                className="mt-2 flex items-center justify-center text-xs py-2 rounded-lg border-2 border-dashed transition-all border-solid bg-white/80"
                style={{ borderColor: groupColor, color: groupColor }}
              >
                <span>放開以加入集合</span>
              </div>
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
});

SpotGroupCard.displayName = 'SpotGroupCard';

export default SpotGroupCard;
