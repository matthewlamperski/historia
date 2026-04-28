import { useEffect } from 'react';

export type ToastKind = 'success' | 'error';

interface ToastProps {
  kind: ToastKind;
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export default function Toast({ kind, message, onDismiss, durationMs = 4000 }: ToastProps) {
  useEffect(() => {
    if (kind === 'error') return; // errors stay until dismissed
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [kind, durationMs, onDismiss]);

  const classes =
    kind === 'success'
      ? 'border-success-300 bg-success-50 text-success-800'
      : 'border-error-300 bg-error-50 text-error-800';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <div
        role="status"
        className={`pointer-events-auto flex max-w-xl items-start gap-3 rounded-xl border px-4 py-3 shadow-soft-lg ${classes}`}
      >
        <span className="text-sm font-medium leading-snug">{message}</span>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onDismiss}
          className="-m-1 ml-auto rounded p-1 hover:opacity-70"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 6.22a.75.75 0 011.06 0L10 8.94l2.66-2.72a.75.75 0 111.07 1.04L11.06 10l2.67 2.74a.75.75 0 11-1.07 1.04L10 11.06l-2.66 2.72a.75.75 0 11-1.06-1.04L8.94 10 6.28 7.26a.75.75 0 010-1.04z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
