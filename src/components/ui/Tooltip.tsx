import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

interface Props {
  content: ReactNode;
  children?: ReactNode;
  /** Tooltip plus large (320 px au lieu de 256 px). */
  wide?: boolean;
}

/**
 * Marge minimale entre le bord de la tooltip et le bord du viewport.
 * Évite que le rectangle ne touche le bord pixel-perfect, ce qui paraît étriqué.
 */
const VIEWPORT_MARGIN = 12;

/**
 * Tooltip simple avec :
 *  - Ouverture sur hover et focus (clavier-friendly).
 *  - Repositionnement automatique horizontal quand l'ancrage est trop près
 *    d'un bord du viewport (la tooltip resterait sinon coupée).
 *  - Flèche qui reste alignée sur le centre du déclencheur, indépendamment
 *    du décalage appliqué au rectangle.
 *
 * Pas de `React.memo` : la prop `content` est presque toujours un noeud JSX
 * recréé à chaque render parent — la mémo serait inopérante et trompeuse.
 */
export function Tooltip({ content, children, wide }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const width = wide ? 320 : 256;

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const triggerCenterX = rect.left + rect.width / 2;
    const tooltipDesiredLeft = triggerCenterX - width / 2;
    const tooltipDesiredRight = triggerCenterX + width / 2;

    let offset = 0;
    if (tooltipDesiredLeft < VIEWPORT_MARGIN) {
      offset = VIEWPORT_MARGIN - tooltipDesiredLeft;
    } else if (tooltipDesiredRight > window.innerWidth - VIEWPORT_MARGIN) {
      offset = window.innerWidth - VIEWPORT_MARGIN - tooltipDesiredRight;
    }
    setHorizontalOffset(offset);
  }, [open, width]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children ?? (
        <Info className="w-3.5 h-3.5 text-text-subtle hover:text-text-muted cursor-help" />
      )}
      {open && (
        <span
          role="tooltip"
          style={{
            width: `${width}px`,
            transform: `translateX(calc(-50% + ${horizontalOffset}px))`,
          }}
          className="absolute z-30 bottom-full left-1/2 mb-2 p-3 text-xs leading-relaxed
                     bg-white border border-border rounded-lg shadow-xl text-text animate-fade-in"
        >
          {content}
          {/* Flèche : ancrée sur le centre du déclencheur (compense le décalage du tooltip). */}
          <span
            aria-hidden="true"
            style={{ left: `calc(50% - ${horizontalOffset}px)` }}
            className="absolute top-full -translate-x-1/2 w-2 h-2 bg-white
                       border-r border-b border-border rotate-45 -translate-y-1"
          />
        </span>
      )}
    </span>
  );
}
