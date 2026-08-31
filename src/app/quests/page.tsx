'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Compass, 
  Plus, 
  Trophy, 
  CheckCircle2, 
  Lock, 
  ChevronRight, 
  Trash2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/components/auth/AuthProvider';
import { Quest, QuestInput } from '@/types/quest';
import { fetchUserQuests, createQuest, deleteQuest } from '@/lib/services/questsService';
import { QuestModal } from '@/components/quests/QuestModal';
import { QuestDetailView } from '@/components/quests/QuestDetailView';
import { showToast } from '@/lib/utils/toast';

export default function QuestsPage() {
  const { user } = useAuth();

  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  const loadQuests = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchUserQuests(user.id);
      setQuests(data);
    } catch (err: any) {
      setError('Failed to load quests.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  const handleCreateQuest = async (input: QuestInput) => {
    if (!user) return;
    const created = await createQuest(user.id, input);
    setQuests((prev) => [created, ...prev]);
    showToast('Quest Created! 🧭', `"${created.title}" added with ${created.stops?.length || 0} stops.`, 'success');
  };

  const handleDeleteQuest = async (e: React.MouseEvent, questId: string) => {
    e.stopPropagation();
    const q = quests.find((item) => item.id === questId);
    if (!confirm('Are you sure you want to delete this quest?')) return;

    try {
      await deleteQuest(questId);
      setQuests((prev) => prev.filter((item) => item.id !== questId));
      if (selectedQuest?.id === questId) setSelectedQuest(null);
      showToast('Quest Deleted', q ? `"${q.title}" removed.` : '', 'info');
    } catch (err) {
      showToast('Action Failed', 'Could not delete quest.', 'error');
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-4 pb-4 max-w-full overflow-x-hidden">
        {/* Top Header Card */}
        <Card className="bg-gradient-to-br from-primary/10 via-background to-accent border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-background/80 text-[11px] font-medium">
                Checkpoint Trails
              </Badge>
              <span className="text-xs text-muted-foreground font-semibold">
                {quests.length} Quest{quests.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">Location Quests</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Sequential checkpoint trails with locked stop discovery
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="h-9 gap-1.5 rounded-full px-3.5 text-xs font-semibold shadow-sm shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>New Quest</span>
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

        {/* Loading Skeletons */}
        {loading ? (
          <div className="space-y-3 pt-1">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : quests.length === 0 ? (
          <Card className="p-8 text-center border-dashed bg-gradient-to-b from-primary/5 to-transparent">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
              <Compass className="h-7 w-7" />
            </div>
            <h3 className="text-base font-bold text-foreground">No Quests Yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Create an ordered chain of checkpoints where reaching one stop reveals the next.
            </p>
            <Button
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="mt-4 gap-1.5 rounded-full font-semibold text-xs h-9 px-4 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Quest</span>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {quests.map((quest) => {
              const stops = quest.stops || [];
              const completedStops = stops.filter((s) => s.is_done).length;
              const totalStops = stops.length;
              const isDone = totalStops > 0 && completedStops === totalStops;
              const progressPct = totalStops > 0 ? (completedStops / totalStops) * 100 : 0;

              return (
                <Card
                  key={quest.id}
                  onClick={() => setSelectedQuest(quest)}
                  className="transition-all duration-200 hover:shadow-md border-border cursor-pointer group"
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-base font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {quest.title}
                          </h4>
                          {isDone ? (
                            <Badge variant="completed" className="text-[10px] gap-1">
                              <Sparkles className="h-3 w-3" /> Completed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Active Trail
                            </Badge>
                          )}
                        </div>
                        {quest.note && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{quest.note}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteQuest(e, quest.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          title="Delete quest"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>

                    {/* Progress Bar & Counter */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">
                          {completedStops} of {totalStops} stops reached
                        </span>
                        <span className="text-muted-foreground font-medium">
                          {Math.round(progressPct)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500 rounded-full"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Quest Creation Modal */}
        <QuestModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={handleCreateQuest}
        />

        {/* Quest Detail Timeline View Modal */}
        {selectedQuest && (
          <QuestDetailView
            quest={selectedQuest}
            isOpen={Boolean(selectedQuest)}
            onClose={() => setSelectedQuest(null)}
          />
        )}
      </div>
    </AuthGuard>
  );
}
