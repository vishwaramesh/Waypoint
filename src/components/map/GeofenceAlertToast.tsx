'use client';

import React from 'react';
import { MapPin, CheckCircle2, Clock, X, Bell, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Errand, ErrandLocation } from '@/types/errand';

interface GeofenceAlertToastProps {
  errand: Errand;
  matchedLocation: ErrandLocation;
  distanceMeters: number;
  onMarkDone: (errandId: string) => void;
  onSnooze: (errandId: string) => void;
  onDismiss: () => void;
}

export function GeofenceAlertToast({
  errand,
  matchedLocation,
  distanceMeters,
  onMarkDone,
  onSnooze,
  onDismiss,
}: GeofenceAlertToastProps) {
  const locationName = matchedLocation.label || errand.title;
  const bannerMessage = matchedLocation.label
    ? `You're near ${matchedLocation.label} — ${errand.title}`
    : `You're near target location for ${errand.title}`;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 px-4 flex justify-center animate-in slide-in-from-top duration-300 pointer-events-none">
      <Card className="w-full max-w-md border-amber-500/40 bg-background/95 backdrop-blur shadow-2xl pointer-events-auto border-2">
        <CardContent className="p-4 space-y-3">
          {/* Banner Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 animate-pulse">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  Geofence Target Reached!
                </span>
                <span className="text-[11px] text-muted-foreground font-medium">
                  Inside {matchedLocation.radius_m}m radius ({Math.round(distanceMeters)}m away)
                </span>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Errand & Location Details */}
          <div>
            <h3 className="text-sm font-bold text-foreground leading-snug flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              {bannerMessage}
            </h3>
            {errand.note && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 pl-5">
                {errand.note}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-1.5 pt-1">
            <Button
              size="sm"
              onClick={() => onMarkDone(errand.id)}
              className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Mark done</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSnooze(errand.id)}
                className="flex-1 h-9 font-semibold text-xs gap-1.5 border-slate-300 dark:border-slate-700"
              >
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Snooze 15 min</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="flex-1 h-9 font-semibold text-xs gap-1.5 border-slate-300 dark:border-slate-700 text-muted-foreground"
              >
                <EyeOff className="h-4 w-4" />
                <span>Ignore</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
