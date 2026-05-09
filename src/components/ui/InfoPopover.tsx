import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';

interface Props {
  title: string;
  children: ReactNode;
  trigger?: ReactNode;
}

export function InfoPopover({ title, children, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary !py-1.5 !px-3 !text-xs"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={panelId}
      >
        {trigger ?? (
          <>
            <Info className="w-3.5 h-3.5" aria-hidden="true" />
            En savoir plus
          </>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="absolute z-40 right-0 mt-2 w-80 max-h-[70vh] overflow-auto p-4
                     bg-white border border-border rounded-xl shadow-2xl animate-fade-in"
        >
          <div className="flex items-start justify-between gap-2 mb-3 sticky top-0 bg-white pb-2 border-b border-border-subtle">
            <h4 id={titleId} className="text-sm font-semibold text-text">{title}</h4>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="text-text-subtle hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <div className="text-xs text-text-muted leading-relaxed space-y-3">{children}</div>
        </div>
      )}
    </div>
  );
}
