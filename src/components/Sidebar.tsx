import { ParkingLocation } from '@/data/parkingData';
import { ParkingCard } from './ParkingCard';
import { Car, Warehouse, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface SidebarProps {
  streets: ParkingLocation[];
  lots: ParkingLocation[];
  totalAvailable: number;
  totalSpots: number;
  lastUpdated: Date;
  selectedLocation: ParkingLocation | null;
  onSelectLocation: (location: ParkingLocation) => void;
}

export function Sidebar({
  streets,
  lots,
  totalAvailable,
  totalSpots,
  lastUpdated,
  selectedLocation,
  onSelectLocation,
}: SidebarProps) {
  return (
    <aside className="w-96 h-full glass-panel flex flex-col overflow-hidden animate-slide-in-right">
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Kingston Parking</h1>
            <p className="text-sm text-muted-foreground">Downtown availability</p>
          </div>
        </div>
        
        {/* Stats */}
        <div className="bg-secondary/50 rounded-xl p-4">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-primary">{totalAvailable}</span>
            <span className="text-muted-foreground">/ {totalSpots}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">spots available downtown</p>
          
          <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Updated {format(lastUpdated, 'h:mm:ss a')}</span>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Street Parking */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3 px-2">
            <Car className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Street Parking
            </h2>
          </div>
          <div className="space-y-1">
            {streets.map(location => (
              <ParkingCard
                key={location.id}
                location={location}
                isSelected={selectedLocation?.id === location.id}
                onClick={() => onSelectLocation(location)}
              />
            ))}
          </div>
        </div>
        
        {/* Parking Lots */}
        <div className="p-4 pt-0">
          <div className="flex items-center gap-2 mb-3 px-2">
            <Warehouse className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Parking Lots
            </h2>
          </div>
          <div className="space-y-1">
            {lots.map(location => (
              <ParkingCard
                key={location.id}
                location={location}
                isSelected={selectedLocation?.id === location.id}
                onClick={() => onSelectLocation(location)}
              />
            ))}
          </div>
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
