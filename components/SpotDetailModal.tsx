/**
 * 景點詳情 Modal (Spot Detail Modal)
 * 
 * 顯示景點的完整資訊，包含：
 * - 照片畫廊
 * - 基本資訊（名稱、類別、地址）
 * - 描述
 * - 座標
 * - 建議停留時間
 * 
 * @module components/SpotDetailModal
 */

import React, { memo, useState } from 'react';
import { 
  X, 
  MapPin, 
  Clock, 
  Tag, 
  Navigation, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';
import { Spot, SpotCategory } from '../types';
import { getSpotPhotoUrl } from '../services/geminiService';

interface SpotDetailModalProps {
  spot: Spot | null;
  isOpen: boolean;
  onClose: () => void;
}

// 類別顏色設定
const getCategoryColor = (category: SpotCategory): string => {
  const colors: Record<string, string> = {
    [SpotCategory.FOOD]: 'bg-orange-100 text-orange-600 border-orange-200',
    [SpotCategory.CAFE]: 'bg-amber-100 text-amber-600 border-amber-200',
    [SpotCategory.BAR]: 'bg-violet-100 text-violet-600 border-violet-200',
    [SpotCategory.HOTEL]: 'bg-blue-100 text-blue-600 border-blue-200',
    [SpotCategory.COMMUTE]: 'bg-slate-100 text-slate-600 border-slate-200',
    [SpotCategory.SHOPPING]: 'bg-pink-100 text-pink-600 border-pink-200',
    [SpotCategory.MUSEUM]: 'bg-indigo-100 text-indigo-600 border-indigo-200',
    [SpotCategory.SHRINE_TEMPLE]: 'bg-red-100 text-red-600 border-red-200',
    [SpotCategory.PARK]: 'bg-green-100 text-green-600 border-green-200',
    [SpotCategory.ENTERTAINMENT]: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    [SpotCategory.CUSTOM]: 'bg-purple-100 text-purple-600 border-purple-200',
  };
  return colors[category] || 'bg-rose-100 text-rose-600 border-rose-200';
};

/**
 * 照片畫廊子元件
 */
const PhotoGallery: React.FC<{ photos: Spot['photos']; spotName: string }> = memo(({ photos, spotName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <ImageIcon size={48} strokeWidth={1} />
          <p className="text-sm mt-2">暫無照片</p>
        </div>
      </div>
    );
  }

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="relative w-full h-56 md:h-64 bg-gray-100">
      <img
        src={getSpotPhotoUrl(photos[currentIndex].photoReference, 800)}
        alt={`${spotName} 照片 ${currentIndex + 1}`}
        className="w-full h-full object-cover"
      />
      
      {/* 導航按鈕 - 行動端增大觸控區域 */}
      {photos.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-8 md:h-8 bg-black/40 hover:bg-black/60 active:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label="上一張照片"
          >
            <ChevronLeft size={24} className="md:w-[20px] md:h-[20px]" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 md:w-8 md:h-8 bg-black/40 hover:bg-black/60 active:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
            aria-label="下一張照片"
          >
            <ChevronRight size={24} className="md:w-[20px] md:h-[20px]" />
          </button>
          
          {/* 照片指示器 - 行動端增大觸控目標 */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 md:gap-1.5">
            {photos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-3 h-3 md:w-2 md:h-2 rounded-full transition-all ${
                  idx === currentIndex ? 'bg-white w-5 md:w-4' : 'bg-white/50'
                }`}
                aria-label={`跳到第 ${idx + 1} 張照片`}
              />
            ))}
          </div>
        </>
      )}
      
      {/* 照片計數 */}
      <div className="absolute top-3 right-3 px-2 py-1 bg-black/50 text-white text-xs rounded-full">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
});

PhotoGallery.displayName = 'PhotoGallery';

/**
 * 景點詳情 Modal 主元件
 */
export const SpotDetailModal: React.FC<SpotDetailModalProps> = memo(({ spot, isOpen, onClose }) => {
  if (!isOpen || !spot) return null;

  // 開啟 Google Maps
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${spot.coordinates.lat},${spot.coordinates.lng}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-[9999] bg-white rounded-2xl shadow-2xl overflow-hidden md:w-full md:max-w-lg md:max-h-[90vh] flex flex-col">
        {/* 關閉按鈕 - 行動端增大觸控區域 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-10 h-10 md:w-8 md:h-8 bg-black/40 hover:bg-black/60 active:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
          aria-label="關閉詳情視窗"
        >
          <X size={22} className="md:w-[18px] md:h-[18px]" />
        </button>

        {/* 照片區域 */}
        <PhotoGallery photos={spot.photos} spotName={spot.name} />

        {/* 內容區域 */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* 標題與類別 */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-800">{spot.name}</h2>
            <span className={`flex-shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border ${getCategoryColor(spot.category)}`}>
              {spot.category}
            </span>
          </div>

          {/* 描述 */}
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            {spot.description}
          </p>

          {/* 資訊列表 */}
          <div className="space-y-3">
            {/* 地址 */}
            {spot.address && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-sakura-50 flex items-center justify-center flex-shrink-0">
                  <Navigation size={16} className="text-sakura-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">地址</p>
                  <p className="text-sm text-gray-700">{spot.address}</p>
                </div>
              </div>
            )}

            {/* 建議停留時間 */}
            {spot.suggestedTime && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Clock size={16} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">建議停留時間</p>
                  <p className="text-sm text-gray-700">{spot.suggestedTime}</p>
                </div>
              </div>
            )}

            {/* 座標 */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">座標</p>
                <p className="text-sm text-gray-700 font-mono">
                  {spot.coordinates.lat.toFixed(6)}, {spot.coordinates.lng.toFixed(6)}
                </p>
              </div>
            </div>

            {/* 標籤 */}
            {spot.tags && spot.tags.length > 0 && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Tag size={16} className="text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-1">標籤</p>
                  <div className="flex flex-wrap gap-1">
                    {spot.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部操作 - 行動端優化 */}
        <div className="p-4 border-t border-gray-100 pb-safe">
          <button
            onClick={openInGoogleMaps}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 md:py-3 bg-sakura-500 hover:bg-sakura-600 active:bg-sakura-700 active:scale-[0.98] text-white rounded-xl font-medium transition-all min-h-[48px]"
            aria-label="在 Google Maps 中開啟此景點"
          >
            <ExternalLink size={20} className="md:w-[18px] md:h-[18px]" />
            在 Google Maps 中開啟
          </button>
        </div>
      </div>
    </>
  );
});

SpotDetailModal.displayName = 'SpotDetailModal';

export default SpotDetailModal;
