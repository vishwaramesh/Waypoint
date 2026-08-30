'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  Navigation, 
  MapPin, 
  Car, 
  CheckCircle2, 
  Sparkles,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/components/auth/AuthProvider';
import { Errand } from '@/types/errand';
import { fetchUserErrands, toggleErrandDone } from '@/lib/services/errandsService';
import { 
  haversineDistanceMeters, 
  requestNotificationPermission, 
  triggerBrowserNotification 
} from '@/lib/utils/geofence';
import { GeofenceAlertToast } from '@/components/map/GeofenceAlertToast';
import { showToast } from '@/lib/utils/toast';

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
  const [loading, setLoading] = useState(true);
  const [selectedErrand, setSelectedErrand] = useState<Errand | null>(null);

  // User position states
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [simulatedLocation, setSimulatedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const isDevEnvironment = process.env.NODE_ENV === 'development' || true;

  // Active geofence alert toast state
  const [triggeredAlert, setTriggeredAlert] = useState<{ errand: Errand; distance: number } | null>(null);

  // Session Alert & Snooze State Maps
  const alertedSessionIds = useRef<Set<string>>(new Set());
  const snoozeTimestamps = useRef<Map<string, number>>(new Map());

  const currentPosition = isSimulating && simulatedLocation ? simulatedLocation : liveLocation;

  // Load Active Errands
  const loadErrands = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserErrands(user.id);
      const active = data.filter((e) => !e.is_done);
      setActiveErrands(active);
      if (active.length > 0 && !selectedErrand) {
        setSelectedErrand(active[0]);
      }
    } catch (err) {
      console.error('Failed to load active errands:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedErrand]);

  useEffect(() => {
    requestNotificationPermission();

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setLiveLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setLiveLocation((prev) => prev || { lat: 37.7749, lng: -122.4194 });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, []);

  useEffect(() => {
    loadErrands();
  }, [loadErrands]);

  // Geofence Evaluation Engine
  useEffect(() => {
    if (!currentPosition || activeErrands.length === 0) return;

    for (const errand of activeErrands) {
      const distMeters = haversineDistanceMeters(
        currentPosition.lat,
        currentPosition.lng,
        errand.lat,
        errand.lng
      );

      const radius = errand.radius_m || 100;
      const isInside = distMeters <= radius;

      const snoozeUntil = snoozeTimestamps.current.get(errand.id);
      const isSnoozed = Boolean(snoozeUntil && Date.now() < snoozeUntil);

      if (isInside && !isSnoozed && !alertedSessionIds.current.has(errand.id)) {
        alertedSessionIds.current.add(errand.id);
        setTriggeredAlert({ errand, distance: distMeters });
        triggerBrowserNotification(errand.title, errand.note);
        break;
      }
    }
  }, [currentPosition, activeErrands]);

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
                    {activeErrands.length} active geofenced stop{activeErrands.length !== 1 ? 's' : ''}
                  </p>
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
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px]">
                      Active Target
                    </Badge>
                    <span className="text-xs text-muted-foreground font-semibold">
                      Radius: {selectedErrand.radius_m || 100}m
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground mt-1 truncate">{selectedErrand.title}</h3>
                  {selectedErrand.note && (
                    <p className="text-xs text-muted-foreground line-clamp-2 break-words">{selectedErrand.note}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1 truncate">
                    <MapPin className="h-3 w-3 text-primary shrink-0" />
                    {selectedErrand.lat.toFixed(4)}, {selectedErrand.lng.toFixed(4)}
                    {currentPosition && (
                      <span className="font-semibold text-foreground ml-1">
                        • {Math.round(haversineDistanceMeters(currentPosition.lat, currentPosition.lng, selectedErrand.lat, selectedErrand.lng))}m away
                      </span>
                    )}
                  </p>
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
