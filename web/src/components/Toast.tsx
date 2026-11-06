import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types';
import { cx } from '../utils';

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
}

const STYLES = {
  success: { icon: CheckCircle2, color: 'text-emerald-600', ring: 'border-emerald-400/25' },
  error: { icon: AlertCircle, color: 'text-rose-600', ring: 'border-rose-400/25' },
  info: { icon: Info, color: 'text-brand-600', ring: 'border-brand-400/25' },
} as const;

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;
  const style = STYLES[toast.type];
  const Icon = style.icon;

  return (
    <div
      key={toast.id}
      role="status"
      className={cx(
        'fixed bottom-6 right-6 z-[60] flex max-w-sm animate-fade-up items-start gap-3 rounded-xl border bg-ink-800/95 px-4 py-3.5 shadow-panel backdrop-blur-xl',
        style.ring,
      )}
    >
      <Icon className={cx('mt-0.5 h-4 w-4 shrink-0', style.color)} />
      <p className="flex-1 text-sm leading-relaxed text-mist-200">{toast.text}</p>
      <button
        type="button"
        onClick={onClose}
        className="text-mist-500 transition hover:text-mist-100"
        aria-label="关闭提示"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
