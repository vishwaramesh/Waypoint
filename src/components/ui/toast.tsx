'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { subscribeToast, ToastMessage } from '@/lib/utils/toast';

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToast((newToast) => {
      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 3.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    });

    return unsubscribe;
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-[100] px-4 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="w-full max-w-sm rounded-xl border bg-background/95 backdrop-blur p-3 shadow-xl pointer-events-auto flex items-start gap-3 animate-in slide-in-from-bottom duration-200"
        >
          <div className="mt-0.5">
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-primary" />}
          </div>

          <div className="flex-1 space-y-0.5">
            <h4 className="text-xs font-bold text-foreground">{toast.title}</h4>
            {toast.description && (
              <p className="text-[11px] text-muted-foreground">{toast.description}</p>
            )}
          </div>

          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="text-muted-foreground hover:text-foreground p-0.5"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
