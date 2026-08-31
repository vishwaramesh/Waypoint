'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { X, MapPin, Loader2, Plus, ArrowUp, ArrowDown, Trash2, AlertCircle, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuestInput, QuestStop } from '@/types/quest';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

const LocationPickerMap = dynamic(
  () => import('@/components/errands/LocationPickerMap').then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-52 w-full items-center justify-center rounded-xl bg-slate-100 border text-xs text-muted-foreground">
        Loading OpenStreetMap...
      </div>
    ),
  }
);

interface QuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: QuestInput) => Promise<void>;
}

export function QuestModal({ isOpen, onClose, onSubmit }: QuestModalProps) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [stops, setStops] = useState<Omit<QuestStop, 'id' | 'quest_id' | 'is_done' | 'created_at'>[]>([
    {
      order_index: 0,
      title: 'Stop 1 Checkpoint',
      note: '',
      lat: DEFAULT_MAP_CENTER.lat,
      lng: DEFAULT_MAP_CENTER.lng,
      radius_m: 100,
    },
    {
      order_index: 1,
      title: 'Stop 2 Checkpoint',
      note: '',
      lat: DEFAULT_MAP_CENTER.lat + 0.002,
      lng: DEFAULT_MAP_CENTER.lng + 0.002,
      radius_m: 100,
    },
  ]);

  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddStop = () => {
    const lastStop = stops[stops.length - 1];
    const offset = (stops.length + 1) * 0.002;
    const newStop = {
      order_index: stops.length,
      title: `Stop ${stops.length + 1} Checkpoint`,
      note: '',
      lat: lastStop ? lastStop.lat + offset : DEFAULT_MAP_CENTER.lat + offset,
      lng: lastStop ? lastStop.lng + offset : DEFAULT_MAP_CENTER.lng + offset,
      radius_m: 100,
    };
    setStops((prev) => [...prev, newStop]);
    setActiveStopIndex(stops.length);
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
      setActiveStopIndex(updated.length - 1);
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
    setActiveStopIndex(targetIdx);
  };

  const handleUpdateStop = (idx: number, field: string, value: any) => {
    setStops((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
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
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit({
        title: title.trim(),
        note: note.trim() || null,
        stops: stops.map((s, idx) => ({
          order_index: idx,
          title: s.title.trim(),
          note: s.note ? s.note.trim() : null,
          lat: s.lat,
          lng: s.lng,
          radius_m: Number(s.radius_m) || 100,
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create Quest.');
    } finally {
      setLoading(false);
    }
  };

  const activeStop = stops[activeStopIndex] || stops[0];

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

          {/* Active Stop Map Picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Pick Location for Stop #{activeStopIndex + 1}
              </Label>
              <span className="text-xs text-muted-foreground font-semibold">
                {activeStop.lat.toFixed(4)}, {activeStop.lng.toFixed(4)}
              </span>
            </div>

            {activeStop && (
              <LocationPickerMap
                lat={activeStop.lat}
                lng={activeStop.lng}
                radius_m={activeStop.radius_m}
                onChangeLocation={(newLat, newLng) => {
                  handleUpdateStop(activeStopIndex, 'lat', newLat);
                  handleUpdateStop(activeStopIndex, 'lng', newLng);
                }}
              />
            )}
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
                  onClick={() => setActiveStopIndex(idx)}
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

                  {/* Radius Slider */}
                  <div className="space-y-1" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Radius</span>
                      <span className="font-semibold text-primary">{stop.radius_m}m</span>
                    </div>
                    <input
                      type="range"
                      min={25}
                      max={1000}
                      step={25}
                      value={stop.radius_m}
                      onChange={(e) => handleUpdateStop(idx, 'radius_m', Number(e.target.value))}
                      className="w-full h-1.5 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
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
