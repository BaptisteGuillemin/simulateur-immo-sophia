import { memo, type ReactNode } from 'react';
import { Tooltip } from './Tooltip';
import { useDebouncedSetter } from '@/hooks/useDebouncedSetter';

interface Props {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  /** Texte simple ou contenu JSX (ex: FormulaTip). */
  tooltip?: ReactNode;
}

function NumberFieldImpl({ label, value, onChange, min, max, step = 1, suffix, tooltip }: Props) {
  const [localValue, setLocalValue] = useDebouncedSetter<number>(value, onChange, 150);
  return (
    <div>
      <label className="field-label">
        <span className="flex items-center gap-1.5">
          {label}
          {tooltip && <Tooltip content={tooltip} />}
        </span>
      </label>
      <div className="relative">
        <input
          type="number"
          className="input pr-12 font-mono tabular-nums"
          value={Number.isFinite(localValue) ? localValue : 0}
          onChange={(e) => setLocalValue(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-subtle pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export const NumberField = memo(NumberFieldImpl);
