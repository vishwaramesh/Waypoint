'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  Navigation, 
  MapPin, 
  Car, 
  CheckCircle2, 
  Sparkles,
  Layers,
  Compass,
  Trophy
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/components/auth/AuthProvider';
import { Errand, ErrandLocation } from '@/types/errand';
import { Quest, QuestStop } from '@/types/quest';
import { fetchUserErrands, toggleErrandDone } from '@/lib/services/errandsService';
import { fetchUserQuests, markQuestStopDone } from '@/lib/services/questsService';
import { 
  haversineDistanceMeters, 
  requestNotificationPermission, 
  triggerBrowserNotification 
} from '@/lib/utils/geofence';
import { GeofenceAlertToast } from '@/components/map/GeofenceAlertToast';
import { showToast } from '@/lib/utils/toast';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

const LiveGeofenceMap = dynamic(
  () => import('@/components/map/LiveGeofenceMap').then((mod) => mod.LiveGeofenceMap),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[360px] sm:h-[420px] w-full rounded-2xl" />
    ),
  }
);

export default function MapPage() {
  const { user } = useAuth();

  const [activeErrands, setActiveErrands] = useState<Errand[]>([]);
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);

  // Position states
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [simulatedLocation, setSimulatedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'searching' | 'locked' | 'error'>('searching');
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [, forceClockTick] = useState(0);

  const isDevEnvironment = process.env.NODE_ENV === 'development' || true;

  // Active geofence alert toast state
  const [triggeredAlert, setTriggeredAlert] = useState<{
    errand: Errand;
    matchedLocation: ErrandLocation;
    distance: number;
  } | null>(null);

  // Session Alert & Snooze State Maps
  const alertedSessionIds = useRef<Set<string>>(new Set());
  const alertedQuestStopIds = useRef<Set<string>>(new Set());
  const snoozeTimestamps = useRef<Map<string, number>>(new Map());

  const currentPosition = isSimulating && simulatedLocation ? simulatedLocation : liveLocation;

  // Load Active Errands and Active Quests
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [errandsData, questsData] = await Promise.all([
        fetchUserErrands(user.id),
        fetchUserQuests(user.id),
      ]);

      const activeE = errandsData.filter((e) => !e.is_done);
      setActiveErrands(activeE);
      if (activeE.length > 0 && !selectedErrand) {
        setSelectedErrand(activeE[0]);
      }

      // Filter quests that still have uncompleted stops
      const activeQ = questsData.filter((q) => {
        const stops = q.stops || [];
        return stops.some((s) => !s.is_done);
      });
      setActiveQuests(activeQ);
    } catch (err) {
      console.error('Failed to load map geofence data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedErrand]);

  useEffect(() => {
    requestNotificationPermission();

    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    const applyPosition = (pos: GeolocationPosition) => {
      setLiveLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
      setGpsStatus('locked');
      setLastUpdatedAt(Date.now());
    };

    const handleError = () => {
      // Keep whatever position we already have rather than snapping back to
      // the default — a transient GPS error shouldn't look like teleporting.
      setGpsStatus((prev) => (prev === 'locked' ? prev : 'error'));
      setLiveLocation((prev) => prev || DEFAULT_MAP_CENTER);
    };

    // Primary source: continuous updates as the browser reports new fixes.
    const watchId = navigator.geolocation.watchPosition(applyPosition, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 3000,
    });

    // Fallback: some phones/laptops deliver watchPosition callbacks very
    // infrequently (or stall) while stationary or indoors, so we also
    // actively re-request a fresh fix on a timer to keep tracking feeling
    // live rather than silently going stale.
    const pollId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(applyPosition, handleError, {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 3000,
      });
    }, 6000);

    return () => {
      navigator.geolocation.clearWatch(watchId);
      clearInterval(pollId);
    };
  }, []);

  // Ticks once a second purely so the "updated Xs ago" label below stays
  // live without needing its own extra location-fetching side effects.
  useEffect(() => {
    const tick = setInterval(() => forceClockTick((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  const secondsSinceUpdate = lastUpdatedAt ? Math.max(0, Math.floor((Date.now() - lastUpdatedAt) / 1000)) : null;

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Multi-Location & Quest Checkpoint Geofence Evaluation Engine
  useEffect(() => {
    if (!currentPosition) return;

    // 1. Evaluate Active Errands
    if (activeErrands.length > 0) {
      for (const errand of activeErrands) {
        const locs = errand.locations && errand.locations.length > 0
          ? errand.locations
          : [
              {
                lat: errand.lat ?? DEFAULT_MAP_CENTER.lat,
                lng: errand.lng ?? DEFAULT_MAP_CENTER.lng,
                radius_m: errand.radius_m ?? 100,
                label: null,
              },
            ];

        for (const loc of locs) {
          const distMeters = haversineDistanceMeters(
            currentPosition.lat,
            currentPosition.lng,
            loc.lat,
            loc.lng
          );

          const radius = loc.radius_m || 100;
          const isInside = distMeters <= radius;

          const snoozeUntil = snoozeTimestamps.current.get(errand.id);
          const isSnoozed = Boolean(snoozeUntil && Date.now() < snoozeUntil);

          if (isInside && !isSnoozed && !alertedSessionIds.current.has(errand.id)) {
            alertedSessionIds.current.add(errand.id);
            setTriggeredAlert({ errand, matchedLocation: loc, distance: distMeters });

            const notifTitle = loc.label ? `Near ${loc.label}` : errand.title;
            const notifBody = loc.label
              ? `You're near ${loc.label} — pick up ${errand.title}`
              : errand.note || `You're inside the target geofence for ${errand.title}`;

            triggerBrowserNotification(notifTitle, notifBody);
            break;
          }
        }
      }
    }

    // 2. Evaluate Active Quests (Current Stop ONLY)
    if (activeQuests.length > 0) {
      for (const quest of activeQuests) {
        const stops = quest.stops ? [...quest.stops].sort((a, b) => a.order_index - b.order_index) : [];
        const currentStop = stops.find((s) => !s.is_done);

        if (!currentStop || !currentStop.id) continue;

        const distMeters = haversineDistanceMeters(
          currentPosition.lat,
          currentPosition.lng,
          currentStop.lat,
          currentStop.lng
        );

        const radius = currentStop.radius_m || 100;
        const isInside = distMeters <= radius;

        if (isInside && !alertedQuestStopIds.current.has(currentStop.id)) {
          alertedQuestStopIds.current.add(currentStop.id);

          // Mark current stop done in Supabase immediately
          markQuestStopDone(currentStop.id, quest.id);

          // Check if there is a next stop
          const currentIndex = stops.findIndex((s) => s.id === currentStop.id);
          const hasNextStop = currentIndex >= 0 && currentIndex < stops.length - 1;

          if (hasNextStop) {
            showToast(
              'Quest Checkpoint Reached! 🧭',
              `Reached "${currentStop.title}" in ${quest.title}. Next stop unlocked — open the Quests tab!`,
              'success'
            );
            triggerBrowserNotification(
              `Quest Checkpoint: ${currentStop.title}`,
              `Next stop unlocked in ${quest.title}!`
            );
          } else {
            showToast(
              'Quest Completed! 🎉',
              `Final checkpoint reached in "${quest.title}"! All stops complete.`,
              'success'
            );
            triggerBrowserNotification(
              `Quest Complete! 🎉`,
              `You completed all checkpoints in ${quest.title}!`
            );
          }

          // Reload quest state
          loadData();
          break;
        }
      }
    }
  }, [currentPosition, activeErrands, activeQuests, loadData]);

  // Handle Toast Action: Mark Done
  const handleMarkDone = async (errandId: string) => {
    try {
      const updated = await toggleErrandDone(errandId, true);
      setActiveErrands((prev) => prev.filter((e) => e.id !== errandId));
      if (selectedErrand?.id === errandId) {
        setSelectedErrand(null);
      }
      setTriggeredAlert(null);
      showToast('Errand Completed! 🎉', `"${updated.title}" marked as done.`, 'success');
    } catch (err) {
      showToast('Action Failed', 'Could not update errand status.', 'error');
    }
  };

  // Handle Toast Action: Snooze 15 min
  const handleSnooze = (errandId: string) => {
    const snoozeDurationMs = 15 * 60 * 1000;
    snoozeTimestamps.current.set(errandId, Date.now() + snoozeDurationMs);
    setTriggeredAlert(null);
    showToast('Errand Snoozed ⏰', 'Geofence alert snoozed for 15 minutes.', 'info');
  };

  return (
    <AuthGuard>
      <div className="flex flex-col space-y-3 pb-4 relative max-w-full overflow-x-hidden">
        {/* Geofence Alert Banner Toast */}
        {triggeredAlert && (
          <GeofenceAlertToast
            errand={triggeredAlert.errand}
            matchedLocation={triggeredAlert.matchedLocation}
            distanceMeters={triggeredAlert.distance}
            onMarkDone={handleMarkDone}
            onSnooze={handleSnooze}
            onDismiss={() => setTriggeredAlert(null)}
          />
        )}

        {/* Top Header Card */}
        <Card className="border-primary/20 bg-background/90 backdrop-blur shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Car className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Live Geofence Monitor</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {activeErrands.length} errand{activeErrands.length !== 1 ? 's' : ''} • {activeQuests.length} quest trail{activeQuests.length !== 1 ? 's' : ''}
                  </p>
                  <span
                    className={`mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold ${
                      gpsStatus === 'locked'
                        ? 'text-emerald-600'
                        : gpsStatus === 'error'
                        ? 'text-destructive'
                        : 'text-amber-600'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        gpsStatus === 'locked'
                          ? 'bg-emerald-500 animate-pulse'
                          : gpsStatus === 'error'
                          ? 'bg-destructive'
                          : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    {gpsStatus === 'locked'
                      ? `Live${secondsSinceUpdate !== null ? ` · updated ${secondsSinceUpdate}s ago` : ''}`
                      : gpsStatus === 'error'
                      ? 'Location unavailable — check permissions'
                      : 'Searching for GPS signal…'}
                  </span>
                </div>
              </div>

              {isDevEnvironment && (
                <Button
                  size="sm"
                  variant={isSimulating ? 'destructive' : 'outline'}
                  onClick={() => setIsSimulating(!isSimulating)}
                  className="h-8 gap-1 rounded-full px-2.5 text-[11px] font-semibold border-amber-500/50 shrink-0"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>{isSimulating ? 'Stop Sim' : 'Simulate'}</span>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leaflet Live Geofence Map */}
        {loading ? (
          <Skeleton className="h-[360px] sm:h-[420px] w-full rounded-2xl" />
        ) : (
          <LiveGeofenceMap
            userLocation={currentPosition}
            errands={activeErrands}
            selectedErrandId={selectedErrand?.id}
            onSelectErrand={(errand) => setSelectedErrand(errand)}
            isSimulating={isSimulating}
            onSimulateClick={(lat, lng) => setSimulatedLocation({ lat, lng })}
          />
        )}

        {/* Selected / Current Errand Detail Card */}
        {selectedErrand ? (
          <Card className="border-primary/20 shadow-sm">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="default" className="text-[10px]">
                      Active Target
                    </Badge>
                    {selectedErrand.locations && selectedErrand.locations.length > 1 && (
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-primary/10 text-primary">
                        <Layers className="h-3 w-3" />
                        {selectedErrand.locations.length} target pins
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-1 truncate">{selectedErrand.title}</h3>
                  {selectedErrand.note && (
                    <p className="text-xs text-muted-foreground line-clamp-2 break-words">{selectedErrand.note}</p>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => handleMarkDone(selectedErrand.id)}
                  className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-full px-3 shrink-0"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Done</span>
                </Button>
              </div>

              {/* Target Location Pins List */}
              {selectedErrand.locations && selectedErrand.locations.length > 0 && (
                <div className="pt-2 border-t space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Target Locations
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedErrand.locations.map((loc, idx) => {
                      const dist = currentPosition
                        ? Math.round(haversineDistanceMeters(currentPosition.lat, currentPosition.lng, loc.lat, loc.lng))
                        : null;

                      return (
                        <div key={idx} className="rounded-md border bg-muted/40 px-2 py-1 text-[11px] flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          <span className="font-semibold text-foreground">
                            {loc.label || `Pin #${idx + 1}`}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            ({loc.radius_m}m) {dist !== null && `• ${dist}m away`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="p-4 text-center border-dashed">
            <p className="text-xs text-muted-foreground font-medium">
              {activeErrands.length === 0
                ? 'No active errands. Add an errand on the Errands page to track geofences.'
                : 'Click an errand marker on the map to view target details.'}
            </p>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
