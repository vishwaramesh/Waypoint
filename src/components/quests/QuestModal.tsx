'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin, Loader2, Plus, ArrowUp, ArrowDown, Trash2, AlertCircle, Compass, Navigation, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuestInput } from '@/types/quest';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

const MultiLocationPickerMap = dynamic(
  () => import('@/components/errands/MultiLocationPickerMap').then((mod) => mod.MultiLocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-52 w-full items-center justify-center rounded-xl bg-slate-100 border text-xs text-muted-foreground">
        Loading OpenStreetMap...
      </div>
    ),
  }
);

interface StopLocationDraft {
  label?: string | null;
  lat: number;
  lng: number;
  radius_m: number;
}

interface StopDraft {
  order_index: number;
  title: string;
  note?: string | null;
  locations: StopLocationDraft[];
}

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuestInput) => Promise<void>;
}

export function QuestModal({ isOpen, onClose, onSubmit }: QuestModalProps) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [stops, setStops] = useState<StopDraft[]>([
    {
      order_index: 0,
      title: 'Stop 1 Checkpoint',
      note: '',
      locations: [{ label: '', lat: DEFAULT_MAP_CENTER.lat, lng: DEFAULT_MAP_CENTER.lng, radius_m: 100 }],
    },
    {
      order_index: 1,
      title: 'Stop 2 Checkpoint',
      note: '',
      locations: [
        { label: '', lat: DEFAULT_MAP_CENTER.lat + 0.002, lng: DEFAULT_MAP_CENTER.lng + 0.002, radius_m: 100 },
      ],
    },
  ]);

  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const selectStop = (idx: number) => {
    setActiveStopIndex(idx);
    setActiveLocationIndex(0);
  };

  const handleAddStop = () => {
    const lastStop = stops[stops.length - 1];
    const lastLoc = lastStop?.locations[0];
    const offset = (stops.length + 1) * 0.002;
    const newStop: StopDraft = {
      order_index: stops.length,
      title: `Stop ${stops.length + 1} Checkpoint`,
      note: '',
      locations: [
        {
          label: '',
          lat: lastLoc ? lastLoc.lat + offset : DEFAULT_MAP_CENTER.lat + offset,
          lng: lastLoc ? lastLoc.lng + offset : DEFAULT_MAP_CENTER.lng + offset,
          radius_m: 100,
        },
      ],
    };
    setStops((prev) => [...prev, newStop]);
    selectStop(stops.length);
  };

  const handleRemoveStop = (idx: number) => {
    if (stops.length <= 2) {
      setError('A Quest requires at least two sequential stops.');
      return;
    }
    setError('');
    const updated = stops.filter((_, index) => index !== idx).map((s, newIdx) => ({
      ...s,
      order_index: newIdx,
    }));
    setStops(updated);
    if (activeStopIndex >= updated.length) {
      selectStop(updated.length - 1);
    }
  };

  const handleMoveStop = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= stops.length) return;

    const updated = [...stops];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;

    const reindexed = updated.map((s, i) => ({ ...s, order_index: i }));
    setStops(reindexed);
    selectStop(targetIdx);
  };

  const handleUpdateStop = (idx: number, field: 'title' | 'note', value: any) => {
    setStops((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  // --- Location pins within the currently active stop ---

  const activeStop = stops[activeStopIndex] || stops[0];
  const activeStopLocations = activeStop?.locations || [];

  const handleAddLocationToActiveStop = () => {
    const active = activeStopLocations[activeLocationIndex] || activeStopLocations[0];
    const offset = (activeStopLocations.length + 1) * 0.0015;
    const newLoc: StopLocationDraft = {
      label: '',
      lat: active ? active.lat + offset : DEFAULT_MAP_CENTER.lat + offset,
      lng: active ? active.lng + offset : DEFAULT_MAP_CENTER.lng + offset,
      radius_m: 100,
    };
    setStops((prev) =>
      prev.map((s, i) => (i === activeStopIndex ? { ...s, locations: [...s.locations, newLoc] } : s))
    );
    setActiveLocationIndex(activeStopLocations.length);
  };

  const handleRemoveLocationFromActiveStop = (locIdx: number) => {
    if (activeStopLocations.length <= 1) {
      setError('Each stop needs at least one target location.');
      return;
    }
    setError('');
    setStops((prev) =>
      prev.map((s, i) => {
        if (i !== activeStopIndex) return s;
        const updatedLocs = s.locations.filter((_, idx) => idx !== locIdx);
        return { ...s, locations: updatedLocs };
      })
    );
    if (activeLocationIndex >= activeStopLocations.length - 1) {
      setActiveLocationIndex(Math.max(0, activeStopLocations.length - 2));
    }
  };

  const handleUpdateActiveStopLocationCoords = (locIdx: number, lat: number, lng: number) => {
    setStops((prev) =>
      prev.map((s, i) => {
        if (i !== activeStopIndex) return s;
        return {
          ...s,
          locations: s.locations.map((loc, idx) => (idx === locIdx ? { ...loc, lat, lng } : loc)),
        };
      })
    );
  };

  const handleUpdateActiveStopLocationField = (locIdx: number, field: 'label' | 'radius_m', value: any) => {
    setStops((prev) =>
      prev.map((s, i) => {
        if (i !== activeStopIndex) return s;
        return {
          ...s,
          locations: s.locations.map((loc, idx) => (idx === locIdx ? { ...loc, [field]: value } : loc)),
        };
      })
    );
  };

  const handleUseCurrentLocationForActivePin = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleUpdateActiveStopLocationCoords(activeLocationIndex, pos.coords.latitude, pos.coords.longitude);
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
      setError('Please enter a Quest title.');
      return;
    }

    if (stops.length < 2) {
      setError('A Quest requires at least two stops.');
      return;
    }

    for (let i = 0; i < stops.length; i++) {
      if (!stops[i].title.trim()) {
        setError(`Please provide a title for Stop #${i + 1}.`);
        return;
      }
      if (!stops[i].locations || stops[i].locations.length === 0) {
        setError(`Stop #${i + 1} needs at least one target location.`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit({
        title: title.trim(),
        note: note.trim() || null,
        stops: stops.map((s, idx) => {
          const primary = s.locations[0];
          return {
            order_index: idx,
            title: s.title.trim(),
            note: s.note ? s.note.trim() : null,
            lat: primary.lat,
            lng: primary.lng,
            radius_m: Number(primary.radius_m) || 100,
            locations: s.locations.map((loc) => ({
              label: loc.label ? loc.label.trim() : null,
              lat: loc.lat,
              lng: loc.lng,
              radius_m: Number(loc.radius_m) || 100,
            })),
          };
        }),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create Quest.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-background border shadow-xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-gradient-to-r from-primary/10 via-background to-accent">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Compass className="h-5 w-5 text-primary" />
            Create New Quest
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Quest Title */}
          <div className="space-y-1.5">
            <Label htmlFor="quest-title">Quest Title *</Label>
            <Input
              id="quest-title"
              placeholder="e.g., Shela Campus Trail"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              required
            />
          </div>

          {/* Quest Note */}
          <div className="space-y-1.5">
            <Label htmlFor="quest-note">Description / Rules</Label>
            <textarea
              id="quest-note"
              rows={2}
              placeholder="Add optional notes or backstory..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Active Stop's Location Pins */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Stop #{activeStopIndex + 1} Locations ({activeStopLocations.length})
              </Label>
              <button
                type="button"
                onClick={handleUseCurrentLocationForActivePin}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Navigation className="h-3 w-3" />
                Set Pin #{activeLocationIndex + 1} to My GPS
              </button>
            </div>

            <MultiLocationPickerMap
              locations={activeStopLocations}
              activeLocationIndex={activeLocationIndex}
              onSelectLocationIndex={(idx) => setActiveLocationIndex(idx)}
              onUpdateLocationCoords={handleUpdateActiveStopLocationCoords}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLocationToActiveStop}
              className="w-full h-8 gap-1.5 border-dashed text-xs font-semibold text-primary hover:bg-primary/5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Another Location to Stop #{activeStopIndex + 1}</span>
            </Button>

            {/* Pins within the active stop - reaching ANY one completes this stop */}
            <div className="space-y-2 pt-1">
              {activeStopLocations.map((loc, locIdx) => {
                const isActivePin = locIdx === activeLocationIndex;
                return (
                  <div
                    key={locIdx}
                    onClick={() => setActiveLocationIndex(locIdx)}
                    className={`rounded-lg border p-2.5 space-y-1.5 transition-all cursor-pointer ${
                      isActivePin
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border bg-card hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                            isActivePin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {locIdx + 1}
                        </span>
                        <Input
                          placeholder={`Optional Label (e.g. "Print Shop A")`}
                          value={loc.label || ''}
                          onChange={(e) => handleUpdateActiveStopLocationField(locIdx, 'label', e.target.value)}
                          className="h-7 text-xs bg-background"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                      {activeStopLocations.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveLocationFromActiveStop(locIdx);
                          }}
                          className="text-muted-foreground hover:text-destructive p-1 rounded-full shrink-0"
                          title="Remove this location"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium">Radius</span>
                        <span className="font-semibold text-primary">{loc.radius_m}m</span>
                      </div>
                      <input
                        type="range"
                        min={25}
                        max={1000}
                        step={25}
                        value={loc.radius_m}
                        onChange={(e) => handleUpdateActiveStopLocationField(locIdx, 'radius_m', Number(e.target.value))}
                        className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stops List */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sequential Checkpoints ({stops.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStop}
                className="h-7 gap-1 text-xs font-semibold text-primary border-primary/20"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Stop</span>
              </Button>
            </div>

            {stops.map((stop, idx) => {
              const isActive = idx === activeStopIndex;
              return (
                <div
                  key={idx}
                  onClick={() => selectStop(idx)}
                  className={`rounded-xl border p-3 space-y-2.5 transition-all cursor-pointer ${
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        Checkpoint #{idx + 1}
                      </span>
                      {stop.locations.length > 1 && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-1.5 py-0.5">
                          <Layers className="h-2.5 w-2.5" />
                          {stop.locations.length} pins
                        </span>
                      )}
                    </div>

                    {/* Order Controls & Delete */}
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleMoveStop(idx, 'up')}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1"
                        title="Move Up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveStop(idx, 'down')}
                        disabled={idx === stops.length - 1}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-1"
                        title="Move Down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      {stops.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStop(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                          title="Remove Stop"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stop Title */}
                  <Input
                    placeholder={`Stop #${idx + 1} Title`}
                    value={stop.title}
                    onChange={(e) => handleUpdateStop(idx, 'title', e.target.value)}
                    className="h-8 text-xs bg-background"
                    onClick={(e) => e.stopPropagation()}
                    required
                  />

                  {/* Stop Note */}
                  <Input
                    placeholder="Optional note / hint..."
                    value={stop.note || ''}
                    onChange={(e) => handleUpdateStop(idx, 'note', e.target.value)}
                    className="h-8 text-xs bg-background"
                    onClick={(e) => e.stopPropagation()}
                  />

                  {!isActive && (
                    <p className="text-[10px] text-muted-foreground italic">
                      Tap this card to edit its location pin{stop.locations.length > 1 ? 's' : ''} above.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer Submit - sticky so it stays reachable above the bottom tab bar on mobile */}
          <div className="sticky bottom-0 left-0 right-0 -mx-4 -mb-4 mt-2 flex gap-2 border-t bg-background px-4 py-3">
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
                  Creating...
                </>
              ) : (
                'Create Quest'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
