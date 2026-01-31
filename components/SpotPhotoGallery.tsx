/**
 * 景點照片畫廊元件 (Spot Photo Gallery Component)
 * 
 * 提供景點照片的展示功能：
 * - 支援單張縮圖預覽
 * - 點擊展開完整照片畫廊
 * - 支援左右滑動瀏覽
 * - 包含載入狀態與錯誤處理
 * 
 * @module components/SpotPhotoGallery
 */

import React, { useState, useCallback, memo } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Camera } from 'lucide-react';
import { SpotPhoto } from '../types';
import { getSpotPhotoUrl } from '../services/geminiService';

interface SpotPhotoGalleryProps {
  photos: SpotPhoto[];
  spotName: string;         // 用於 alt 文字與標題
  className?: string;       // 自訂樣式
  thumbnailSize?: 'sm' | 'md' | 'lg';  // 縮圖尺寸
  showCount?: boolean;      // 是否顯示照片數量
}

// 縮圖尺寸設定 (Thumbnail size configuration)
const THUMBNAIL_CONFIG = {
  sm: { width: 400, containerClass: 'w-16 h-16' },
  md: { width: 400, containerClass: 'w-24 h-24' },
  lg: { width: 800, containerClass: 'w-32 h-32' },
};

/**
 * 景點照片畫廊元件 (Spot Photo Gallery)
 * 顯示景點縮圖，點擊後展開完整畫廊
 */
