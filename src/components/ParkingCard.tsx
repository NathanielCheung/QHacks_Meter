import { ParkingLocation, getStatusColor } from '@/data/parkingData';
import { StatusBadge } from './StatusBadge';
import { MapPin, Car, Warehouse } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParkingCardProps {
  location: ParkingLocation;
  isSelected?: boolean;
  onClick?: () => void;
}

export function ParkingCard({ location, isSelected, onClick }: ParkingCardProps) {
  const status = getStatusColor(location.availableSpots, location.totalSpots);
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-4 rounded-lg transition-all duration-200',
        'hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
        'border border-transparent',
        isSelected && 'bg-secondary border-primary/30'
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
              available={location.availableSpots}
              total={location.totalSpots}
              showLabel={false}
              size="sm"
            />
          </div>
          
          {location.address && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" />
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
              {location.availableSpots}
            </span>
            <span className="text-sm text-muted-foreground">
              / {location.totalSpots} spots
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
