import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Spot } from '../types';

// Fix Leaflet marker icons
const iconPerson = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
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

// Component to handle map movement
const MapController: React.FC<{ selectedSpot: Spot | null, spots: Spot[] }> = ({ selectedSpot, spots }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedSpot) {
      map.flyTo([selectedSpot.coordinates.lat, selectedSpot.coordinates.lng], 16, {
        duration: 1.5
      });
    } else if (spots.length > 0) {
      // Fit bounds to all spots if none selected
      const bounds = L.latLngBounds(spots.map(s => [s.coordinates.lat, s.coordinates.lng]));
      map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else {
        // Default Tokyo view
        map.setView([35.6895, 139.6917], 11);
    }
  }, [selectedSpot, spots, map]);

  return null;
};

export const MapPreview: React.FC<MapPreviewProps> = ({ spots, selectedSpot }) => {
  const mapRef = useRef<L.Map>(null);

  return (
    <div className="h-full w-full relative z-0">
       <MapContainer 
        center={[35.6895, 139.6917]} 
        zoom={13} 
        scrollWheelZoom={true}
        ref={mapRef}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {spots.map((spot) => (
          <Marker 
            key={spot.id} 
            position={[spot.coordinates.lat, spot.coordinates.lng]}
            icon={iconPerson}
          >
            <Popup>
              <div className="text-center">
                <strong className="block text-sm mb-1">{spot.name}</strong>
                <span className="text-xs text-gray-500">{spot.category}</span>
              </div>
            </Popup>
          </Marker>
        ))}
        
        <MapController selectedSpot={selectedSpot} spots={spots} />
      </MapContainer>
    </div>
  );
};
