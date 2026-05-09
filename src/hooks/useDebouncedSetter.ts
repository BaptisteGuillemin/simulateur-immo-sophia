import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook qui sépare l'état "live" (affichage instantané) de l'état "comité"
 * (poussé au store / parent) en débouchant les appels au setter externe.
 *
 * Usage :
 *   const [localValue, setLocalValue] = useDebouncedSetter(value, onChange, 120);
 *
 * - `localValue` est l'état réactif local : utilise-le pour `value` du <input>.
 * - `setLocalValue` est appelé à chaque keystroke / drag : il met à jour
 *   immédiatement `localValue` et planifie un appel debouncé à `setter`.
 * - Si `currentValue` change DE L'EXTÉRIEUR (par ex. "Caler sur la moyenne"),
 *   `localValue` se synchronise automatiquement et le pending pending
 *   debounce est annulé pour éviter d'écraser la nouvelle valeur externe.
 */
export function useDebouncedSetter<T>(
  currentValue: T,
  setter: (v: T) => void,
  delay: number = 120
): [T, (v: T) => void] {
  const [localValue, setLocalValue] = useState<T>(currentValue);

  // Garde la dernière référence du setter pour éviter les setters obsolètes
  // dans le timeout sans recréer le callback à chaque render.
  const setterRef = useRef(setter);
  useEffect(() => {
    setterRef.current = setter;
  }, [setter]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // La dernière valeur locale émise par l'utilisateur (en attente de flush).
  // Sert à différencier un changement EXTERNE d'un écho du store
  // (le parent renvoie la valeur qu'on vient de pousser).
  const pendingValueRef = useRef<T>(currentValue);
  const hasPendingRef = useRef<boolean>(false);

  // Sync externe : si currentValue change ET que ça ne correspond pas à
  // notre valeur locale en attente -> on adopte la nouvelle valeur externe.
  useEffect(() => {
    if (hasPendingRef.current && Object.is(currentValue, pendingValueRef.current)) {
      // Le store a juste accusé réception de notre dernière valeur.
      hasPendingRef.current = false;
      return;
    }
    // Changement externe : on annule le debounce pending et on adopte.
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    hasPendingRef.current = false;
    setLocalValue(currentValue);
  }, [currentValue]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const setDebounced = useCallback(
    (v: T) => {
      setLocalValue(v);
      pendingValueRef.current = v;
      hasPendingRef.current = true;
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setterRef.current(v);
      }, delay);
    },
    [delay]
  );

  return [localValue, setDebounced];
}
