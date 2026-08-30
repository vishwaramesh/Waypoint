'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin, Loader2, Navigation, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Errand, ErrandInput } from '@/types/errand';

// Dynamically import Leaflet Map to avoid SSR errors
const LocationPickerMap = dynamic(
  () => import('./LocationPickerMap').then((mod) => mod.LocationPickerMap),
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
  const [lat, setLat] = useState(37.7749);
  const [lng, setLng] = useState(-122.4194);
  const [radiusM, setRadiusM] = useState(100);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setNote(initialData.note || '');
      setLat(initialData.lat);
      setLng(initialData.lng);
      setRadiusM(initialData.radius_m || 100);
    } else {
      setTitle('');
      setNote('');
      // Default to San Francisco coordinates or navigator location
      setLat(37.7749);
      setLng(-122.4194);
      setRadiusM(100);
    }
    setError('');
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
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

    setLoading(true);
    setError('');

    try {
      await onSubmit({
        title: title.trim(),
        note: note.trim() || null,
        lat,
        lng,
        radius_m: Number(radiusM) || 100,
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
        {/* Modal Header */}
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title Input */}
          <div className="space-y-1.5">
            <Label htmlFor="errand-title">Errand Title *</Label>
            <Input
              id="errand-title"
              placeholder="e.g., Pick up dry cleaning"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              required
            />
          </div>

          {/* Note Input */}
          <div className="space-y-1.5">
            <Label htmlFor="errand-note">Note / Instructions</Label>
            <textarea
              id="errand-note"
              rows={2}
              placeholder="Add optional notes, order #, or item list..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Map Location Picker */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Target Location (Click Map to Set)
              </Label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Navigation className="h-3 w-3" />
                Use My Location
              </button>
            </div>

            <LocationPickerMap
              lat={lat}
              lng={lng}
              radius_m={radiusM}
              onChangeLocation={(newLat, newLng) => {
                setLat(newLat);
                setLng(newLng);
              }}
            />
          </div>

          {/* Radius Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="errand-radius">Geofence Radius (meters)</Label>
              <span className="text-xs font-semibold text-primary">{radiusM} meters</span>
            </div>
            <input
              id="errand-radius"
              type="range"
              min={25}
              max={1000}
              step={25}
              value={radiusM}
              onChange={(e) => setRadiusM(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Submit Button */}
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
