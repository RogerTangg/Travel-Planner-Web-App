/**
 * 照片牆元件 (Photo Wall Component)
 * 
 * 以瀑布流佈局展示行程中所有景點的照片
 * 支援照片篩選、點擊放大等功能
 * 
 * @module components/PhotoWall
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
import { X, Camera, MapPin, ChevronLeft, ChevronRight, Grid, Filter, Image as ImageIcon } from 'lucide-react';
import { Trip, Spot, SpotPhoto, SpotCategory } from '../types';
import { getSpotPhotoUrl } from '../services/geminiService';

interface PhotoItem {
  photo: SpotPhoto;
  spot: Spot;
  dayTitle: string;
  photoIndex: number;
}

interface PhotoWallProps {
  trip: Trip;
  isOpen: boolean;
  onClose: () => void;
  onSpotClick?: (spot: Spot) => void;
}

interface LightboxProps {
  photos: PhotoItem[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

const getCategoryColor = (category: SpotCategory): string => {
  const colors: Record<string, string> = {
    [SpotCategory.FOOD]: 'bg-orange-500',
    [SpotCategory.CAFE]: 'bg-amber-500',
    [SpotCategory.BAR]: 'bg-violet-500',
    [SpotCategory.HOTEL]: 'bg-blue-500',
    [SpotCategory.COMMUTE]: 'bg-slate-500',
    [SpotCategory.SHOPPING]: 'bg-pink-500',
    [SpotCategory.MUSEUM]: 'bg-indigo-500',
    [SpotCategory.SHRINE_TEMPLE]: 'bg-red-500',
    [SpotCategory.PARK]: 'bg-green-500',
    [SpotCategory.ENTERTAINMENT]: 'bg-cyan-500',
    [SpotCategory.CUSTOM]: 'bg-purple-500',
  };
  return colors[category] || 'bg-rose-500';
};

/**
 * 燈箱元件 (Lightbox Component)
 */
