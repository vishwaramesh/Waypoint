export type ToastType = 'success' | 'info' | 'error';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

type ToastListener = (toast: ToastMessage) => void;
const listeners: Set<ToastListener> = new Set();

export function showToast(title: string, description?: string, type: ToastType = 'success') {
  const toast: ToastMessage = {
    id: Math.random().toString(36).substring(2, 9),
    title,
    description,
    type,
  };
  listeners.forEach((listener) => listener(toast));
}

export function subscribeToast(listener: ToastListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
