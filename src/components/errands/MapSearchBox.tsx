'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, MapPin, X, AlertCircle } from 'lucide-react';
import { OpenStreetMapProvider } from 'leaflet-geosearch';
import { Input } from '@/components/ui/input';

interface SearchResult {
  x: number; // lng
  y: number; // lat
  label: string;
}

interface MapSearchBoxProps {
  onSelectResult: (lat: number, lng: number, label?: string) => void;
  placeholder?: string;
}

export function MapSearchBox({
  onSelectResult,
  placeholder = 'Search place or address (e.g. MICA Shela)...',
}: MapSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const providerRef = useRef<OpenStreetMapProvider | null>(null);

  useEffect(() => {
    // Instantiate OpenStreetMapProvider with countrycodes biased toward India
    providerRef.current = new OpenStreetMapProvider({
      params: {
        countrycodes: 'in',
        limit: 5,
      },
    });
  }, []);

  // Debounced search trigger (600ms)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError('');
      setHasSearched(false);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      if (!providerRef.current) return;
      setLoading(true);
      setError('');
      setHasSearched(true);

      try {
        const searchResults = await providerRef.current.search({ query: query.trim() });
        const mapped: SearchResult[] = searchResults.map((item) => ({
          x: item.x,
          y: item.y,
          label: item.label,
        }));
        setResults(mapped);
        setIsOpen(true);
      } catch (err: any) {
        console.warn('Geosearch query failed:', err);
        setError('Search failed. Please check network connection.');
        setResults([]);
        setIsOpen(true);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    onSelectResult(item.y, item.x, item.label.split(',')[0]);
    setIsOpen(false);
    setQuery(item.label.split(',')[0]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setError('');
  };

  return (
    <div className="relative w-full z-[500] mb-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || error || (hasSearched && query)) {
              setIsOpen(true);
            }
          }}
          className="pl-9 pr-8 h-9 text-xs bg-background shadow-sm border-border"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border bg-popover/95 backdrop-blur text-popover-foreground shadow-lg overflow-hidden z-[600] animate-in fade-in duration-150 max-h-48 overflow-y-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Searching Nominatim places in India...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 p-3 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : results.length === 0 && hasSearched ? (
            <div className="p-3 text-center text-xs text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            results.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full px-3 py-2 text-left text-xs hover:bg-accent hover:text-accent-foreground transition-colors flex items-start gap-2 border-b last:border-b-0"
              >
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="line-clamp-2">{item.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
