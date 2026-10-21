import React, { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  /** What exactly is about to happen, and whether it can be undone. */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive. Default true. */
  destructive?: boolean;
}

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

/**
 * An in-app confirmation prompt, as a promise.
 *
 *   if (!await confirm({ title: 'Excluir?' })) return;
 *
 * Deleting an employee, a saved version or a library image used to happen on
 * a single click with nothing in between, and those are permanent. The one
 * place that did ask used window.confirm, which some embedded browsers
 * suppress entirely -- there it returns false silently, so the action looks
 * broken instead of dangerous.
 *
 * Returns the dialog element to render alongside the rest of the app; it
 * renders nothing until something asks.
 */
export const useConfirmDialog = (): { confirm: ConfirmFn; dialog: React.ReactNode } => {
  const [pending, setPending] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setPending(options);
    return new Promise<boolean>((resolve) => { resolveRef.current = resolve; });
  }, []);

  const settle = useCallback((value: boolean) => {
    setPending(null);
    resolveRef.current?.(value);
    resolveRef.current = null;
  }, []);

  const destructive = pending?.destructive !== false;

  const dialog = (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-6"
          onMouseDown={(e) => { if (e.target === e.currentTarget) settle(false); }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-label={pending.title}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1a1a1a] p-5 shadow-2xl"
            // Enter confirms, Escape cancels -- the dialog takes focus on mount
            // so both work without reaching for the mouse.
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.stopPropagation(); settle(false); }
              if (e.key === 'Enter') { e.stopPropagation(); settle(true); }
            }}
            tabIndex={-1}
            ref={(node) => node?.focus()}
          >
            <div className="flex gap-3">
              {destructive && (
                <div className="mt-0.5 shrink-0 text-red-400" aria-hidden="true">
                  <AlertTriangle size={18} />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white">{pending.title}</h2>
                {pending.description && (
                  <p className="mt-1 text-xs leading-relaxed text-white/60">{pending.description}</p>
                )}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => settle(false)}
                className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                {pending.cancelLabel || 'Cancelar'}
              </button>
              <button
                onClick={() => settle(true)}
                className={`rounded-full px-4 py-2 text-xs font-bold transition-opacity hover:opacity-85 ${
                  destructive ? 'bg-red-500 text-white' : 'bg-white text-black'
                }`}
              >
                {pending.confirmLabel || 'Excluir'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return { confirm, dialog };
};
