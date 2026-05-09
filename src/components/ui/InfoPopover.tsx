import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';

interface Props {
  title: string;
  children: ReactNode;
  trigger?: ReactNode;
}

export function InfoPopover({ title, children, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
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
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="btn-secondary !py-1.5 !px-3 !text-xs"
        aria-expanded={open}
      >
        {trigger ?? (
          <>
            <Info className="w-3.5 h-3.5" />
            En savoir plus
          </>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute z-40 right-0 mt-2 w-80 max-h-[70vh] overflow-auto p-4
                     bg-white border border-border rounded-xl shadow-2xl animate-fade-in"
        >
          <div className="flex items-start justify-between gap-2 mb-3 sticky top-0 bg-white pb-2 border-b border-border-subtle">
            <h4 className="text-sm font-semibold text-text">{title}</h4>
            <button
              onClick={() => setOpen(false)}
              className="text-text-subtle hover:text-text"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-text-muted leading-relaxed space-y-3">{children}</div>
        </div>
      )}
    </div>
  );
}
