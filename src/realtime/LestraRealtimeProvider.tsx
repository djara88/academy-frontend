import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';

type RealtimeChange = {
  revision: number;
  scope: string | null;
  changedAt: string | null;
  connected: boolean;
};

type RealtimeRow = {
  academia_id?: string;
  scope?: string;
  revision?: number;
  changed_at?: string;
};

const INITIAL_STATE: RealtimeChange = {
  revision: 0,
  scope: null,
  changedAt: null,
  connected: false,
};

const LestraRealtimeContext = createContext<RealtimeChange>(INITIAL_STATE);

export const LESTRA_REALTIME_EVENT = 'lestra:realtime-change';

export function useLestraRealtime() {
  return useContext(LestraRealtimeContext);
}

export default function LestraRealtimeProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [state, setState] = useState<RealtimeChange>(INITIAL_STATE);
  const invalidateTimer = useRef<number | null>(null);

  useEffect(() => {
    const refreshActiveQueries = () => {
      void queryClient.invalidateQueries({ refetchType: 'active' });
    };

    window.addEventListener('focus', refreshActiveQueries);
    window.addEventListener('online', refreshActiveQueries);
    return () => {
      window.removeEventListener('focus', refreshActiveQueries);
      window.removeEventListener('online', refreshActiveQueries);
    };
  }, [queryClient]);

  useEffect(() => {
    if (loading || !user?.academia_id) {
      setState(INITIAL_STATE);
      return;
    }

    const academiaId = user.academia_id;
    const channel = supabase
      .channel(`lestra-academia-${academiaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lestra_realtime_state',
          filter: `academia_id=eq.${academiaId}`,
        },
        (payload) => {
          const row = (payload.new || payload.old || {}) as RealtimeRow;
          if (!row.scope) return;

          setState((current) => ({
            revision: Math.max(current.revision + 1, Number(row.revision || 0)),
            scope: row.scope || null,
            changedAt: row.changed_at || new Date().toISOString(),
            connected: current.connected,
          }));

          window.dispatchEvent(new CustomEvent(LESTRA_REALTIME_EVENT, {
            detail: {
              academiaId,
              scope: row.scope,
              revision: Number(row.revision || 0),
              changedAt: row.changed_at || null,
            },
          }));

          if (invalidateTimer.current) window.clearTimeout(invalidateTimer.current);
          invalidateTimer.current = window.setTimeout(() => {
            void queryClient.invalidateQueries({ refetchType: 'active' });
          }, 250);
        },
      )
      .subscribe((status) => {
        setState((current) => ({ ...current, connected: status === 'SUBSCRIBED' }));
      });

    return () => {
      if (invalidateTimer.current) {
        window.clearTimeout(invalidateTimer.current);
        invalidateTimer.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [loading, queryClient, user?.academia_id]);

  const value = useMemo(() => state, [state]);
  return <LestraRealtimeContext.Provider value={value}>{children}</LestraRealtimeContext.Provider>;
}
