import { memo, type ReactNode } from 'react';
import { Tooltip } from './Tooltip';

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  tooltip?: ReactNode;
  tooltipWide?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
  large?: boolean;
}

const COLOR_MAP = {
  default: 'text-text',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  accent: 'text-accent',
} as const;

function StatImpl({ label, value, hint, tooltip, tooltipWide, variant = 'default', large }: Props) {
  return (
    <div className={`p-3.5 rounded-xl bg-bg-subtle/40 border border-border-subtle ${large ? 'col-span-2' : ''}`}>
      <div className="stat-label flex items-center gap-1.5">
        {label}
        {tooltip && <Tooltip content={tooltip} wide={tooltipWide} />}
      </div>
      <div className={`mt-1 ${COLOR_MAP[variant]} ${large ? 'text-3xl' : 'text-2xl'} font-mono font-semibold tabular-nums`}>
        {value}
      </div>
      {hint && <div className="text-xs text-text-subtle mt-1">{hint}</div>}
    </div>
  );
}

export const Stat = memo(StatImpl);
