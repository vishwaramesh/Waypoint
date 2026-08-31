'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin, Loader2, Navigation, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Errand, ErrandInput, ErrandLocation } from '@/types/errand';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

const MultiLocationPickerMap = dynamic(
  () => import('./MultiLocationPickerMap').then((mod) => mod.MultiLocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-60 w-full items-center justify-center rounded-xl bg-slate-100 border text-xs text-muted-foreground">
        Loading OpenStreetMap...
      </div>
    ),
  }
);

interface ErrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ErrandInput) => Promise<void>;
  initialData?: Errand | null;
}

export function ErrandModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}: ErrandModalProps) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [locations, setLocations] = useState<ErrandLocation[]>([
    {
      label: '',
      lat: DEFAULT_MAP_CENTER.lat,
      lng: DEFAULT_MAP_CENTER.lng,
      radius_m: 100,
    },
  ]);
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setNote(initialData.note || '');
      if (initialData.locations && initialData.locations.length > 0) {
        setLocations(
          initialData.locations.map((loc) => ({
            id: loc.id,
            label: loc.label || '',
            lat: loc.lat,
            lng: loc.lng,
            radius_m: loc.radius_m || 100,
          }))
        );
      } else {
        setLocations([
          {
            label: '',
            lat: initialData.lat ?? DEFAULT_MAP_CENTER.lat,
            lng: initialData.lng ?? DEFAULT_MAP_CENTER.lng,
            radius_m: initialData.radius_m ?? 100,
          },
        ]);
      }
      setActiveLocationIndex(0);
    } else {
      setTitle('');
      setNote('');
      setLocations([
        {
          label: '',
          lat: DEFAULT_MAP_CENTER.lat,
          lng: DEFAULT_MAP_CENTER.lng,
          radius_m: 100,
        },
      ]);
      setActiveLocationIndex(0);
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAddLocation = () => {
    // Offset slightly from active location for clear pin placement
    const active = locations[activeLocationIndex] || locations[0];
    const offset = (locations.length + 1) * 0.002;
    const newLoc: ErrandLocation = {
      label: '',
      lat: active ? active.lat + offset : DEFAULT_MAP_CENTER.lat + offset,
      lng: active ? active.lng + offset : DEFAULT_MAP_CENTER.lng + offset,
      radius_m: 100,
    };
    setLocations((prev) => [...prev, newLoc]);
    setActiveLocationIndex(locations.length);
  };

  const handleRemoveLocation = (indexToRemove: number) => {
    if (locations.length <= 1) {
      setError('An errand must have at least one target location.');
      return;
    }
    setError('');
    const updated = locations.filter((_, idx) => idx !== indexToRemove);
    setLocations(updated);
    if (activeLocationIndex >= updated.length) {
      setActiveLocationIndex(updated.length - 1);
    }
  };

  const handleUpdateLocationCoords = (index: number, lat: number, lng: number) => {
    setLocations((prev) =>
      prev.map((loc, idx) => (idx === index ? { ...loc, lat, lng } : loc))
    );
  };

  const handleUpdateLocationField = (
    index: number,
    field: 'label' | 'radius_m',
    value: any
  ) => {
    setLocations((prev) =>
      prev.map((loc, idx) => (idx === index ? { ...loc, [field]: value } : loc))
    );
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleUpdateLocationCoords(
            activeLocationIndex,
            pos.coords.latitude,
            pos.coords.longitude
          );
        },
        (err) => {
          console.warn('Could not get current location:', err.message);
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter an errand title.');
      return;
    }

    if (locations.length === 0) {
      setError('An errand requires at least one location target.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit({
        title: title.trim(),
        note: note.trim() || null,
        locations: locations.map((loc) => ({
          id: loc.id,
          label: loc.label ? loc.label.trim() : null,
          lat: loc.lat,
          lng: loc.lng,
          radius_m: Number(loc.radius_m) || 100,
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save errand.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-background border shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {initialData ? 'Edit Errand' : 'Add New Errand'}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Errand Title */}
          <div className="space-y-1.5">
            <Label htmlFor="errand-title">Errand Title *</Label>
            <Input
              id="errand-title"
              placeholder="e.g., Pick up medicine"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              required
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label htmlFor="errand-note">Note / Instructions</Label>
            <textarea
              id="errand-note"
              rows={2}
              placeholder="Add optional details or order list..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Map Location Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Target Locations ({locations.length})
              </Label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Navigation className="h-3 w-3" />
                Set Pin #{activeLocationIndex + 1} to My GPS
              </button>
            </div>

            <MultiLocationPickerMap
              locations={locations}
              activeLocationIndex={activeLocationIndex}
              onSelectLocationIndex={(idx) => setActiveLocationIndex(idx)}
              onUpdateLocationCoords={handleUpdateLocationCoords}
            />

            {/* Add Location Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLocation}
              className="w-full h-8 gap-1.5 border-dashed text-xs font-semibold text-primary hover:bg-primary/5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Another Location Pin</span>
            </Button>
          </div>

          {/* Location Details List */}
          <div className="space-y-2.5 pt-1">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Configured Pins ({locations.length})
            </Label>

            {locations.map((loc, idx) => {
              const isActive = idx === activeLocationIndex;
              return (
                <div
                  key={idx}
                  onClick={() => setActiveLocationIndex(idx)}
                  className={`rounded-xl border p-3 space-y-2 transition-all cursor-pointer ${
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        Location Pin #{idx + 1}
                      </span>
                    </div>

                    {locations.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveLocation(idx);
                        }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-full"
                        title="Remove location"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Optional Label Input */}
                  <div className="space-y-1">
                    <Input
                      placeholder='Optional Label (e.g. "Apollo Pharmacy")'
                      value={loc.label || ''}
                      onChange={(e) => handleUpdateLocationField(idx, 'label', e.target.value)}
                      className="h-8 text-xs bg-background"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  {/* Radius Slider */}
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Geofence Radius</span>
                      <span className="font-semibold text-primary">{loc.radius_m}m</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={1000}
                      step={25}
                      value={loc.radius_m}
                      onChange={(e) => handleUpdateLocationField(idx, 'radius_m', Number(e.target.value))}
                      className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-10 font-semibold"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-10 font-semibold" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : initialData ? (
                'Update Errand'
              ) : (
                'Create Errand'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
