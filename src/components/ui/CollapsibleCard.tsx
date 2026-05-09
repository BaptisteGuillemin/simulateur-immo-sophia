import { useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface Props {
  /** Titre du pavé (texte court, uppercase auto via CSS) */
  title: string;
  /** Icône (lucide ou autre) à gauche du titre */
  icon?: ReactNode;
  /** Indicateur compact à droite du titre (visible même replié) — ex valeur clé */
  badge?: ReactNode;
  /** État initial : ouvert (défaut) ou fermé */
  defaultOpen?: boolean;
  /** Contenu collapsible */
  children: ReactNode;
}

export function CollapsibleCard({ title, icon, badge, defaultOpen = true, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className="card !p-0 overflow-hidden animate-slide-up">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-bg-subtle/40
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
                   focus-visible:ring-inset transition group"
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div className="card-title !mb-0 flex items-center gap-2">
          {icon}
          {title}
        </div>
        <div className="flex items-center gap-3">
          {badge && <div className="text-xs">{badge}</div>}
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 text-text-subtle group-hover:text-text-muted transition-transform duration-200 ${
              open ? '' : '-rotate-90'
            }`}
          />
        </div>
      </button>
      <div
        id={panelId}
        role="region"
        aria-label={title}
        aria-hidden={!open}
        className={`transition-all duration-200 ease-out overflow-hidden ${
          open ? 'max-h-[8000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 pt-1">{children}</div>
      </div>
    </div>
  );
}
