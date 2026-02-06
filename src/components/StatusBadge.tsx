import { getStatusColor, getStatusLabel } from '@/data/parkingData';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  available: number;
  total: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function StatusBadge({ available, total, showLabel = true, size = 'md' }: StatusBadgeProps) {
  const status = getStatusColor(available, total);
  
  return (
    <span
      className={cn(
        'status-badge',
        status === 'available' && 'status-available',
        status === 'low' && 'status-low',
        status === 'full' && 'status-full',
        size === 'sm' && 'text-[10px] px-2 py-0.5'
      )}
    >
      <span
        className={cn(
          'rounded-full',
          size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
          status === 'available' && 'bg-emerald-400',
          status === 'low' && 'bg-amber-400',
          status === 'full' && 'bg-red-400'
        )}
      />
      {showLabel && getStatusLabel(status)}
    </span>
  );
}
