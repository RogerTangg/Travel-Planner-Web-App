/**
 * 景點集合卡片元件 (Spot Group Card Component)
 * 
 * 顯示景點集合，支援：
 * - 整體拖曳到日行程
 * - 接收拖曳的景點（Droppable）
 * - 收合顯示（限制高度）
 * - 集合編輯與刪除
 * 
 * @module components/SpotGroupCard
 */

import React, { useState, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Ungroup,
  X,
  Check,
  GripVertical,
  Plus
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
  /** 是否允許拖曳整個集合（在待安排區域為 true） */
  isDraggable?: boolean;
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

// 最大顯示高度（約 3 個景點卡片的高度）
const MAX_SPOTS_HEIGHT = 200;

export const SpotGroupCard: React.FC<SpotGroupCardProps> = memo(({
  group,
  spots,
  onDeleteSpot,
  onUpdateSpot,
  onDuplicateSpot,
  isDraggable = true
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
      message: spots.length > 0 
        ? '確定要刪除此集合嗎？集合內的景點將會保留。'
        : '確定要刪除此空集合嗎？',
      type: 'warning',
      onConfirm: () => {
        saveBeforeAction('刪除集合');
        deleteSpotGroup(group.id, false); // 保留景點
        hideConfirm();
      }
    });
  };

  const handleUngroup = () => {
    saveBeforeAction('解散集合');
    deleteSpotGroup(group.id, false);
  };

  // 設定 Droppable，讓集合可以接收拖曳的景點
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `group-${group.id}`,
    data: {
      type: 'group',
      groupId: group.id
    }
  });

  // 設定 Sortable，讓集合可以整體拖曳
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: `sortable-group-${group.id}`,
    data: {
      type: 'group',
      groupId: group.id,
      spotIds: group.spotIds
    },
    disabled: !isDraggable
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 合併 refs
  const setRefs = (node: HTMLDivElement | null) => {
    setDroppableRef(node);
    setSortableRef(node);
  };

  return (
    <div 
      ref={setRefs}
      style={style}
      className={`mb-3 rounded-xl border-2 overflow-hidden transition-all ${
        isOver ? 'ring-2 ring-offset-2 scale-[1.01]' : ''
      } ${isDragging ? 'shadow-lg z-50' : ''}`}
      {...attributes}
    >
      {/* 集合標題列 */}
      <div 
        className="flex items-center gap-2 px-3 py-2"
        style={{ 
          backgroundColor: `${group.color || GROUP_COLORS[0]}15`,
          borderColor: group.color || GROUP_COLORS[0]
        }}
      >
        {/* 拖曳把手 */}
        {isDraggable && (
          <div 
            className="text-gray-400 cursor-grab hover:text-gray-600 active:cursor-grabbing"
            {...listeners}
          >
            <GripVertical size={14} />
          </div>
        )}

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

        {/* 編輯模式 - 分兩行顯示 */}
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-2">
            {/* 第一行：名稱輸入 */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-sakura-200 min-w-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') handleCancelEdit();
                }}
              />
              <button 
                onClick={handleSaveEdit}
                className="p-1.5 text-green-600 hover:bg-green-50 rounded flex-shrink-0"
                title="儲存"
              >
                <Check size={14} />
              </button>
              <button 
                onClick={handleCancelEdit}
                className="p-1.5 text-gray-400 hover:bg-gray-100 rounded flex-shrink-0"
                title="取消"
              >
                <X size={14} />
              </button>
            </div>
            {/* 第二行：顏色選擇 */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 mr-1">顏色</span>
              {GROUP_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setEditColor(color)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    editColor === color ? 'scale-110 border-gray-600 ring-2 ring-offset-1' : 'border-transparent hover:scale-105'
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
              style={{ color: group.color }}
            >
              {group.name}
            </span>
            
            {/* 景點數量 */}
            <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-white/50 rounded-full flex-shrink-0">
              {spots.length} 個景點
            </span>

            {/* 操作按鈕 */}
            <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
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
          </>
        )}
      </div>

      {/* 集合內的景點列表 - 限制高度 */}
      {!group.collapsed && (
        <div 
          className={`p-2 bg-white/50 transition-colors custom-scrollbar ${
            isOver ? 'bg-opacity-80' : ''
          }`}
          style={{ 
            maxHeight: spots.length > 0 ? MAX_SPOTS_HEIGHT : 'auto',
            overflowY: spots.length > 2 ? 'auto' : 'visible'
          }}
        >
          {spots.length === 0 ? (
            <div 
              className={`flex flex-col items-center justify-center text-xs py-4 rounded-lg border-2 border-dashed transition-all ${
                isOver 
                  ? 'border-current bg-white/80 text-gray-600' 
                  : 'border-gray-200 text-gray-400'
              }`}
              style={isOver ? { borderColor: group.color } : {}}
            >
              <Plus size={16} className="mb-1 opacity-50" />
              <span>{isOver ? '放開以加入集合' : '拖曳景點至此處'}</span>
            </div>
          ) : (
            <div className="space-y-1">
              {spots.map(spot => (
                <SpotCard
                  key={spot.id}
                  spot={spot}
                  onDelete={onDeleteSpot}
                  onClick={setSelectedSpot}
                  onUpdate={onUpdateSpot}
                  onDuplicate={onDuplicateSpot}
                  compact={true}
                />
              ))}
              {/* 當有景點時，也顯示一個小的放置提示 */}
              {isOver && (
                <div 
                  className="flex items-center justify-center text-xs py-2 rounded-lg border-2 border-dashed transition-all border-current bg-white/80"
                  style={{ borderColor: group.color, color: group.color }}
                >
                  <Plus size={12} className="mr-1" />
                  <span>放開以加入</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 收合時顯示預覽（前兩個景點名稱） */}
      {group.collapsed && spots.length > 0 && (
        <div 
          className="px-3 py-1.5 bg-white/30 text-xs text-gray-500 truncate"
          style={{ borderTop: `1px solid ${group.color}20` }}
        >
          {spots.slice(0, 2).map(s => s.name).join('、')}
          {spots.length > 2 && `...等 ${spots.length} 個`}
        </div>
      )}
    </div>
  );
});

SpotGroupCard.displayName = 'SpotGroupCard';

export default SpotGroupCard;
