import { useCallback, useEffect, useRef, useState } from 'react';

import { useApi } from '../api/ApiProvider';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';

export type LeaseState =
  | { status: 'pending' }
  | { status: 'held' }
  | { status: 'denied'; holderName?: string }
  | { status: 'lost'; holderName?: string };

export const HEARTBEAT_MS = 30000;

const useEditLease = (
  id: string,
  enabled: boolean,
  heartbeatMs: number = HEARTBEAT_MS,
): {
  lease: LeaseState;
  retry: () => void;
  markLost: (holderName?: string) => void;
} => {
  const api = useApi();
  const { getToken } = useAuth();
  const [lease, setLease] = useState<LeaseState>({ status: 'pending' });
  const [attempt, setAttempt] = useState(0);
  const tokenRef = useRef<string>();
  const heldRef = useRef(false);

  const markLost = useCallback((holderName?: string) => {
    heldRef.current = false;
    setLease({ status: 'lost', holderName });
  }, []);

  const retry = useCallback(() => {
    setLease({ status: 'pending' });
    setAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!id || !enabled) return undefined;
    let cancelled = false;

    const acquire = async () => {
      try {
        await api.acquireLease(id);
        if (cancelled) return;
        heldRef.current = true;
        setLease({ status: 'held' });
      } catch (error) {
        if (cancelled) return;
        heldRef.current = false;
        setLease({
          status: 'denied',
          holderName: error instanceof ApiError ? error.holderName : undefined,
        });
      }
    };

    void acquire();
    void getToken()
      .then((token) => {
        tokenRef.current = token;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [api, enabled, getToken, id, attempt]);

  useEffect(() => {
    if (lease.status !== 'held') return undefined;
    const timer = setInterval(() => {
      api.acquireLease(id).catch((error) => {
        // only a refused renewal means someone else took over; a transient
        // failure still leaves the lease held until it expires
        if (error instanceof ApiError && error.status === 409) {
          markLost(error.holderName);
        }
      });
      void getToken()
        .then((token) => {
          tokenRef.current = token;
        })
        .catch(() => undefined);
    }, heartbeatMs);
    return () => clearInterval(timer);
  }, [api, getToken, heartbeatMs, id, lease.status, markLost]);

  useEffect(() => {
    if (lease.status !== 'held') return undefined;

    const release = () => {
      if (!heldRef.current) return;
      heldRef.current = false;
      const token = tokenRef.current;
      if (token) api.releaseLeaseOnUnload(id, token);
    };

    window.addEventListener('beforeunload', release);
    return () => {
      window.removeEventListener('beforeunload', release);
      if (heldRef.current) {
        heldRef.current = false;
        void api.releaseLease(id).catch(() => undefined);
      }
    };
  }, [api, id, lease.status]);

  return { lease, retry, markLost };
};

export default useEditLease;