export const SpotPhotoGallery: React.FC<SpotPhotoGalleryProps> = memo(({
  photos,
  spotName,
  className = '',
  thumbnailSize = 'md',
  showCount = true,
}) => {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadError, setLoadError] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<Set<number>>(new Set([0]));

  // 無照片時顯示佔位符 (Placeholder when no photos)
  if (!photos || photos.length === 0) {
    return null;
  }

  const config = THUMBNAIL_CONFIG[thumbnailSize];

  // 處理縮圖點擊 (Handle thumbnail click)
  const handleThumbnailClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(0);
    setIsGalleryOpen(true);
  }, []);

  // 關閉畫廊 (Close gallery)
  const handleClose = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsGalleryOpen(false);
  }, []);

  // 切換到上一張 (Previous photo)
  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
  }, [photos.length]);

  // 切換到下一張 (Next photo)
  const handleNext = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
  }, [photos.length]);

  // 處理圖片載入完成 (Handle image load)
  const handleImageLoad = useCallback((index: number) => {
    setIsLoading(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  // 處理圖片載入錯誤 (Handle image error)
  const handleImageError = useCallback((index: number) => {
    setLoadError(prev => new Set(prev).add(index));
    setIsLoading(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  // 鍵盤導航 (Keyboard navigation)
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsGalleryOpen(false);
    } else if (e.key === 'ArrowLeft') {
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
    } else if (e.key === 'ArrowRight') {
      setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
    }
  }, [photos.length]);

  const thumbnailUrl = getSpotPhotoUrl(photos[0].photoReference, config.width);
  const hasMultiplePhotos = photos.length > 1;

  return (
    <>
      {/* 縮圖預覽 (Thumbnail Preview) */}
      <div 
        className={`relative rounded-lg overflow-hidden cursor-pointer group ${config.containerClass} ${className}`}
        onClick={handleThumbnailClick}
        role="button"
        aria-label={`查看 ${spotName} 的照片`}
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleThumbnailClick(e as any)}
      >
        {/* 縮圖 */}
        {loadError.has(0) ? (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <ImageIcon size={20} className="text-gray-300" />
          </div>
        ) : (
          <>
            {isLoading.has(0) && (
              <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                <Camera size={16} className="text-gray-300" />
              </div>
            )}
            <img
              src={thumbnailUrl}
              alt={`${spotName} 照片`}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              onLoad={() => handleImageLoad(0)}
              onError={() => handleImageError(0)}
              loading="lazy"
            />
          </>
        )}

        {/* 照片數量標籤 (Photo count badge) */}
        {showCount && hasMultiplePhotos && (
          <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Camera size={10} />
            <span>{photos.length}</span>
          </div>
        )}

        {/* Hover 遮罩 (Hover overlay) */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity font-medium">
            查看照片
          </span>
        </div>
      </div>

      {/* 完整照片畫廊 Modal (Full Gallery Modal) */}
      {isGalleryOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={handleClose}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="dialog"
          aria-label={`${spotName} 照片畫廊`}
        >
          {/* 關閉按鈕 (Close button) */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            aria-label="關閉照片畫廊"
          >
            <X size={24} />
          </button>

          {/* 照片計數 (Photo counter) */}
          <div className="absolute top-4 left-4 text-white/80 text-sm">
            <span className="font-medium">{currentIndex + 1}</span>
            <span className="text-white/50"> / {photos.length}</span>
          </div>

          {/* 景點名稱 (Spot name) */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white font-medium text-lg">
            {spotName}
          </div>

          {/* 上一張按鈕 (Previous button) */}
          {hasMultiplePhotos && (
            <button
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="上一張照片"
            >
              <ChevronLeft size={32} />
            </button>
          )}

          {/* 主要照片 (Main photo) */}
          <div 
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {loadError.has(currentIndex) ? (
              <div className="w-96 h-64 bg-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-400">
                <ImageIcon size={48} className="mb-2" />
                <span>無法載入照片</span>
              </div>
            ) : (
              <img
                src={getSpotPhotoUrl(photos[currentIndex].photoReference, 1200)}
                alt={`${spotName} 照片 ${currentIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                onError={() => handleImageError(currentIndex)}
              />
            )}
          </div>

          {/* 下一張按鈕 (Next button) */}
          {hasMultiplePhotos && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              aria-label="下一張照片"
            >
              <ChevronRight size={32} />
            </button>
          )}

          {/* 縮圖列表 (Thumbnail strip) */}
          {hasMultiplePhotos && photos.length <= 10 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {photos.map((photo, index) => (
                <button
                  key={photo.photoReference}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentIndex 
                      ? 'border-white scale-110' 
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`跳至照片 ${index + 1}`}
                >
                  <img
                    src={getSpotPhotoUrl(photo.photoReference, 100)}
                    alt={`縮圖 ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}

          {/* 照片歸屬 (Photo attribution) */}
          {photos[currentIndex]?.attributions && photos[currentIndex].attributions!.length > 0 && (
            <div className="absolute bottom-4 right-4 text-white/50 text-xs max-w-xs truncate">
              📷 {photos[currentIndex].attributions![0]}
            </div>
          )}
        </div>
      )}
    </>
  );
});

SpotPhotoGallery.displayName = 'SpotPhotoGallery';

/**
 * 景點照片橫條元件 (Spot Photo Strip)
 * 水平展示多張照片的縮圖列表
 */
interface SpotPhotoStripProps {
  photos: SpotPhoto[];
  spotName: string;
  maxPhotos?: number;
  className?: string;
}

export const SpotPhotoStrip: React.FC<SpotPhotoStripProps> = memo(({
  photos,
  spotName,
  maxPhotos = 4,
  className = '',
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const displayPhotos = photos.slice(0, maxPhotos);
  const remainingCount = photos.length - maxPhotos;

  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div className={`flex gap-1.5 overflow-x-auto no-scrollbar ${className}`}>
        {displayPhotos.map((photo, index) => (
          <button
            key={photo.photoReference}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(index);
            }}
            className="relative flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden group"
          >
            <img
              src={getSpotPhotoUrl(photo.photoReference, 200)}
              alt={`${spotName} 照片 ${index + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ))}
        
        {/* 顯示更多照片 (Show more photos) */}
        {remainingCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(maxPhotos - 1);
            }}
            className="flex-shrink-0 w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <span className="text-xs font-medium">+{remainingCount}</span>
          </button>
        )}
      </div>

      {/* 畫廊 Modal */}
      {selectedIndex !== null && (
        <PhotoGalleryModal
          photos={photos}
          spotName={spotName}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}
    </>
  );
});

SpotPhotoStrip.displayName = 'SpotPhotoStrip';

/**
 * 獨立的照片畫廊 Modal (Standalone Photo Gallery Modal)
 */
interface PhotoGalleryModalProps {
  photos: SpotPhoto[];
  spotName: string;
  initialIndex?: number;
  onClose: () => void;
}

const PhotoGalleryModal: React.FC<PhotoGalleryModalProps> = memo(({
  photos,
  spotName,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const hasMultiplePhotos = photos.length > 1;

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowLeft' && hasMultiplePhotos) {
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
    } else if (e.key === 'ArrowRight' && hasMultiplePhotos) {
      setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
    }
  }, [onClose, hasMultiplePhotos, photos.length]);

  return (
    <div 
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="dialog"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
      >
        <X size={24} />
      </button>

      <div className="absolute top-4 left-4 text-white/80 text-sm">
        <span className="font-medium">{currentIndex + 1}</span>
        <span className="text-white/50"> / {photos.length}</span>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white font-medium text-lg">
        {spotName}
      </div>

      {hasMultiplePhotos && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex(prev => (prev > 0 ? prev - 1 : photos.length - 1));
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronLeft size={32} />
        </button>
      )}

      <div 
        className="max-w-[90vw] max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={getSpotPhotoUrl(photos[currentIndex].photoReference, 1200)}
          alt={`${spotName} 照片 ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
      </div>

      {hasMultiplePhotos && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCurrentIndex(prev => (prev < photos.length - 1 ? prev + 1 : 0));
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <ChevronRight size={32} />
        </button>
      )}

      {hasMultiplePhotos && photos.length <= 10 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {photos.map((photo, index) => (
            <button
              key={photo.photoReference}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(index);
              }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex 
                  ? 'border-white scale-110' 
                  : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img
                src={getSpotPhotoUrl(photo.photoReference, 100)}
                alt={`縮圖 ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

PhotoGalleryModal.displayName = 'PhotoGalleryModal';

export default SpotPhotoGallery;
