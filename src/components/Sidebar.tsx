import { ParkingLocation, isLocationOpen } from '@/data/parkingData';
import { ParkingCard } from './ParkingCard';
import { ThemeToggle } from './ThemeToggle';
import { Button } from './ui/button';
import { Car, Warehouse, Clock, MapPin, X, Filter, ChevronRight } from 'lucide-react';
import type { RouteSummary } from './MapView';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AccessibilityFilters } from './AccessibilityFilters';
import type { AccessibilityFilterState } from '@/data/parkingData';
import { format } from 'date-fns';
import { useEffect, useRef, useState } from 'react';

/** Sort by most open spots to least (open locations first, then by availableSpots descending) */
function sortByMostOpenFirst(locations: ParkingLocation[], now: Date): ParkingLocation[] {
  return [...locations].sort((a, b) => {
    const aOpen = isLocationOpen(a, now);
    const bOpen = isLocationOpen(b, now);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    return b.availableSpots - a.availableSpots;
  });
}

interface SidebarProps {
  streets: ParkingLocation[];
  lots: ParkingLocation[];
  totalAvailable: number;
  totalSpots: number;
  lastUpdated: Date;
  selectedLocation: ParkingLocation | null;
  onSelectLocation: (location: ParkingLocation) => void;
  /** Call when user clicks "Get directions" on the selected card */
  onConfirmDirections?: () => void;
  /** When true, show "Get directions?" on the selected card */
  hasUserLocation?: boolean;
  searchActive?: boolean;
  searchRadiusMeters?: number;
  searchResultCount?: number;
  /** Directions from user's location to selected (when available) */
  routeSummary?: RouteSummary | null;
  embedded?: boolean;
  /** Accessibility filter state and handler for the Filter button in header */
  accessibilityFilters?: import('@/data/parkingData').AccessibilityFilterState;
  onAccessibilityFiltersChange?: (filters: import('@/data/parkingData').AccessibilityFilterState) => void;
  onClose?: () => void;
}

export function Sidebar({
  streets,
  lots,
  totalAvailable,
  totalSpots,
  lastUpdated,
  selectedLocation,
  onSelectLocation,
  onConfirmDirections,
  hasUserLocation = false,
  searchActive = false,
  searchRadiusMeters = 400,
  searchResultCount = 0,
  routeSummary = null,
  accessibilityFilters,
  onAccessibilityFiltersChange,
  embedded = false,
  onClose,
}: SidebarProps) {
  const now = new Date();
  const sortedStreets = sortByMostOpenFirst(streets, now);
  const sortedLots = sortByMostOpenFirst(lots, now);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [streetsOpen, setStreetsOpen] = useState(false);
  const [lotsOpen, setLotsOpen] = useState(false);

  useEffect(() => {
    if (selectedLocation && scrollContainerRef.current) {
      const inStreets = sortedStreets.some(s => s.id === selectedLocation.id);
      const inLots = sortedLots.some(l => l.id === selectedLocation.id);
      if (inStreets) setStreetsOpen(true);
      if (inLots) setLotsOpen(true);
      const el = cardRefs.current[selectedLocation.id];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedLocation, sortedStreets, sortedLots]);

  return (
    <aside
      className={`h-full glass-panel flex flex-col overflow-hidden ${
        embedded ? 'w-full' : 'w-96 animate-slide-in-right'
      }`}
    >
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Kingston Parking</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-muted-foreground">
                {searchActive
                  ? `Within ${searchRadiusMeters}m of search`
                  : 'Downtown availability'}
              </p>
              {accessibilityFilters != null && onAccessibilityFiltersChange && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs shrink-0"
                      aria-label="Accessibility filters"
                    >
                      <Filter className="w-3.5 h-3.5" />
                      Filter
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 max-h-[85vh] overflow-y-auto p-0" align="start">
                    <AccessibilityFilters
                      filters={accessibilityFilters}
                      onChange={onAccessibilityFiltersChange}
                      embedded
                      compact
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ThemeToggle />
            {onClose && !embedded && (
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close parking list" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div className="bg-secondary/50 rounded-xl p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">{totalAvailable}</span>
            <span className="text-muted-foreground">/ {totalSpots}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {searchActive
              ? `spots in ${searchResultCount} location${searchResultCount === 1 ? '' : 's'} nearby`
              : 'spots available downtown'}
          </p>
          
          <div className="flex flex-col gap-1 mt-3 text-xs text-muted-foreground">
            <span>Local time: {format(new Date(), 'EEE MMM d, h:mm a')}</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              <span>Updated {format(lastUpdated, 'h:mm:ss a')}</span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content: dropdowns for Street Parking and Parking Lots (collapsed by default) */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-4 space-y-1">
          <Collapsible open={streetsOpen} onOpenChange={setStreetsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <Car className="w-4 h-4 shrink-0" />
                <span>Street Parking</span>
                <span className="text-xs font-normal normal-case text-muted-foreground">
                  ({sortedStreets.length})
                </span>
                <ChevronRight
                  className={`w-4 h-4 ml-auto shrink-0 transition-transform ${streetsOpen ? 'rotate-0' : '-rotate-90'}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-1">
                {sortedStreets.map(location => (
                  <div
                    key={location.id}
                    ref={el => {
                      cardRefs.current[location.id] = el;
                    }}
                  >
                    <ParkingCard
                      location={location}
                      isSelected={selectedLocation?.id === location.id}
                      onClick={() => onSelectLocation(location)}
                      routeSummary={selectedLocation?.id === location.id ? routeSummary : null}
                      onGetDirections={
                        selectedLocation?.id === location.id && hasUserLocation
                          ? onConfirmDirections
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={lotsOpen} onOpenChange={setLotsOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted-foreground uppercase tracking-wide hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <Warehouse className="w-4 h-4 shrink-0" />
                <span>Parking Lots</span>
                <span className="text-xs font-normal normal-case text-muted-foreground">
                  ({sortedLots.length})
                </span>
                <ChevronRight
                  className={`w-4 h-4 ml-auto shrink-0 transition-transform ${lotsOpen ? 'rotate-0' : '-rotate-90'}`}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-1">
                {sortedLots.map(location => (
                  <div
                    key={location.id}
                    ref={el => {
                      cardRefs.current[location.id] = el;
                    }}
                  >
                    <ParkingCard
                      location={location}
                      isSelected={selectedLocation?.id === location.id}
                      onClick={() => onSelectLocation(location)}
                      routeSummary={selectedLocation?.id === location.id ? routeSummary : null}
                      onGetDirections={
                        selectedLocation?.id === location.id && hasUserLocation
                          ? onConfirmDirections
                          : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-border/50 bg-card/50">
        <p className="text-xs text-muted-foreground text-center">
          Demo data • Updates every 10 seconds
        </p>
      </div>
    </aside>
  );
}
