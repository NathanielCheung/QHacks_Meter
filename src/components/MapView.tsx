import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, Polyline, useMap } from 'react-leaflet';
import {
  ParkingLocation,
  KINGSTON_CENTER,
  getStatusColor,
  getSpotPositions,
  isLocationOpen,
  getCurrentPrice,
  getHoursDisplay,
} from '@/data/parkingData';
import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import type { Layer } from 'leaflet';
import { MapPin, Car, Warehouse, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRoute, formatDistance, formatDuration, type OSRMRouteResult, type RouteStep } from '@/lib/osrm';

export interface SearchLocation {
  lat: number;
  lng: number;
  displayName: string;
}

export interface UserMapLocation {
  lat: number;
  lng: number;
}

export interface RouteSummary {
  distance: string;
  duration: string;
}

/** Exact point to route to (e.g. a specific street spot); when set, overrides selectedLocation lat/lng */
export interface DestinationPoint {
  lat: number;
  lng: number;
}

interface MapViewProps {
  parkingData: ParkingLocation[];
  selectedLocation: ParkingLocation | null;
  /** When selecting a street spot, pass its coords so directions go to that spot */
  onSelectLocation: (location: ParkingLocation | null, destination?: DestinationPoint) => void;
  /** When user clicked a specific spot, route here instead of location center */
  selectedDestination?: DestinationPoint | null;
  /** Only draw route when user confirmed (e.g. clicked "Get directions" in popup or sidebar) */
  routeConfirmed?: boolean;
  searchLocation?: SearchLocation | null;
  /** Browser geolocation: "You are here" marker and optional center */
  userLocation?: UserMapLocation | null;
  /** Called when a route from user to selected location is computed (OSRM) */
  onRouteSummary?: (summary: RouteSummary | null) => void;
  /** Called with turn-by-turn steps when a route is computed */
  onRouteInstructions?: (steps: RouteStep[] | null) => void;
  /** Walking route from parking to searched destination (line + steps in panel) */
  walkingRoute?: OSRMRouteResult | null;
  searchRadiusMeters?: number;
  isMobile?: boolean;
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

  // Parking lot: P symbol (parking sign style) with status-colored ring
  const lotSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="14" fill="${color}"/>
      <circle cx="16" cy="16" r="10" fill="white"/>
      <text x="16" y="21" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="black" text-anchor="middle">P</text>
    </svg>
  `;

  // Street: map pin shape
  const streetSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" stroke="#1a1f2e" stroke-width="2">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="#1a1f2e"/>
    </svg>
  `;

  const svgIcon = type === 'lot' ? lotSvg : streetSvg;

