import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <div
        className="fixed inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative my-auto w-full animate-fade-up overflow-hidden rounded-2xl border border-slate-900/[0.11] bg-ink-850 shadow-panel',
          size === 'lg' ? 'max-w-2xl' : 'max-w-lg',
        )}
      >
        <header className="flex items-start gap-3 border-b border-slate-900/[0.08] px-6 py-5">
          {icon && (
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/15 text-brand-600">
              {icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold tracking-tight text-mist-100">{title}</h2>
            {subtitle && <p className="mt-1 text-xs leading-relaxed text-mist-400">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-mist-400 transition hover:bg-slate-900/10 hover:text-mist-100"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[62vh] overflow-y-auto px-6 py-5 scrollbar-slim">{children}</div>

        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-slate-900/[0.08] bg-slate-900/[0.035] px-6 py-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
