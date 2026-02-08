import { useState, useEffect } from 'react';
import { MapView, SearchLocation, type RouteSummary, type DestinationPoint } from '@/components/MapView';
import type { RouteStep } from '@/lib/osrm';
import { Sidebar } from '@/components/Sidebar';
import { SearchBar } from '@/components/SearchBar';
import { ParkingChatBot } from '@/components/ParkingChatBot';
import { useParkingData } from '@/hooks/useParkingData';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { List, Locate, Loader2, MapPin, Navigation, X } from 'lucide-react';
import { useGeolocation } from '@/hooks/useGeolocation';
import {
  ParkingLocation,
  filterLotsByAccessibility,
  type AccessibilityFilterState,
} from '@/data/parkingData';
import { geocodeAddress } from '@/lib/geocoding';
import { haversineDistance } from '@/lib/distance';

const SEARCH_RADIUS_METERS = 200;

function filterParkingWithinRadius(
  parking: ParkingLocation[],
  lat: number,
  lng: number,
  radiusM: number
): ParkingLocation[] {
  return parking.filter(loc => haversineDistance(lat, lng, loc.lat, loc.lng) <= radiusM);
}

const INITIAL_ACCESSIBILITY_FILTERS: AccessibilityFilterState = {
  evCharging: false,
  accessibleParking: false,
  minHeightClearanceM: 0,
};