const Lightbox: React.FC<LightboxProps> = memo(({ photos, currentIndex, onClose, onPrev, onNext }) => {
  const [isLoading, setIsLoading] = useState(true);
  const currentItem = photos[currentIndex];

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext, onClose]);

  return (
    <div className="fixed inset-0 z-[10000] bg-black/95 flex items-center justify-center">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
      >
        <X size={24} />
      </button>

      {/* Navigation Arrows */}
      {photos.length > 1 && (
        <>
          <button
            onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <ChevronRight size={28} />
          </button>
        </>
      )}

      {/* Main Image */}
      <div className="relative max-w-[90vw] max-h-[80vh]">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
        <img
          src={getSpotPhotoUrl(currentItem.photo.photoReference, 1200)}
          alt={currentItem.spot.name}
          className={`max-w-full max-h-[80vh] object-contain transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </div>

      {/* Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 text-xs text-white/70 bg-white/20 rounded">
              {currentItem.dayTitle}
            </span>
            <span className={`w-2 h-2 rounded-full ${getCategoryColor(currentItem.spot.category)}`} />
            <span className="text-sm text-white/70">{currentItem.spot.category}</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-1">{currentItem.spot.name}</h3>
          {currentItem.spot.address && (
            <p className="text-sm text-white/60 flex items-center gap-1">
              <MapPin size={14} />
              {currentItem.spot.address}
            </p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm text-white/50">
            <span>{currentIndex + 1} / {photos.length}</span>
            {currentItem.photo.attributions?.[0] && (
              <span dangerouslySetInnerHTML={{ __html: currentItem.photo.attributions[0] }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

Lightbox.displayName = 'Lightbox';

/**
 * 照片牆主元件 (Photo Wall Main Component)
 */
export const PhotoWall: React.FC<PhotoWallProps> = memo(({ trip, isOpen, onClose, onSpotClick }) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<SpotCategory | 'all'>('all');
  const [filterDay, setFilterDay] = useState<string | 'all'>('all');

  // Collect all photos from trip
  const allPhotos = useMemo((): PhotoItem[] => {
    const items: PhotoItem[] = [];
    
    // From scheduled days
    trip.days.forEach(day => {
      day.spots.forEach(spot => {
        if (spot.photos && spot.photos.length > 0) {
          spot.photos.forEach((photo, idx) => {
            items.push({
              photo,
              spot,
              dayTitle: day.title,
              photoIndex: idx,
            });
          });
        }
      });
    });

    // From unscheduled spots
    trip.unscheduledSpots.forEach(spot => {
      if (spot.photos && spot.photos.length > 0) {
        spot.photos.forEach((photo, idx) => {
          items.push({
            photo,
            spot,
            dayTitle: '待安排',
            photoIndex: idx,
          });
        });
      }
    });

    return items;
  }, [trip]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return allPhotos.filter(item => {
      if (filterCategory !== 'all' && item.spot.category !== filterCategory) return false;
      if (filterDay !== 'all' && item.dayTitle !== filterDay) return false;
      return true;
    });
  }, [allPhotos, filterCategory, filterDay]);

  // Get unique categories and days for filter
  const categories = useMemo(() => {
    const cats = new Set(allPhotos.map(item => item.spot.category));
    return Array.from(cats);
  }, [allPhotos]);

  const days = useMemo(() => {
    const daySet = new Set(allPhotos.map(item => item.dayTitle));
    return Array.from(daySet);
  }, [allPhotos]);

  const handlePhotoClick = (index: number) => {
    setLightboxIndex(index);
  };

  const handleLightboxPrev = useCallback(() => {
    setLightboxIndex(prev => {
      if (prev === null || filteredPhotos.length === 0) return prev;
      return (prev - 1 + filteredPhotos.length) % filteredPhotos.length;
    });
  }, [filteredPhotos.length]);

  const handleLightboxNext = useCallback(() => {
    setLightboxIndex(prev => {
      if (prev === null || filteredPhotos.length === 0) return prev;
      return (prev + 1) % filteredPhotos.length;
    });
  }, [filteredPhotos.length]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="fixed inset-4 md:inset-8 z-[9999] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-sakura-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sakura-100 flex items-center justify-center">
              <Grid size={20} className="text-sakura-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{trip.title} - 照片牆</h2>
              <p className="text-sm text-gray-500">{allPhotos.length} 張照片</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100">
          <Filter size={16} className="text-gray-400" />
          
          {/* Day Filter */}
          <select
            value={filterDay}
            onChange={e => setFilterDay(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-sakura-300"
          >
            <option value="all">全部天數</option>
            {days.map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as SpotCategory | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-sakura-300"
          >
            <option value="all">全部類別</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <span className="text-sm text-gray-500 ml-auto">
            顯示 {filteredPhotos.length} 張照片
          </span>
        </div>

        {/* Photo Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {filteredPhotos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ImageIcon size={64} strokeWidth={1} />
              <p className="mt-4 text-lg font-medium">暫無照片</p>
              <p className="text-sm mt-1">新增景點後，照片將自動從 Google Maps 載入</p>
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3">
              {filteredPhotos.map((item, index) => (
                <div
                  key={`${item.spot.id}-${item.photoIndex}`}
                  className="break-inside-avoid mb-3"
                >
                  <div
                    onClick={() => handlePhotoClick(index)}
                    className="group relative rounded-xl overflow-hidden cursor-pointer bg-gray-100 shadow-sm hover:shadow-lg transition-all"
                  >
                    <img
                      src={getSpotPhotoUrl(item.photo.photoReference, 400)}
                      alt={item.spot.name}
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    
                    {/* Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full ${getCategoryColor(item.spot.category)}`} />
                          <span className="text-xs text-white/70">{item.dayTitle}</span>
                        </div>
                        <h4 className="text-sm font-medium text-white line-clamp-1">{item.spot.name}</h4>
                      </div>
                    </div>

                    {/* Photo Count Badge */}
                    {item.spot.photos!.length > 1 && item.photoIndex === 0 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 backdrop-blur text-white text-xs rounded-full flex items-center gap-1">
                        <Camera size={12} />
                        {item.spot.photos!.length}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={filteredPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={handleLightboxPrev}
          onNext={handleLightboxNext}
        />
      )}
    </>
  );
});

PhotoWall.displayName = 'PhotoWall';

export default PhotoWall;
