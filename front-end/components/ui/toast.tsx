'use client';

import * as React from 'react';

type Toast = {
  id: string;
  message: string;
  tone?: 'info' | 'success' | 'error';
};

const ToastContext = React.createContext<{
  addToast: (message: string, tone?: Toast['tone']) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  function addToast(message: string, tone: Toast['tone'] = 'info') {
    const id = String(Date.now()) + Math.random().toString(16).slice(2, 8);
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div aria-live="polite" className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-md px-4 py-2 shadow-sm text-sm ${
              toast.tone === 'success'
                ? 'bg-emerald-50 text-emerald-800'
                : toast.tone === 'error'
                  ? 'bg-rose-50 text-rose-800'
                  : 'bg-white/90 text-slate-900'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;