export default function Index() {
  const [selectedLocation, setSelectedLocation] = useState<ParkingLocation | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<DestinationPoint | null>(null);
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  const [searchLocation, setSearchLocation] = useState<SearchLocation | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [accessibilityFilters, setAccessibilityFilters] = useState<AccessibilityFilterState>(
    INITIAL_ACCESSIBILITY_FILTERS
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeInstructions, setRouteInstructions] = useState<RouteStep[] | null>(null);
  const [directionsSheetOpen, setDirectionsSheetOpen] = useState(false);
  const { history: searchHistory, addToHistory } = useSearchHistory();
  const { location: userGeoLocation, loading: locationLoading, error: locationError, requestLocation } = useGeolocation();

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const {
    parkingData,
    lastUpdated,
    totalAvailable,
    totalSpots,
    streets,
    lots,
  } = useParkingData(10000);

  const handleSearch = async (address: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await geocodeAddress(address, {
        viewbox: '-76.55,44.20,-76.45,44.25',
        limit: 1,
      });
      if (!result) {
        setSearchError('Address not found. Try including "Kingston, ON".');
        return;
      }
      addToHistory(address);
      setSearchLocation(result);
      setSelectedLocation(null);
    } catch {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearSearch = () => {
    setSearchLocation(null);
    setSearchError(null);
    setSelectedLocation(null);
    setSelectedDestination(null);
  };

  const handleSelectLocation = (location: ParkingLocation | null, destination?: DestinationPoint) => {
    setSelectedLocation(location);
    setSelectedDestination(destination ?? null);
    setRouteConfirmed(true);
    setDirectionsSheetOpen(true);
  };

  const handleSelectLocationFromSidebar = (location: ParkingLocation) => {
    setSelectedLocation(location);
    setSelectedDestination(null);
    setRouteConfirmed(false);
  };

  const displayStreets = searchLocation
    ? filterParkingWithinRadius(
        streets,
        searchLocation.lat,
        searchLocation.lng,
        SEARCH_RADIUS_METERS
      )
    : streets;
  const lotsAfterSearch = searchLocation
    ? filterParkingWithinRadius(lots, searchLocation.lat, searchLocation.lng, SEARCH_RADIUS_METERS)
    : lots;
  const displayLots = filterLotsByAccessibility(lotsAfterSearch, accessibilityFilters);
  const displayParkingData = [...displayStreets, ...displayLots];

  const searchTotalAvailable = displayParkingData.reduce((s, l) => s + l.availableSpots, 0);
  const searchTotalSpots = displayParkingData.reduce((s, l) => s + l.totalSpots, 0);
  const isMobile = useIsMobile();

  const chatUserLocation = userGeoLocation ?? (searchLocation ? { lat: searchLocation.lat, lng: searchLocation.lng } : null);

  const sidebarProps = {
    streets: displayStreets,
    lots: displayLots,
    totalAvailable: searchLocation ? searchTotalAvailable : totalAvailable,
    totalSpots: searchLocation ? searchTotalSpots : totalSpots,
    lastUpdated,
    selectedLocation,
    onSelectLocation: handleSelectLocationFromSidebar,
    onConfirmDirections: () => {
      setRouteConfirmed(true);
      setDirectionsSheetOpen(true);
    },
    hasUserLocation: !!userGeoLocation,
    searchActive: !!searchLocation,
    searchRadiusMeters: SEARCH_RADIUS_METERS,
    searchResultCount: displayParkingData.length,
    routeSummary: userGeoLocation && routeConfirmed ? routeSummary : null,
    accessibilityFilters,
    onAccessibilityFiltersChange: setAccessibilityFilters,
  };

  const showDirectionsPanel = !!(routeSummary && routeInstructions?.length);
  const directionsPanelOpen = directionsSheetOpen && showDirectionsPanel;
  /** On mobile, open directions sheet as soon as user requested directions (show loading until route loads) */
  const mobileDirectionsOpen = directionsSheetOpen && routeConfirmed;

  useEffect(() => {
    if (!showDirectionsPanel) setDirectionsSheetOpen(false);
  }, [showDirectionsPanel]);

  return (
    <div className="h-[100svh] max-h-[100dvh] flex flex-col overflow-hidden relative">
      {/* Desktop: directions sidebar (left) + map + parking list sidebar */}
      {!isMobile && (
        <>
          {/* Left: Directions sidebar when route is active */}
          {directionsPanelOpen && (
            <aside className="w-80 shrink-0 flex flex-col border-r border-border/50 glass-panel overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-border/50 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Navigation className="w-4 h-4" />
                    </span>
                    Directions
                  </h2>
                  {routeSummary && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {routeSummary.duration} • {routeSummary.distance}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDirectionsSheetOpen(false)}
                  aria-label="Close directions"
                  className="h-8 w-8 shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ul className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
                {routeInstructions?.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="text-foreground">{step.instruction}</span>
                      {step.distance && (
                        <span className="ml-2 text-muted-foreground">{step.distance}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </aside>
          )}
          <div className="flex-1 flex flex-col relative min-w-0">
            <div className="absolute top-4 left-4 right-4 z-[1000] flex gap-2">
              <div className="flex-1 max-w-md">
                <SearchBar
                  onSearch={handleSearch}
                  onClear={handleClearSearch}
                  isSearching={isSearching}
                  searchActive={!!searchLocation}
                  placeholder="Search by address (e.g. 216 Ontario St, Kingston)"
                  searchHistory={searchHistory}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                onClick={requestLocation}
                disabled={locationLoading}
                className="shrink-0 glass-panel h-10 w-10"
                aria-label="Use my location"
                title="Use my location"
              >
                {locationLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Locate className="h-5 w-5" />
                )}
              </Button>
            </div>
            {(searchError || locationError) && (
              <div className="absolute top-16 left-4 right-4 z-[1000] max-w-md space-y-1">
                {searchError && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-2 rounded-lg">
                    {searchError}
                  </div>
                )}
                {locationError && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-2 rounded-lg">
                    {locationError}
                  </div>
                )}
              </div>
            )}
            <MapView
              parkingData={displayParkingData}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              selectedDestination={selectedDestination}
              routeConfirmed={routeConfirmed}
              searchLocation={searchLocation}
              userLocation={userGeoLocation}
              onRouteSummary={setRouteSummary}
              onRouteInstructions={setRouteInstructions}
              searchRadiusMeters={SEARCH_RADIUS_METERS}
              isMobile={false}
            />
          </div>
          {/* Parking list - right */}
          {sidebarOpen ? (
            <Sidebar {...sidebarProps} onClose={() => setSidebarOpen(false)} />
          ) : (
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-[1001] h-10 w-10 rounded-l-lg rounded-r-none glass-panel shadow-lg"
              aria-label="Open parking list"
            >
              <List className="w-5 h-5" />
            </Button>
          )}
        </>
      )}

      <ParkingChatBot
        parkingData={parkingData}
        userLocation={chatUserLocation}
      />

      {/* Directions bottom sheet (mobile only; opens as soon as user taps Get directions) */}
      {isMobile && (
        <Sheet open={mobileDirectionsOpen} onOpenChange={setDirectionsSheetOpen}>
          <SheetContent
            side="bottom"
            className="h-[45dvh] max-h-[380px] flex flex-col p-0 rounded-t-2xl bg-background/90 backdrop-blur-xl border-border/50 z-[1100]"
          >
            <div className="p-4 border-b border-border/50 shrink-0 bg-background/80 backdrop-blur-sm">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <Navigation className="w-4 h-4" />
                </span>
                Directions
                {routeSummary && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {routeSummary.duration} • {routeSummary.distance}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col bg-background/60">
              {routeInstructions?.length ? (
                <ul className="space-y-2 scrollbar-thin">
                  {routeInstructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                        {i + 1}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="text-foreground">{step.instruction}</span>
                        {step.distance && (
                          <span className="ml-2 text-muted-foreground">{step.distance}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  Loading directions…
                </p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Mobile: map full screen, locations button, directions sheet - no scroll */}
      {isMobile && (
        <div className="flex-1 flex flex-col min-w-0 w-full min-h-0 overflow-hidden">
          <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2">
            <div className="flex-1 min-w-0">
              <SearchBar
                onSearch={handleSearch}
                onClear={handleClearSearch}
                isSearching={isSearching}
                searchActive={!!searchLocation}
                placeholder="Search address..."
                searchHistory={searchHistory}
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={requestLocation}
              disabled={locationLoading}
              className="shrink-0 glass-panel h-10 w-10"
              aria-label="Use my location"
              title="Use my location"
            >
              {locationLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Locate className="h-5 w-5" />
              )}
            </Button>
          </div>
          {(searchError || locationError) && (
            <div className="absolute top-14 left-3 right-3 z-[1000] space-y-1">
              {searchError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-2 rounded-lg">
                  {searchError}
                </div>
              )}
              {locationError && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-2 rounded-lg">
                  {locationError}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 relative min-h-0 w-full">
            <MapView
              parkingData={displayParkingData}
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              selectedDestination={selectedDestination}
              routeConfirmed={routeConfirmed}
              searchLocation={searchLocation}
              userLocation={userGeoLocation}
              onRouteSummary={setRouteSummary}
              onRouteInstructions={setRouteInstructions}
              searchRadiusMeters={SEARCH_RADIUS_METERS}
              isMobile={true}
            />
          </div>

          {/* Mobile bottom bar: flex child so it stays in view without scroll */}
          <div className="shrink-0 flex justify-center p-3 pt-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2 glass-panel shadow-lg px-6"
                  aria-label="Open parking locations"
                >
                  <MapPin className="w-5 h-5" />
                  Locations ({totalAvailable})
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] overflow-hidden flex flex-col p-0">
                <div className="flex-1 overflow-y-auto min-h-0">
                  <Sidebar {...sidebarProps} embedded={true} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}
    </div>
  );
}
