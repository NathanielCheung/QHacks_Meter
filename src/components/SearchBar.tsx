import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2, History } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (address: string) => Promise<void>;
  onClear: () => void;
  isSearching: boolean;
  searchActive: boolean;
  placeholder?: string;
  className?: string;
  searchHistory?: string[];
}

export function SearchBar({
  onSearch,
  onClear,
  isSearching,
  searchActive,
  placeholder = 'Search by address...',
  className,
  searchHistory = [],
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    await onSearch(trimmed);
    setShowHistory(false);
  };

  const handleSelectHistory = (address: string) => {
    setQuery(address);
    onSearch(address);
    setShowHistory(false);
  };

  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-2', className)}>
      <div ref={containerRef} className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => searchHistory.length > 0 && setShowHistory(true)}
          placeholder={placeholder}
          disabled={isSearching}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        {searchActive && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              onClear();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {showHistory && searchHistory.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 rounded-lg border border-border bg-popover shadow-lg overflow-hidden z-[1100]">
            <div className="p-2 border-b border-border/50">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground">
                <History className="w-3.5 h-3.5" />
                Recent searches
              </div>
            </div>
            <ul className="max-h-48 overflow-y-auto">
              {searchHistory.map((address, i) => (
                <li key={`${address}-${i}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectHistory(address)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors truncate"
                  >
                    {address}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Button type="submit" disabled={isSearching || !query.trim()} size="icon" className="shrink-0">
        {isSearching ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Search className="w-4 h-4" />
        )}
      </Button>
    </form>
  );
}
