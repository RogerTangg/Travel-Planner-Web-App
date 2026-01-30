import React, { useEffect, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Spot } from '../types';

// Fix Leaflet marker icons with optimized loading
const defaultIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  iconSize: [25, 41]
});

const selectedIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
  iconSize: [25, 41]
});

interface MapPreviewProps {
  spots: Spot[];
  selectedSpot: Spot | null;
}

// Optimized Map Controller with debounced updates
const MapController: React.FC<{ selectedSpot: Spot | null; spots: Spot[] }> = ({ selectedSpot, spots }) => {
  const map = useMap();

  // Debounced invalidateSize
  useEffect(() => {
    let rafId: number;
    const invalidate = () => {
      rafId = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false });
      });
    };

    // Initial invalidate
    invalidate();

    // Throttled resize handler
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

  // Optimized fly to selected spot
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
  // Memoize markers to prevent unnecessary re-renders
  const markers = useMemo(() => 
    spots.map((spot) => ({
      id: spot.id,
      position: [spot.coordinates.lat, spot.coordinates.lng] as [number, number],
      name: spot.name,
      description: spot.description,
      isSelected: selectedSpot?.id === spot.id
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
        {/* Use faster tile server with better caching */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
          updateWhenIdle={true}
          updateWhenZooming={false}
          keepBuffer={2}
        />
        
        <MapController selectedSpot={selectedSpot} spots={spots} />
        
        {markers.map((marker) => (
          <Marker 
            key={marker.id} 
            position={marker.position}
            icon={marker.isSelected ? selectedIcon : defaultIcon}
          >
            <Popup>
              <div className="p-1 min-w-[120px]">
                <h3 className="font-bold text-sm text-gray-800">{marker.name}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{marker.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};
