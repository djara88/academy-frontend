import { useEffect } from 'react';
import api from '../api/axiosConfig';

const HEARTBEAT_MS = 30_000;

export const usePresenceHeartbeat = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return undefined;

    let stopped = false;
    let sending = false;

    const sendHeartbeat = async () => {
      if (stopped || sending || document.visibilityState === 'hidden') return;
      sending = true;
      try {
        await api.post('/api/presence/heartbeat');
      } catch {
        // Presencia es telemetría auxiliar: nunca debe interrumpir la experiencia.
      } finally {
        sending = false;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void sendHeartbeat();
    };
    const handleFocus = () => void sendHeartbeat();

    void sendHeartbeat();
    const timer = window.setInterval(() => void sendHeartbeat(), HEARTBEAT_MS);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled]);
};
