import { memo, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';

interface Props {
  content: ReactNode;
  children?: ReactNode;
  wide?: boolean;
}

function TooltipImpl({ content, children, wide }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children ?? <Info className="w-3.5 h-3.5 text-text-subtle hover:text-text-muted cursor-help" />}
      {open && (
        <span
          role="tooltip"
          className={`absolute z-30 bottom-full left-1/2 -translate-x-1/2 mb-2 ${
            wide ? 'w-80' : 'w-64'
          } p-3 text-xs leading-relaxed bg-white border border-border rounded-lg shadow-xl text-text animate-fade-in`}
        >
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b border-border rotate-45 -translate-y-1" />
        </span>
      )}
    </span>
  );
}

export const Tooltip = memo(TooltipImpl);
