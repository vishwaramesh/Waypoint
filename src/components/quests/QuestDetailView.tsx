'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { X, CheckCircle2, Lock, MapPin, Navigation, Sparkles, Trophy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Quest, QuestStop } from '@/types/quest';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

const LocationPickerMap = dynamic(
  () => import('@/components/errands/LocationPickerMap').then((mod) => mod.LocationPickerMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-48 w-full items-center justify-center rounded-xl bg-slate-900 text-xs text-slate-400 border">
        Loading target map...
      </div>
    ),
  }
);

interface QuestDetailViewProps {
  quest: Quest;
  isOpen: boolean;
  onClose: () => void;
}

export function QuestDetailView({ quest, isOpen, onClose }: QuestDetailViewProps) {
  if (!isOpen) return null;

  const stops = quest.stops ? [...quest.stops].sort((a, b) => a.order_index - b.order_index) : [];
  const completedCount = stops.filter((s) => s.is_done).length;
  const currentStopIndex = stops.findIndex((s) => !s.is_done);
  const isFullyCompleted = completedCount === stops.length && stops.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-background border shadow-xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3 bg-gradient-to-r from-primary/10 via-background to-accent">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground truncate max-w-[240px]">
                {quest.title}
              </h2>
              <span className="text-xs text-muted-foreground font-semibold">
                {completedCount} of {stops.length} stops reached
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Quest Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {quest.note && (
            <p className="text-xs text-muted-foreground italic bg-muted/40 p-3 rounded-xl border">
              "{quest.note}"
            </p>
          )}

          {/* Celebratory Banner if Fully Completed */}
          {isFullyCompleted && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-center space-y-1 animate-in zoom-in-95">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white mb-1 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                Quest Completed! 🎉
              </h3>
              <p className="text-xs text-muted-foreground">
                You reached all checkpoints in this quest chain. Amazing job!
              </p>
            </div>
          )}

          {/* Vertical Timeline */}
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
            {stops.map((stop, idx) => {
              const isCurrent = idx === currentStopIndex;
              const isDone = stop.is_done;
              const isLocked = !isDone && !isCurrent;

              return (
                <div key={stop.id || idx} className="relative">
                  {/* Timeline Dot Icon */}
                  <div className="absolute -left-6 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 z-10">
                    {isDone && <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/20" />}
                    {isCurrent && <span className="h-3 w-3 rounded-full bg-primary animate-ping" />}
                    {isLocked && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>

                  {/* Stop Card */}
                  <Card
                    className={`transition-all ${
                      isCurrent
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-md'
                        : isDone
                        ? 'border-emerald-500/30 bg-emerald-500/5 opacity-85'
                        : 'border-dashed bg-muted/30 opacity-60'
                    }`}
                  >
                    <CardContent className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Stop #{idx + 1}
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-[10px] bg-primary">
                              Current Target
                            </Badge>
                          )}
                          {isDone && (
                            <Badge variant="completed" className="text-[10px]">
                              Completed
                            </Badge>
                          )}
                          {isLocked && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                              <Lock className="h-2.5 w-2.5" /> Locked
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Content rendering based on state */}
                      {isLocked ? (
                        <div className="py-2 text-center space-y-1">
                          <Lock className="h-5 w-5 text-muted-foreground mx-auto" />
                          <p className="text-xs font-semibold text-muted-foreground">
                            Locked Checkpoint
                          </p>
                          <p className="text-[11px] text-muted-foreground/80">
                            Reach Stop #{idx} to reveal this location!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <h4 className="text-sm font-bold text-foreground">
                            {stop.title}
                          </h4>
                          {stop.note && (
                            <p className="text-xs text-muted-foreground">{stop.note}</p>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-primary">
                              <MapPin className="h-3 w-3" />
                              {stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}
                            </span>
                            <span>• Radius: {stop.radius_m}m</span>
                          </div>

                          {/* Map view for CURRENT stop */}
                          {isCurrent && (
                            <div className="pt-2">
                              <LocationPickerMap
                                lat={stop.lat}
                                lng={stop.lng}
                                radius_m={stop.radius_m}
                                onChangeLocation={() => {}}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-3 bg-background">
          <Button onClick={onClose} variant="outline" className="w-full font-semibold">
            Close Timeline
          </Button>
        </div>
      </div>
    </div>
  );
}
