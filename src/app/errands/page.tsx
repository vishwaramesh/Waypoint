'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  CheckSquare, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Pencil, 
  Trash2, 
  Search, 
  AlertCircle,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/components/auth/AuthProvider';
import { Errand, ErrandInput } from '@/types/errand';
import { 
  fetchUserErrands, 
  createErrand, 
  updateErrand, 
  toggleErrandDone, 
  deleteErrand 
} from '@/lib/services/errandsService';
import { ErrandModal } from '@/components/errands/ErrandModal';
import { showToast } from '@/lib/utils/toast';
import { DEFAULT_MAP_CENTER } from '@/lib/constants/map';

function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): string {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  if (d < 0.1) {
    return `${Math.round(d * 5280)} ft away`;
  }
  return `${d.toFixed(1)} mi away`;
}

export default function ErrandsPage() {
  const { user } = useAuth();

  const [errands, setErrands] = useState<Errand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingErrand, setEditingErrand] = useState<Errand | null>(null);

  const loadErrands = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchUserErrands(user.id);
      setErrands(data);
    } catch (err: any) {
      setError('Failed to load errands.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadErrands();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          setUserLocation(DEFAULT_MAP_CENTER);
        }
      );
    }
  }, [loadErrands]);

  const handleSaveErrand = async (input: ErrandInput) => {
    if (!user) return;

    if (editingErrand) {
      const updated = await updateErrand(editingErrand.id, input);
      setErrands((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      showToast('Errand Updated', `"${updated.title}" was updated.`, 'info');
    } else {
      const created = await createErrand(user.id, input);
      setErrands((prev) => [created, ...prev]);
      showToast('Errand Added', `"${created.title}" added to your route.`, 'success');
    }
  };

  const handleToggleDone = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await toggleErrandDone(id, !currentStatus);
      setErrands((prev) => prev.map((item) => (item.id === id ? updated : item)));

      if (updated.is_done) {
        showToast('Errand Completed! 🎉', `"${updated.title}" marked as done.`, 'success');
      } else {
        showToast('Errand Restored', `"${updated.title}" moved to Active.`, 'info');
      }
    } catch (err) {
      showToast('Action Failed', 'Could not update errand status.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const errandToDelete = errands.find((e) => e.id === id);
    if (!confirm('Are you sure you want to delete this errand?')) return;

    try {
      await deleteErrand(id);
      setErrands((prev) => prev.filter((item) => item.id !== id));
      showToast('Errand Deleted', errandToDelete ? `"${errandToDelete.title}" removed.` : '', 'info');
    } catch (err) {
      showToast('Delete Failed', 'Could not delete errand.', 'error');
    }
  };

  const filteredErrands = errands.filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.note && item.note.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const activeErrands = filteredErrands.filter((e) => !e.is_done);
  const doneErrands = filteredErrands.filter((e) => e.is_done);

  return (
    <AuthGuard>
      <div className="space-y-4 pb-4 max-w-full overflow-x-hidden">
        {/* Top Header Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-background to-accent border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-background/80 text-[11px] font-medium">
                Route Overview
              </Badge>
              <span className="text-xs text-muted-foreground font-semibold">
                {doneErrands.length}/{errands.length} Done
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">My Errands</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Multi-location task target tracking
                </CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingErrand(null);
                  setIsModalOpen(true);
                }}
                className="h-9 gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-sm shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Add Errand</span>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search Bar */}
        {errands.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search errands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm"
            />
          </div>
        )}

        {/* Skeletons during fetch */}
        {loading ? (
          <div className="space-y-3 pt-1">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* SECTION 1: Active Errands */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-blue-500" />
                  Active ({activeErrands.length})
                </h3>
              </div>

              {activeErrands.length === 0 ? (
                errands.length === 0 ? (
                  <EmptyState
                    type="no-errands"
                    onAddClick={() => {
                      setEditingErrand(null);
                      setIsModalOpen(true);
                    }}
                  />
                ) : (
                  <EmptyState type="all-done" />
                )
              ) : (
                activeErrands.map((errand) => {
                  const locs = errand.locations || [];
                  const primaryLoc = locs[0];

                  const distanceStr = primaryLoc && userLocation
                    ? calculateDistanceMiles(userLocation.lat, userLocation.lng, primaryLoc.lat, primaryLoc.lng)
                    : null;

                  return (
                    <Card
                      key={errand.id}
                      className="transition-all duration-300 hover:shadow-md border-border animate-in fade-in"
                    >
                      <CardContent className="p-3.5">
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <button
                            onClick={() => handleToggleDone(errand.id, errand.is_done)}
                            className="mt-0.5 text-muted-foreground hover:text-emerald-500 transition-colors focus:outline-none shrink-0"
                            title="Mark as completed"
                          >
                            <Circle className="h-5 w-5 hover:scale-110 transition-transform" />
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <h4 className="text-sm font-semibold text-foreground leading-tight truncate">
                                  {errand.title}
                                </h4>
                                {locs.length > 1 && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 bg-primary/10 text-primary font-bold border-primary/20">
                                    <Layers className="h-3 w-3" />
                                    {locs.length} locations
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setEditingErrand(errand);
                                    setIsModalOpen(true);
                                  }}
                                  className="h-7 w-7 text-muted-foreground hover:text-primary"
                                  title="Edit errand"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(errand.id)}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  title="Delete errand"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {errand.note && (
                              <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                                {errand.note}
                              </p>
                            )}

                            {/* Location Labels & Distance Badges */}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground pt-1">
                              {locs.map((loc, idx) => (
                                <span key={idx} className="flex items-center gap-1 font-medium text-foreground bg-muted/60 px-2 py-0.5 rounded-md border text-[10px]">
                                  <MapPin className="h-3 w-3 text-primary shrink-0" />
                                  {loc.label || `Pin #${idx + 1}`} ({loc.radius_m}m)
                                </span>
                              ))}
                              {distanceStr && (
                                <span className="text-[10px] text-muted-foreground font-semibold">
                                  • Nearest ~{distanceStr}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* SECTION 2: Done Errands */}
            {doneErrands.length > 0 && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                    Completed ({doneErrands.length})
                  </h3>
                </div>

                {doneErrands.map((errand) => (
                  <Card
                    key={errand.id}
                    className="opacity-70 bg-muted/20 border-border transition-all duration-300"
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleDone(errand.id, errand.is_done)}
                          className="mt-0.5 text-emerald-500 hover:text-muted-foreground transition-colors focus:outline-none shrink-0"
                          title="Mark as active"
                        >
                          <CheckCircle2 className="h-5 w-5 fill-emerald-500/20" />
                        </button>

                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-start justify-between gap-1.5">
                            <h4 className="text-sm font-semibold line-through text-muted-foreground leading-tight truncate">
                              {errand.title}
                            </h4>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(errand.id)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                              title="Delete errand"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {errand.note && (
                            <p className="text-xs text-muted-foreground/80 line-clamp-1 line-through break-words">
                              {errand.note}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <ErrandModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingErrand(null);
          }}
          onSubmit={handleSaveErrand}
          initialData={editingErrand}
        />
      </div>
    </AuthGuard>
  );
}
