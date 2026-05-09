import type { ReactNode } from 'react';

interface Props {
  /** Description courte (1-2 phrases) */
  description?: ReactNode;
  /** Formule générique (ex: "M = K × t / (1 − (1+t)^−n)") */
  formula?: string;
  /** Substitutions ligne par ligne avec valeurs courantes */
  values?: Array<{ label: string; value: string }>;
  /** Résultat final */
  result?: { label: string; value: string };
  /** Note pédagogique de bas de tooltip */
  footnote?: ReactNode;
}

/**
 * Contenu de tooltip standardisé : description → formule → valeurs courantes → résultat.
 * À passer comme `content` au Tooltip / Stat.
 */
export function FormulaTip({ description, formula, values, result, footnote }: Props) {
  return (
    <div className="space-y-2 text-left">
      {description && <div className="text-text-muted">{description}</div>}
      {formula && (
        <div className="font-mono text-[11px] bg-bg-subtle/80 px-2 py-1.5 rounded text-accent">
          {formula}
        </div>
      )}
      {values && values.length > 0 && (
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase tracking-wider text-text-subtle">
            Valeurs actuelles
          </div>
          {values.map((v) => (
            <div key={v.label} className="flex justify-between gap-2 text-[11px]">
              <span className="text-text-muted">{v.label}</span>
              <span className="font-mono text-text">{v.value}</span>
            </div>
          ))}
        </div>
      )}
      {result && (
        <div className="pt-1.5 border-t border-border-subtle flex justify-between gap-2 text-[11px]">
          <span className="text-text-muted font-medium">{result.label}</span>
          <span className="font-mono font-semibold text-accent">{result.value}</span>
        </div>
      )}
      {footnote && <div className="text-[10px] text-text-subtle italic">{footnote}</div>}
    </div>
  );
}
