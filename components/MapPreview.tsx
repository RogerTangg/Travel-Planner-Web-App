import React, { useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { Spot, SpotCategory } from '../types';

// Category color mapping for markers
const getCategoryColor = (category: SpotCategory): string => {
  switch (category) {
    case SpotCategory.FOOD: return '#F97316'; // orange
    case SpotCategory.CAFE: return '#F59E0B'; // amber
    case SpotCategory.BAR: return '#8B5CF6'; // violet
    case SpotCategory.HOTEL: return '#3B82F6'; // blue
    case SpotCategory.COMMUTE: return '#64748B'; // slate
    case SpotCategory.SHOPPING: return '#EC4899'; // pink
    case SpotCategory.MUSEUM: return '#6366F1'; // indigo
    case SpotCategory.SHRINE_TEMPLE: return '#EF4444'; // red
    case SpotCategory.PARK: return '#22C55E'; // green
    case SpotCategory.ENTERTAINMENT: return '#06B6D4'; // cyan
    case SpotCategory.CUSTOM: return '#A855F7'; // purple
    default: return '#F43F5E'; // rose - sightseeing
  }
};

// Create custom colored marker icon
const createColoredIcon = (color: string, isSelected: boolean) => {
  const size = isSelected ? 36 : 28;
  const shadowSize = isSelected ? 44 : 36;
  
  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${isSelected ? `linear-gradient(135deg, ${color}, ${color}dd)` : color};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: ${isSelected ? '0 4px 12px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.3)'};
        display: flex;
        align-items: center;
        justify-content: center;
        ${isSelected ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: ${isSelected ? '14px' : '12px'};
          font-weight: bold;
        ">●</div>
      </div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: rotate(-45deg) scale(1); }
          50% { transform: rotate(-45deg) scale(1.1); }
        }
      </style>
    `,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 5]
  });
};

interface MapPreviewProps {
  spots: Spot[];
  selectedSpot: Spot | null;
}

// Optimized Map Controller
const MapController: React.FC<{ selectedSpot: Spot | null; spots: Spot[] }> = ({ selectedSpot, spots }) => {
  const map = useMap();

  useEffect(() => {
    let rafId: number;
    const invalidate = () => {
      rafId = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    };

    invalidate();

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(invalidate, 100);
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (selectedSpot) {
      map.flyTo(
        [selectedSpot.coordinates.lat, selectedSpot.coordinates.lng], 
        16, 
        { duration: 0.8, easeLinearity: 0.5 }
      );
    } else if (spots.length > 0) {
      const bounds = L.latLngBounds(spots.map(s => [s.coordinates.lat, s.coordinates.lng]));
      map.flyToBounds(bounds, { 
        padding: [40, 40], 
        maxZoom: 14,
        duration: 0.8 
      });
    } else {
      map.setView([35.6895, 139.6917], 11);
    }
  }, [selectedSpot, spots.length, map]);

  return null;
};

export const MapPreview: React.FC<MapPreviewProps> = ({ spots, selectedSpot }) => {
  // Memoize markers with colors
  const markers = useMemo(() => 
    spots.map((spot) => ({
      id: spot.id,
      position: [spot.coordinates.lat, spot.coordinates.lng] as [number, number],
      name: spot.name,
      description: spot.description,
      category: spot.category,
      color: getCategoryColor(spot.category),
      isSelected: selectedSpot?.id === spot.id,
      startTime: spot.startTime,
      endTime: spot.endTime
    })),
    [spots, selectedSpot?.id]
  );

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={[35.6895, 139.6917]} 
        zoom={13} 
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        preferCanvas={true}
      >
        {/* Modern colorful map style - Stadia Alidade Smooth */}
        <TileLayer
          attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
          maxZoom={20}
          updateWhenIdle={true}
          updateWhenZooming={false}
          keepBuffer={2}
        />
        
        <MapController selectedSpot={selectedSpot} spots={spots} />
        
        {markers.map((marker, index) => (
          <Marker 
            key={marker.id} 
            position={marker.position}
            icon={createColoredIcon(marker.color, marker.isSelected)}
            zIndexOffset={marker.isSelected ? 1000 : index}
          >
            <Popup>
              <div className="p-2 min-w-[160px] max-w-[220px]">
                {/* Header with category color */}
                <div 
                  className="flex items-center gap-2 pb-2 mb-2 border-b"
                  style={{ borderColor: marker.color + '40' }}
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: marker.color }}
                  />
                  <span 
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: marker.color + '20', color: marker.color }}
                  >
                    {marker.category}
                  </span>
                </div>
                
                {/* Name */}
                <h3 className="font-bold text-sm text-gray-800 leading-tight">
                  {marker.name}
                </h3>
                
                {/* Description */}
                <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                  {marker.description}
                </p>
                
                {/* Time info */}
                {(marker.startTime || marker.endTime) && (
                  <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                    <span className="text-[10px] text-gray-400">🕐</span>
                    <span className="text-xs font-medium text-gray-600">
                      {marker.startTime || '--:--'} ~ {marker.endTime || '--:--'}
                    </span>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      {/* Map Legend - Enlarged */}
      {spots.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-100 p-3 min-w-[180px]">
          <div className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gradient-to-br from-sakura-400 to-sakura-500"></div>
            地圖圖例
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {Array.from(new Set(spots.map(s => s.category))).slice(0, 8).map(cat => (
              <div key={cat} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: getCategoryColor(cat) }}
                />
                <span className="text-[11px] text-gray-700 font-medium truncate">{cat}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
