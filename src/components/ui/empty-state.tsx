'use client';

import React from 'react';
import { CheckSquare, Sparkles, Plus, PartyPopper } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  type: 'no-errands' | 'all-done';
  onAddClick?: () => void;
}

export function EmptyState({ type, onAddClick }: EmptyStateProps) {
  if (type === 'all-done') {
    return (
      <Card className="p-8 text-center border-dashed bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3 animate-bounce">
          <PartyPopper className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-foreground">All Errands Complete!</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
          You've finished all your geofenced target stops for today. Sit back and relax! 🎉
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-8 text-center border-dashed bg-gradient-to-b from-primary/5 to-transparent">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
        <CheckSquare className="h-7 w-7" />
      </div>
      <h3 className="text-base font-bold text-foreground">No Errands Yet</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
        Add your first geofenced errand stop to start tracking location targets on the map.
      </p>
      {onAddClick && (
        <Button
          onClick={onAddClick}
          size="sm"
          className="mt-4 gap-1.5 rounded-full font-semibold text-xs h-9 px-4 shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add First Errand</span>
        </Button>
      )}
    </Card>
  );
}
