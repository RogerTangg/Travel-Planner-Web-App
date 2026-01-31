/**
 * 景點詳情 Modal 元件 (Spot Detail Modal Component)
 * 
 * 顯示景點的完整資訊，包含：
 * - 大型照片輪播
 * - 詳細描述
 * - 地址與座標
 * - 標籤與分類
 * 
 * @module components/SpotDetailModal
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { X, ChevronLeft, ChevronRight, MapPin, Clock, Tag, Camera, ExternalLink, Navigation } from 'lucide-react';
import { Spot, SpotCategory } from '../types';
import { getSpotPhotoUrl } from '../services/geminiService';

interface SpotDetailModalProps {
  spot: Spot | null;
  isOpen: boolean;
  onClose: () => void;
}

const getCategoryColor = (category: SpotCategory): string => {
  switch (category) {
    case SpotCategory.FOOD: return 'bg-orange-100 text-orange-700 border-orange-200';
    case SpotCategory.CAFE: return 'bg-amber-100 text-amber-700 border-amber-200';
    case SpotCategory.BAR: return 'bg-violet-100 text-violet-700 border-violet-200';
    case SpotCategory.HOTEL: return 'bg-blue-100 text-blue-700 border-blue-200';
    case SpotCategory.COMMUTE: return 'bg-slate-100 text-slate-700 border-slate-200';
    case SpotCategory.SHOPPING: return 'bg-pink-100 text-pink-700 border-pink-200';
    case SpotCategory.MUSEUM: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case SpotCategory.SHRINE_TEMPLE: return 'bg-red-100 text-red-700 border-red-200';
    case SpotCategory.PARK: return 'bg-green-100 text-green-700 border-green-200';
    case SpotCategory.ENTERTAINMENT: return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    default: return 'bg-rose-100 text-rose-700 border-rose-200';
  }
};

const TAG_COLORS = [
  'bg-rose-50 text-rose-600 border-rose-200',
  'bg-sky-50 text-sky-600 border-sky-200',
  'bg-emerald-50 text-emerald-600 border-emerald-200',
  'bg-amber-50 text-amber-600 border-amber-200',
  'bg-violet-50 text-violet-600 border-violet-200',
  'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200',
];

const getTagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

export const SpotDetailModal: React.FC<SpotDetailModalProps> = memo(({ spot, isOpen, onClose }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);

  // Reset photo index when spot changes
  useEffect(() => {
    setCurrentPhotoIndex(0);
    setIsImageLoading(true);
  }, [spot?.id]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen || !spot?.photos?.length) return;
    
    if (e.key === 'ArrowLeft') {
      setCurrentPhotoIndex(prev => (prev - 1 + spot.photos!.length) % spot.photos!.length);
      setIsImageLoading(true);
    } else if (e.key === 'ArrowRight') {
      setCurrentPhotoIndex(prev => (prev + 1) % spot.photos!.length);
      setIsImageLoading(true);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [isOpen, spot, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !spot) return null;

  const hasPhotos = spot.photos && spot.photos.length > 0;
  const currentPhoto = hasPhotos ? spot.photos![currentPhotoIndex] : null;
  const photoUrl = currentPhoto ? getSpotPhotoUrl(currentPhoto.photoReference, 800) : '';

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPhotos) return;
    setCurrentPhotoIndex(prev => (prev - 1 + spot.photos!.length) % spot.photos!.length);
    setIsImageLoading(true);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasPhotos) return;
    setCurrentPhotoIndex(prev => (prev + 1) % spot.photos!.length);
    setIsImageLoading(true);
  };

  const handleOpenGoogleMaps = () => {
    const url = spot.placeId 
      ? `https://www.google.com/maps/place/?q=place_id:${spot.placeId}`
      : `https://www.google.com/maps/search/?api=1&query=${spot.coordinates.lat},${spot.coordinates.lng}`;
    window.open(url, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
          aria-label="關閉"
        >
          <X size={20} />
        </button>

        {/* Photo Section */}
        <div className="relative w-full aspect-video bg-gray-100 flex-shrink-0">
          {hasPhotos ? (
            <>
              {/* Loading State */}
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="w-10 h-10 border-4 border-sakura-200 border-t-sakura-500 rounded-full animate-spin" />
                </div>
              )}
              
              {/* Photo */}
              <img
                src={photoUrl}
                alt={`${spot.name} - 照片 ${currentPhotoIndex + 1}`}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                onLoad={() => setIsImageLoading(false)}
                onError={() => setIsImageLoading(false)}
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Navigation Arrows */}
              {spot.photos!.length > 1 && (
                <>
                  <button
                    onClick={handlePrevPhoto}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur text-white rounded-full transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={handleNextPhoto}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/40 backdrop-blur text-white rounded-full transition-all"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              {/* Photo Counter */}
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <span className="px-3 py-1 bg-black/50 backdrop-blur text-white text-sm rounded-full flex items-center gap-1.5">
                  <Camera size={14} />
                  {currentPhotoIndex + 1} / {spot.photos!.length}
                </span>
              </div>

              {/* Thumbnail Strip */}
              {spot.photos!.length > 1 && (
                <div className="absolute bottom-4 right-4 flex gap-1.5">
                  {spot.photos!.slice(0, 5).map((photo, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPhotoIndex(idx);
                        setIsImageLoading(true);
                      }}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === currentPhotoIndex 
                          ? 'border-white scale-110 shadow-lg' 
                          : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={getSpotPhotoUrl(photo.photoReference, 100)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                  {spot.photos!.length > 5 && (
                    <div className="w-12 h-12 rounded-lg bg-black/50 backdrop-blur flex items-center justify-center text-white text-xs">
                      +{spot.photos!.length - 5}
                    </div>
                  )}
                </div>
              )}

              {/* Attribution */}
              {currentPhoto?.attributions && currentPhoto.attributions.length > 0 && (
                <div 
                  className="absolute bottom-16 left-4 text-xs text-white/70"
                  dangerouslySetInnerHTML={{ __html: currentPhoto.attributions[0] }}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
              <Camera size={48} strokeWidth={1} />
              <span className="mt-2 text-sm">暫無照片</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getCategoryColor(spot.category)}`}>
              {spot.category}
            </span>
            {spot.isManual && (
              <span className="px-2 py-0.5 text-xs bg-amber-50 text-amber-600 rounded-full border border-amber-200">
                手動新增
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{spot.name}</h2>

          {/* Description */}
          <p className="text-gray-600 leading-relaxed mb-4">{spot.description}</p>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {/* Address */}
            {spot.address && (
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                <MapPin size={18} className="text-sakura-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">地址</div>
                  <div className="text-sm text-gray-700">{spot.address}</div>
                </div>
              </div>
            )}

            {/* Time */}
            {(spot.startTime || spot.suggestedTime) && (
              <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-xl">
                <Clock size={18} className="text-sakura-500 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">時間</div>
                  <div className="text-sm text-gray-700">
                    {spot.startTime && `${spot.startTime} ~ ${spot.endTime || '--:--'}`}
                    {spot.startTime && spot.suggestedTime && ' · '}
                    {spot.suggestedTime && `建議停留 ${spot.suggestedTime}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {spot.tags && spot.tags.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <Tag size={12} />
                標籤
              </div>
              <div className="flex flex-wrap gap-1.5">
                {spot.tags.map(tag => (
                  <span 
                    key={tag} 
                    className={`px-2.5 py-1 text-xs font-medium rounded-full border ${getTagColor(tag)}`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {spot.notes && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl mb-4">
              <div className="text-xs text-amber-600 mb-1">📝 備註</div>
              <p className="text-sm text-amber-800">{spot.notes}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleOpenGoogleMaps}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sakura-500 hover:bg-sakura-600 text-white rounded-xl font-medium transition-colors"
            >
              <Navigation size={18} />
              在 Google Maps 開啟
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

SpotDetailModal.displayName = 'SpotDetailModal';

export default SpotDetailModal;
