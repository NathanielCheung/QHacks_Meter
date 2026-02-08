import {
  ParkingLocation,
  getStatusColor,
  isLocationOpen,
  getCurrentPrice,
  getHoursDisplay,
} from '@/data/parkingData';
import { StatusBadge } from './StatusBadge';
import { MapPin, Car, Warehouse, Clock, DollarSign, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RouteSummary } from './MapView';

interface ParkingCardProps {
  location: ParkingLocation;
  isSelected?: boolean;
  onClick?: () => void;
  currentTime?: Date;
  /** When selected and user location is on: driving distance & time from you (OSRM) */
  routeSummary?: RouteSummary | null;
  /** When selected: callback for "Get directions" button (sidebar only) */
  onGetDirections?: () => void;
}

export function ParkingCard({
  location,
  isSelected,
  onClick,
  currentTime = new Date(),
  routeSummary,
  onGetDirections,
}: ParkingCardProps) {
  const isOpen = isLocationOpen(location, currentTime);
  const price = getCurrentPrice(location, currentTime);
  const status = isOpen
    ? getStatusColor(location.availableSpots, location.totalSpots)
    : 'full'; // Show as full/limited when closed

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg transition-all duration-200',
        'hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
        'border border-transparent',
        isSelected && 'bg-secondary border-primary/30',
        !isOpen && 'opacity-80'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-lg',
            status === 'available' && 'bg-emerald-500/10',
            status === 'low' && 'bg-amber-500/10',
            status === 'full' && 'bg-red-500/10'
          )}
        >
          {location.type === 'street' ? (
            <Car
              className={cn(
                'w-5 h-5',
                status === 'available' && 'text-emerald-400',
                status === 'low' && 'text-amber-400',
                status === 'full' && 'text-red-400'
              )}
            />
          ) : (
            <Warehouse
              className={cn(
                'w-5 h-5',
                status === 'available' && 'text-emerald-400',
                status === 'low' && 'text-amber-400',
                status === 'full' && 'text-red-400'
              )}
            />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-foreground truncate">{location.name}</h3>
            <StatusBadge
              available={isOpen ? location.availableSpots : 0}
              total={location.totalSpots}
              showLabel={!isOpen}
              label={!isOpen ? 'Closed' : undefined}
              size="sm"
            />
          </div>

          {location.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{location.address}</span>
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <span
              className={cn(
                'text-2xl font-bold',
                status === 'available' && 'text-emerald-400',
                status === 'low' && 'text-amber-400',
                status === 'full' && 'text-red-400'
              )}
            >
              {isOpen ? location.availableSpots : 0}
            </span>
            <span className="text-sm text-muted-foreground">
              / {location.totalSpots} spots
            </span>
            {location.maxStayHours && (
              <span className="text-xs text-muted-foreground">
                • max {location.maxStayHours}h
              </span>
            )}
          </div>

          {/* Price and hours - matches map popup display */}
          {(location.type === 'lot' || location.type === 'street') && (
            <div className="mt-2 flex flex-col gap-1 text-sm">
              {!isOpen && location.operatingHours && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Closed • {getHoursDisplay(location)}
                </p>
              )}
              {price && (
                <p className="flex items-center gap-1.5 font-medium text-emerald-500">
                  <DollarSign className="w-3.5 h-3.5 shrink-0" />
                  {price.label}
                </p>
              )}
              {(isOpen || location.type === 'street') && location.operatingHours && (
                <p className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  {getHoursDisplay(location)}
                </p>
              )}
              {routeSummary && (
                <p className="flex items-center gap-1.5 mt-1.5 text-primary font-medium">
                  <Navigation className="w-3.5 h-3.5 shrink-0" />
                  {routeSummary.duration} • {routeSummary.distance} from you
                </p>
              )}
              {isSelected && onGetDirections && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <p className="text-xs mb-2 text-muted-foreground">
                    Get directions to {location.name}?
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onGetDirections();
                    }}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Get directions
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
