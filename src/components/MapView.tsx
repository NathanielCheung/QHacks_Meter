import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { ParkingLocation, KINGSTON_CENTER, getStatusColor } from '@/data/parkingData';
import { useEffect } from 'react';
import { MapPin, Car, Warehouse, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapViewProps {
  parkingData: ParkingLocation[];
  selectedLocation: ParkingLocation | null;
  onSelectLocation: (location: ParkingLocation | null) => void;
}

// Custom marker icons based on status
function createMarkerIcon(status: 'available' | 'low' | 'full', type: 'street' | 'lot') {
  const colors = {
    available: '#10B981',
    low: '#F59E0B',
    full: '#EF4444',
  };
  
  const color = colors[status];
  const size = type === 'lot' ? 32 : 28;
  
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="#1a1f2e" stroke-width="2">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      ${type === 'lot' ? '<circle cx="12" cy="9" r="3" fill="#1a1f2e"/>' : ''}
    </svg>
  `;
  
  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// Component to handle map panning when selection changes
function MapController({ selectedLocation }: { selectedLocation: ParkingLocation | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedLocation) {
      map.panTo([selectedLocation.lat, selectedLocation.lng], { animate: true });
    }
  }, [selectedLocation, map]);
  
  return null;
}

export function MapView({ parkingData, selectedLocation, onSelectLocation }: MapViewProps) {
  return (
    <div className="flex-1 relative">
      <MapContainer
        center={[KINGSTON_CENTER.lat, KINGSTON_CENTER.lng]}
        zoom={16}
        className="h-full w-full"
        zoomControl={true}
        style={{ background: '#1a1f2e' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapController selectedLocation={selectedLocation} />
        
        {parkingData.map(location => {
          const status = getStatusColor(location.availableSpots, location.totalSpots);
          const isSelected = selectedLocation?.id === location.id;
          
          return (
            <Marker
              key={location.id}
              position={[location.lat, location.lng]}
              icon={createMarkerIcon(status, location.type)}
              eventHandlers={{
                click: () => onSelectLocation(location),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-2">
                    {location.type === 'street' ? (
                      <Car className="w-4 h-4" style={{ color: '#4B5563' }} />
                    ) : (
                      <Warehouse className="w-4 h-4" style={{ color: '#4B5563' }} />
                    )}
                    <h3 className="font-semibold" style={{ color: '#111827' }}>{location.name}</h3>
                  </div>
                  
                  {location.address && (
                    <p className="text-sm mb-2 flex items-center gap-1" style={{ color: '#6B7280' }}>
                      <Navigation className="w-3 h-3" />
                      {location.address}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xl font-bold" style={{ color: '#111827' }}>
                        {location.availableSpots}
                      </span>
                      <span className="text-sm" style={{ color: '#6B7280' }}>
                        {' '}/ {location.totalSpots} spots
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      
      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 glass-panel rounded-xl p-4 animate-fade-in z-[1000]">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Availability
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-status-available" />
            <span className="text-sm text-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-status-low" />
            <span className="text-sm text-foreground">Limited (&lt;20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-status-full" />
            <span className="text-sm text-foreground">Full</span>
          </div>
        </div>
      </div>
    </div>
  );
}
