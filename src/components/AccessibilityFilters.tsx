import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Accessibility, Zap, Truck, X, BadgeDollarSign } from 'lucide-react';
import type { AccessibilityFilterState } from '@/data/parkingData';

export type { AccessibilityFilterState };

export interface AccessibilityFiltersProps {
  filters: AccessibilityFilterState;
  onChange: (filters: AccessibilityFilterState) => void;
  embedded?: boolean;
  /** When true, render as compact content for popover (no aside, no full height) */
  compact?: boolean;
  onClose?: () => void;
}

const HEIGHT_OPTIONS = [
  { value: 0, label: 'Any' },
  { value: 1.8, label: '1.8 m (6 ft)' },
  { value: 2.0, label: '2.0 m (6.5 ft)' },
  { value: 2.1, label: '2.1 m (7 ft)' },
  { value: 2.4, label: '2.4 m (8 ft)' },
];

export function AccessibilityFilters({ filters, onChange, embedded, compact, onClose }: AccessibilityFiltersProps) {
  const content = (
    <div className={compact ? 'p-4 space-y-6' : 'flex-1 overflow-y-auto p-4 space-y-6'}>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="free-parking"
            checked={filters.freeParking}
            onCheckedChange={checked =>
              onChange({ ...filters, freeParking: !!checked })
            }
          />
          <Label
            htmlFor="free-parking"
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <BadgeDollarSign className="w-4 h-4 text-emerald-500" />
            Free parking
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="ev-charging"
            checked={filters.evCharging}
            onCheckedChange={checked =>
              onChange({ ...filters, evCharging: !!checked })
            }
          />
          <Label
            htmlFor="ev-charging"
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            EV charging
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="accessible-parking"
            checked={filters.accessibleParking}
            onCheckedChange={checked =>
              onChange({ ...filters, accessibleParking: !!checked })
            }
          />
          <Label
            htmlFor="accessible-parking"
            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <Accessibility className="w-4 h-4 text-primary" />
            Accessible parking
          </Label>
        </div>
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Truck className="w-4 h-4 text-muted-foreground" />
            Min. height clearance
          </Label>
          <div className="flex gap-2 flex-wrap">
            {HEIGHT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  onChange({ ...filters, minHeightClearanceM: value })
                }
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filters.minHeightClearanceM === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
    </div>
  );

  if (compact) {
    return (
      <div className="flex flex-col">
        <div className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Accessibility</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Filter lots & garages
          </p>
        </div>
        {content}
      </div>
    );
  }

  return (
    <aside
      className={`h-full glass-panel flex flex-col overflow-hidden ${
        embedded ? 'w-full' : 'w-72 border-r border-border/50'
      }`}
    >
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Accessibility className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Accessibility</h2>
          </div>
          {onClose && !embedded && (
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close filters" className="h-8 w-8 shrink-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Filter lots & garages
        </p>
      </div>
      {content}
    </aside>
  );
}
