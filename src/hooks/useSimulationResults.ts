import { useMemo } from 'react';
import { useSimulationStore, getCommune } from '@/store/useSimulationStore';
import { simuler, calculPrixBien } from '@/calculators/simulation';
import { tableauAmortissement } from '@/calculators/financial';
import { calculPTZMax } from '@/calculators/ptz';

/**
 * Hook central : recalcule tous les résultats à chaque changement de paramètre.
 * Mémoïsé sur les triplets (utilisateur, bien, pret).
 */
export function useSimulationResults() {
  const utilisateur = useSimulationStore((s) => s.utilisateur);
  const bien = useSimulationStore((s) => s.bien);
  const pret = useSimulationStore((s) => s.pret);

  // `getCommune` retourne déjà la même référence pour un même nom de commune
  // (lookup dans une constante module-level). On stabilise quand même via useMemo
  // pour pouvoir l'utiliser comme dépendance sans surprise.
  const commune = useMemo(() => getCommune(bien.commune), [bien.commune]);

  const resultats = useMemo(
    () => simuler(utilisateur, bien, pret, commune),
    [utilisateur, bien, pret, commune]
  );

  // tableauAmortissement est cher (240+ itérations) — mémoïsé strictement
  // sur ce qui change le résultat (montant prêt, taux, durée).
  const amortissement = useMemo(
    () =>
      resultats.pret_principal_montant > 0
        ? tableauAmortissement(
            resultats.pret_principal_montant,
            pret.taux_annuel,
            pret.duree_annees
          )
        : [],
    [resultats.pret_principal_montant, pret.taux_annuel, pret.duree_annees]
  );

  const prixBien = useMemo(() => calculPrixBien(bien), [bien]);
  const ptzMax = useMemo(
    () => calculPTZMax(prixBien, commune.zone_ptz, bien.type_bien),
    [prixBien, commune, bien.type_bien]
  );

  return { resultats, amortissement, commune, prixBien, ptzMax, utilisateur, bien, pret };
}
