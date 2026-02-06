import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { ParkingLocation, KINGSTON_CENTER, getStatusColor } from '@/data/parkingData';
import { useMemo, useCallback, useState } from 'react';
import { MapPin, Car, Warehouse, Navigation } from 'lucide-react';

interface MapViewProps {
  parkingData: ParkingLocation[];
  selectedLocation: ParkingLocation | null;
  onSelectLocation: (location: ParkingLocation | null) => void;
  googleMapsApiKey: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8b9ab5' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d4d9e6' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b7a94' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1e3a2f' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#2a3142' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1a1f2e' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3a4256' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2a3142' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0e1626' }],
  },
];

function getMarkerIcon(location: ParkingLocation): google.maps.Symbol {
  const status = getStatusColor(location.availableSpots, location.totalSpots);
  const colors = {
    available: '#10B981',
    low: '#F59E0B',
    full: '#EF4444',
  };
  
  return {
    path: location.type === 'lot' 
      ? 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'
      : 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
    fillColor: colors[status],
    fillOpacity: 1,
    strokeColor: '#1a1f2e',
    strokeWeight: 2,
    scale: 1.5,
    anchor: new google.maps.Point(12, 22),
  };
}

export function MapView({ parkingData, selectedLocation, onSelectLocation, googleMapsApiKey }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey,
    id: 'google-map-script',
  });
  
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const options = useMemo<google.maps.MapOptions>(
    () => ({
      styles: darkMapStyles,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    }),
    []
  );

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMarkerClick = useCallback((location: ParkingLocation) => {
    onSelectLocation(location);
    if (map) {
      map.panTo({ lat: location.lat, lng: location.lng });
    }
  }, [map, onSelectLocation]);

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <MapPin className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Failed to load map</h2>
          <p className="text-muted-foreground">Please check your API key and try again.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={KINGSTON_CENTER}
        zoom={16}
        options={options}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={() => onSelectLocation(null)}
      >
        {parkingData.map(location => (
          <Marker
            key={location.id}
            position={{ lat: location.lat, lng: location.lng }}
            icon={getMarkerIcon(location)}
            onClick={() => handleMarkerClick(location)}
            animation={selectedLocation?.id === location.id ? google.maps.Animation.BOUNCE : undefined}
          />
        ))}
        
        {selectedLocation && (
          <InfoWindow
            position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
            onCloseClick={() => onSelectLocation(null)}
            options={{
              pixelOffset: new google.maps.Size(0, -35),
            }}
          >
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                {selectedLocation.type === 'street' ? (
                  <Car className="w-4 h-4" style={{ color: '#4B5563' }} />
                ) : (
                  <Warehouse className="w-4 h-4" style={{ color: '#4B5563' }} />
                )}
                <h3 className="font-semibold" style={{ color: '#111827' }}>{selectedLocation.name}</h3>
              </div>
              
              {selectedLocation.address && (
                <p className="text-sm mb-2 flex items-center gap-1" style={{ color: '#6B7280' }}>
                  <Navigation className="w-3 h-3" />
                  {selectedLocation.address}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold" style={{ color: '#111827' }}>
                    {selectedLocation.availableSpots}
                  </span>
                  <span className="text-sm" style={{ color: '#6B7280' }}>
                    {' '}/ {selectedLocation.totalSpots} spots
                  </span>
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      {/* Map Legend */}
      <div className="absolute bottom-6 left-6 glass-panel rounded-xl p-4 animate-fade-in">
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