  return L.divIcon({
    html: svgIcon,
    className: 'custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// On mobile, Leaflet can get wrong size or not request tiles — invalidateSize + setView to force redraw.
function MapResizeHandler() {
  const map = useMap();
  useEffect(() => {
    const run = () => {
      map.invalidateSize();
      const c = map.getCenter();
      const z = map.getZoom();
      map.setView(c, z, { animate: false });
    };
    map.whenReady(run);
    const t1 = setTimeout(run, 150);
    const t2 = setTimeout(run, 500);
    const t3 = setTimeout(run, 1200);
    window.addEventListener('resize', run);
    window.addEventListener('orientationchange', run);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('resize', run);
      window.removeEventListener('orientationchange', run);
    };
  }, [map]);
  return null;
}

// Component to handle map panning when selection or search changes
function MapController({
  selectedLocation,
  selectedDestination,
  searchLocation,
  userLocation,
  routeConfirmed,
  layerRefs,
}: {
  selectedLocation: ParkingLocation | null;
  selectedDestination: DestinationPoint | null | undefined;
  searchLocation: SearchLocation | null | undefined;
  userLocation: UserMapLocation | null | undefined;
  routeConfirmed: boolean;
  layerRefs: React.MutableRefObject<Record<string, Layer | null>>;
}) {
  const map = useMap();
  const hasCenteredOnUserForRouteRef = useRef(false);
  const wasRouteConfirmedRef = useRef(false);

  useEffect(() => {
    if (selectedLocation) {
      if (routeConfirmed && userLocation) {
        wasRouteConfirmedRef.current = true;
        // Center on user once when they first get directions; don't do it again until they end directions
        if (!hasCenteredOnUserForRouteRef.current) {
          hasCenteredOnUserForRouteRef.current = true;
          map.setView([userLocation.lat, userLocation.lng], 16, { animate: true });
        }
      } else {
        hasCenteredOnUserForRouteRef.current = false;
        // When user clicks "End directions", don't auto-center; leave map where it is
        if (wasRouteConfirmedRef.current) {
          wasRouteConfirmedRef.current = false;
        } else {
          const center = selectedDestination ?? { lat: selectedLocation.lat, lng: selectedLocation.lng };
          map.setView([center.lat, center.lng], 18, { animate: true });
          const layer = layerRefs.current[selectedLocation.id] ?? null;
          const layerWithPopup = layer as { openPopup?: () => void } | null;
          if (layerWithPopup?.openPopup) layerWithPopup.openPopup();
        }
      }
    } else {
      hasCenteredOnUserForRouteRef.current = false;
      wasRouteConfirmedRef.current = false;
      if (searchLocation) {
        map.setView([searchLocation.lat, searchLocation.lng], 17, { animate: true });
      }
    }
  }, [selectedLocation, selectedDestination, searchLocation, userLocation, routeConfirmed, map]);

  return null;
}

// Search location marker icon
const searchIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#3B82F6" stroke="#1e3a8a" stroke-width="2">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
  </svg>`,
  className: 'search-marker',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// Button to re-center map on user's location (only when user has granted location)
function MyLocationButton({ userLocation }: { userLocation: UserMapLocation }) {
  const map = useMap();
  return (
    <div className="absolute right-16 bottom-6 z-[1000]">
      <button
        type="button"
        onClick={() => map.setView([userLocation.lat, userLocation.lng], 17, { animate: true })}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/50 bg-background/95 shadow-lg backdrop-blur-sm hover:bg-muted"
        aria-label="Center map on my location"
        title="My location"
      >
        <Navigation className="h-5 w-5 text-primary" />
      </button>
    </div>
  );
}

// "You are here" (geolocation) marker icon
const userLocationIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#22C55E" stroke="#15803d" stroke-width="2">
    <circle cx="12" cy="12" r="8"/>
    <circle cx="12" cy="12" r="3" fill="white"/>
  </svg>`,
  className: 'user-location-marker',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// Directions route from user location to selected parking or exact spot (OSRM)
function RouteLayer({
  userLocation,
  selectedLocation,
  selectedDestination,
  routeConfirmed,
  onRouteSummary,
  onRouteInstructions,
}: {
  userLocation: UserMapLocation | null | undefined;
  selectedLocation: ParkingLocation | null;
  selectedDestination: DestinationPoint | null | undefined;
  routeConfirmed: boolean;
  onRouteSummary: ((summary: RouteSummary | null) => void) | undefined;
  onRouteInstructions: ((steps: RouteStep[] | null) => void) | undefined;
}) {
  const [route, setRoute] = useState<OSRMRouteResult | null>(null);

  const toPoint =
    routeConfirmed && selectedLocation
      ? (selectedDestination ?? { lat: selectedLocation.lat, lng: selectedLocation.lng })
      : null;

  useEffect(() => {
    if (!userLocation || !toPoint) {
      setRoute(null);
      onRouteSummary?.(null);
      onRouteInstructions?.(null);
      return;
    }
    let cancelled = false;
    getRoute(userLocation, toPoint)
      .then((result) => {
        if (cancelled) return;
        setRoute(result ?? null);
        if (result) {
          onRouteSummary?.({
            distance: formatDistance(result.distance),
            duration: formatDuration(result.duration),
          });
          onRouteInstructions?.(result.steps ?? null);
        } else {
          onRouteSummary?.(null);
          onRouteInstructions?.(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRoute(null);
          onRouteSummary?.(null);
          onRouteInstructions?.(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [userLocation, toPoint, routeConfirmed, onRouteSummary, onRouteInstructions]);

  if (!route?.coordinates?.length) return null;

  return (
    <Polyline
      positions={route.coordinates}
      pathOptions={{
        color: '#3B82F6',
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10',
      }}
    />
  );
}

export function MapView({
  parkingData,
  selectedLocation,
  onSelectLocation,
  selectedDestination,
  routeConfirmed = false,
  searchLocation,
  userLocation,
  onRouteSummary,
  onRouteInstructions,
  walkingRoute = null,
  searchRadiusMeters = 200,
  isMobile = false,
}: MapViewProps) {
  const { resolvedTheme } = useTheme();
  const layerRefs = useRef<Record<string, Layer | null>>({});
  const isDark = resolvedTheme !== 'light';
  const [mobileMapReady, setMobileMapReady] = useState(false);
  useEffect(() => {
    if (!isMobile) return;
    const t = setTimeout(() => setMobileMapReady(true), 400);
    return () => clearTimeout(t);
  }, [isMobile]);

  const STATUS_COLORS = {
    available: '#10B981',
    low: '#F59E0B',
    full: '#EF4444',
  } as const;

  const ParkingPopupContent = ({
    location,
    destination,
    onSelectLocation: onSelect,
  }: {
    location: ParkingLocation;
    destination?: DestinationPoint;
    onSelectLocation: (location: ParkingLocation, destination?: DestinationPoint) => void;
  }) => {
    const map = useMap();
    const isOpen = isLocationOpen(location);
    const price = getCurrentPrice(location);
    const targetLabel = destination ? 'this spot' : location.name;
    const handleGetDirections = () => {
      onSelect(location, destination);
      map.closePopup();
    };
    return (
      <div className="p-2 min-w-[220px]">
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
            <Navigation className="w-3 h-3 shrink-0" />
            {location.address}
          </p>
        )}
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="text-2xl font-bold" style={{ color: '#111827' }}>
              {isOpen ? location.availableSpots : 0}
            </span>
            <span className="text-sm" style={{ color: '#6B7280' }}>
              {' '}/ {location.totalSpots} spots
              {location.maxStayHours && ` • max ${location.maxStayHours}h`}
            </span>
          </div>
        </div>
        {!isOpen && location.operatingHours && (
          <p className="text-xs mb-1" style={{ color: '#6B7280' }}>
            Closed • {getHoursDisplay(location)}
          </p>
        )}
        {price && (
          <p className="text-sm font-medium" style={{ color: '#059669' }}>
            {price.label}
          </p>
        )}
        {location.operatingHours && isOpen && (
          <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
            {getHoursDisplay(location)}
          </p>
        )}
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs mb-2" style={{ color: '#6B7280' }}>
            Get directions to {targetLabel}?
          </p>
          <button
            type="button"
            onClick={handleGetDirections}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-3 min-h-[44px] text-sm font-medium text-primary-foreground hover:bg-primary/90 touch-manipulation"
          >
            Get directions
          </button>
        </div>
      </div>
    );
  };

  const showPlaceholder = isMobile && !mobileMapReady;
  const bgStyle = { background: isDark ? '#1a1f2e' : '#e5e7eb' };

  return (
    <div className={`relative w-full h-full ${isMobile ? 'min-h-[200px]' : ''}`}>
      {showPlaceholder ? (
        <div className="w-full h-full min-h-[200px]" style={bgStyle} aria-hidden />
      ) : (
      <MapContainer
        center={[KINGSTON_CENTER.lat, KINGSTON_CENTER.lng]}
        zoom={16}
        className="h-full w-full"
        zoomControl={true}
        style={bgStyle}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={
            isDark
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
              : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'
          }
          subdomains="abcd"
          maxZoom={19}
          minZoom={2}
        />

        <MapResizeHandler />
        <MapController
          selectedLocation={selectedLocation}
          selectedDestination={selectedDestination}
          searchLocation={searchLocation}
          userLocation={userLocation}
          routeConfirmed={routeConfirmed ?? false}
          layerRefs={layerRefs}
        />

        {userLocation && <MyLocationButton userLocation={userLocation} />}

        <RouteLayer
          userLocation={userLocation}
          selectedLocation={selectedLocation}
          selectedDestination={selectedDestination}
          routeConfirmed={routeConfirmed ?? false}
          onRouteSummary={onRouteSummary}
          onRouteInstructions={onRouteInstructions}
        />

        {walkingRoute?.coordinates?.length ? (
          <Polyline
            positions={walkingRoute.coordinates}
            pathOptions={{
              color: '#22C55E',
              weight: 5,
              opacity: 0.9,
            }}
          />
        ) : null}

        {userLocation && (
          <Marker
            position={[userLocation.lat, userLocation.lng]}
            icon={userLocationIcon}
            zIndexOffset={999}
          >
            <Popup>
              <div className="p-2 min-w-[160px]">
                <p className="text-sm font-medium" style={{ color: '#111827' }}>You are here</p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                  Ask the chatbot for &quot;closest parking to me&quot;
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {searchLocation && (
          <>
            <Circle
              center={[searchLocation.lat, searchLocation.lng]}
              radius={searchRadiusMeters}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.1,
                weight: 2,
                interactive: false,
                className: 'search-radius-circle',
              }}
            />
            <Marker
              position={[searchLocation.lat, searchLocation.lng]}
              icon={searchIcon}
              zIndexOffset={1000}
            >
              <Popup>
                <div className="p-2 min-w-[180px]">
                  <p className="text-sm font-medium" style={{ color: '#111827' }}>
                    Search location
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                    {searchLocation.displayName}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                    Showing parking within {searchRadiusMeters}m
                  </p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {parkingData.map(location => {
          const isOpen = isLocationOpen(location);
          const status = isOpen
            ? getStatusColor(location.availableSpots, location.totalSpots)
            : 'full';
          const color = STATUS_COLORS[status];
          const isStreetWithPath = location.type === 'street' && location.path && location.path.length >= 2;

          if (isStreetWithPath) {
            return (
              <React.Fragment key={location.id}>
                <Polyline
                  ref={ref => {
                    if (ref) layerRefs.current[location.id] = ref;
                  }}
                  positions={location.path!}
                  pathOptions={{
                    color,
                    weight: 6,
                    opacity: 0.9,
                    className: 'street-parking-path',
                  }}
                >
                  <Popup>
                    <ParkingPopupContent location={location} onSelectLocation={onSelectLocation} />
                  </Popup>
                </Polyline>
                {getSpotPositions(location)
                  .slice(0, location.availableSpots)
                  .map((spot, i) => (
                    <CircleMarker
                      key={`${location.id}-spot-${i}`}
                      center={[spot.lat, spot.lng]}
                      radius={8}
                      pathOptions={{
                        color: isDark ? '#ffffff' : '#000000',
                        fillColor: isDark ? '#ffffff' : '#000000',
                        fillOpacity: 0.9,
                        weight: 2,
                        className: 'street-spot-marker',
                      }}
                    >
                      <Popup>
                        <ParkingPopupContent
                          location={location}
                          destination={{ lat: spot.lat, lng: spot.lng }}
                          onSelectLocation={onSelectLocation}
                        />
                      </Popup>
                    </CircleMarker>
                  ))}
              </React.Fragment>
            );
          }

          return (
            <Marker
              key={location.id}
              ref={ref => {
                if (ref) layerRefs.current[location.id] = ref;
              }}
              position={[location.lat, location.lng]}
              icon={createMarkerIcon(status, location.type)}
            >
              <Popup>
                <ParkingPopupContent location={location} onSelectLocation={onSelectLocation} />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      )}
      
      {/* Map Legend - desktop only */}
      {!isMobile && (
        <div className="absolute bottom-6 left-6 glass-panel rounded-xl animate-fade-in z-[1000] p-4">
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
      )}
    </div>
  );
}
