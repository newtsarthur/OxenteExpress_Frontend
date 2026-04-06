import { useEffect, useRef, useCallback, useState } from "react";
import { playNotificationBeep } from "@/lib/beep";

export type OnSyncCallback = (opts?: { silent?: boolean }) => Promise<void>;

export interface UseRealtimeSyncOptions {
  /** Intervalo em ms entre cada refetch. */
  intervalMs?: number;
  /** Callback invocada a cada ciclo de sincronização. */
  onSync: OnSyncCallback;
  /** Habilita beep ao detectar novos itens (ex: novo pedido). */
  beepOnNew?: () => number;
  /** Desabilita o polling (útil quando o componente está em background). */
  enabled?: boolean;
}

/**
 * Hook de sincronização baseado em polling.
 * Substitui o Socket.IO que não funciona na Vercel (serverless).
 */
export function useRealtimeSync(options: UseRealtimeSyncOptions) {
  const { intervalMs = 5000, onSync, beepOnNew, enabled = true } = options;
  const prevCountRef = useRef<number | null>(null);

  // Wrapper com detecção de "novos itens" para beep
  const sync = useCallback(async () => {
    const prevCount = prevCountRef.current;
    await onSync({ silent: true });

    if (beepOnNew && prevCount !== null) {
      const newCount = beepOnNew();
      if (newCount > prevCount) {
        playNotificationBeep();
      }
    }
  }, [onSync, beepOnNew]);

  // Primeira chamada imediata + polling
  useEffect(() => {
    if (!enabled) return;

    // Chama uma vez no mount
    void onSync({ silent: true });

    const timer = setInterval(sync, intervalMs);
    return () => clearInterval(timer);
  }, [sync, intervalMs, enabled, onSync]);

  // Expondo atualização manual caso o componente precise
  return { sync };
}

/**
 * Hook genérico para polling de dados simples.
 * Retorna `{ data, loading, refetch }`.
 */
export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs = 5000,
  enabled = true
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) return;

    void fetchData();
    timerRef.current = setInterval(fetchData, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchData, intervalMs, enabled]);

  return { data, loading, refetch: fetchData };
}
