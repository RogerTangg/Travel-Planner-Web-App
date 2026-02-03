/**
 * 建立景點集合 Modal (Create Spot Group Modal)
 * 
 * 讓使用者選擇景點並建立新集合
 * 
 * @module components/CreateGroupModal
 */

import React, { useState, useMemo, memo } from 'react';
import { X, FolderPlus, Check, Search } from 'lucide-react';
import { Spot } from '../types';
import { useTripStore, useUIStore } from '../stores';
import { useHistory } from '../hooks';

// 預設顏色選項
const GROUP_COLORS = [
  { color: '#F472B6', name: '粉色' },
  { color: '#FB923C', name: '橙色' },
  { color: '#FBBF24', name: '黃色' },
  { color: '#34D399', name: '綠色' },
  { color: '#60A5FA', name: '藍色' },
  { color: '#A78BFA', name: '紫色' },
  { color: '#F87171', name: '紅色' },
  { color: '#94A3B8', name: '灰色' },
];

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedSpotIds?: string[];  // 預先選擇的景點（例如從多選拖曳）
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = memo(({
  isOpen,
  onClose,
  preSelectedSpotIds = []
}) => {
  const [groupName, setGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState(GROUP_COLORS[0].color);
  const [selectedSpotIds, setSelectedSpotIds] = useState<Set<string>>(
    new Set(preSelectedSpotIds)
  );
  const [searchQuery, setSearchQuery] = useState('');

  const trips = useTripStore(state => state.trips);
  const currentTripId = useTripStore(state => state.currentTripId);
  const currentTrip = trips.find(t => t.id === currentTripId) || null;
  const createSpotGroup = useTripStore(state => state.createSpotGroup);
  const showToast = useUIStore(state => state.showToast);
  const { saveBeforeAction } = useHistory();

  // 取得所有可選擇的景點（排除已在其他集合中的）
  const availableSpots = useMemo(() => {
    if (!currentTrip) return [];
    
    // 取得已在集合中的景點 ID
    const groupedSpotIds = new Set(
      (currentTrip.spotGroups || []).flatMap(g => g.spotIds)
    );
    
    // 合併所有景點
    const allSpots = [
      ...currentTrip.unscheduledSpots,
      ...currentTrip.days.flatMap(d => d.spots)
    ];
    
    // 過濾掉已在集合中的景點
    return allSpots.filter(s => !groupedSpotIds.has(s.id) && !s.isLoading);
  }, [currentTrip]);

  // 根據搜尋過濾景點
  const filteredSpots = useMemo(() => {
    if (!searchQuery.trim()) return availableSpots;
    const query = searchQuery.toLowerCase();
    return availableSpots.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.category.toLowerCase().includes(query)
    );
  }, [availableSpots, searchQuery]);

  const handleToggleSpot = (spotId: string) => {
    setSelectedSpotIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(spotId)) {
        newSet.delete(spotId);
      } else {
        newSet.add(spotId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedSpotIds(new Set(filteredSpots.map(s => s.id)));
  };

  const handleDeselectAll = () => {
    setSelectedSpotIds(new Set());
  };

  const handleCreate = () => {
    if (selectedSpotIds.size === 0) {
      showToast('請至少選擇一個景點', 'warning');
      return;
    }

    const name = groupName.trim() || `集合 ${(currentTrip?.spotGroups?.length || 0) + 1}`;
    
    saveBeforeAction('建立景點集合');
    createSpotGroup(name, Array.from(selectedSpotIds), selectedColor);
    showToast(`✅ 已建立集合「${name}」`, 'success');
    
    // 重置表單
    setGroupName('');
    setSelectedSpotIds(new Set());
    setSearchQuery('');
    onClose();
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedSpotIds(new Set());
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        {/* 標題列 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FolderPlus size={20} className="text-sakura-500" />
            <h2 className="text-lg font-bold text-gray-800">建立景點集合</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* 內容區 */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 集合名稱 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              集合名稱
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="例如：涉谷購物區"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sakura-200 focus:border-sakura-300"
            />
          </div>

          {/* 顏色選擇 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              集合顏色
            </label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map(({ color, name }) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color 
                      ? 'scale-110 border-gray-800 shadow-md' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={name}
                />
              ))}
            </div>
          </div>

          {/* 景點選擇 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">
                選擇景點 ({selectedSpotIds.size} / {availableSpots.length})
              </label>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="text-xs text-sakura-500 hover:text-sakura-600"
                >
                  全選
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleDeselectAll}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  取消全選
                </button>
              </div>
            </div>

            {/* 搜尋框 */}
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋景點..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sakura-200"
              />
            </div>

            {/* 景點列表 */}
            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
              {filteredSpots.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-400">
                  {availableSpots.length === 0 
                    ? '沒有可加入集合的景點'
                    : '找不到符合的景點'
                  }
                </div>
              ) : (
                filteredSpots.map(spot => (
                  <label
                    key={spot.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSpotIds.has(spot.id)}
                      onChange={() => handleToggleSpot(spot.id)}
                      className="w-4 h-4 text-sakura-500 border-gray-300 rounded focus:ring-sakura-200"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {spot.name}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {spot.category}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 底部按鈕 */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedSpotIds.size === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-sakura-500 rounded-lg hover:bg-sakura-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Check size={16} />
            建立集合
          </button>
        </div>
      </div>
    </div>
  );
});

CreateGroupModal.displayName = 'CreateGroupModal';

export default CreateGroupModal;
