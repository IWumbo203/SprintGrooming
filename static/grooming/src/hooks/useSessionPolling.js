import { useEffect, useRef } from 'react';
import * as api from '../services/api';

const POLLING_INTERVALS = {
    ACTIVE: 2000,      // 2s: Active session, tab visible
    IDLE: 5000,        // 5s: No session, tab visible
    BACKGROUND: 15000  // 15s: Tab hidden
};

/** Back off next poll for this long after a mutation so we don't poll immediately after receiving state from the resolver. */
const BACKOFF_MS = 3000;
/** When backing off, use this interval for the next poll. */
const BACKOFF_INTERVAL_MS = 5000;

/**
 * Polls session version first; only fetches full grooming state when version differs from
 * lastKnownVersion (cache miss). Uses lastActionTime to back off after mutations.
 * Refetches immediately when the tab becomes visible.
 */
export const useSessionPolling = (onSyncState, lastActionTime, isSessionActive, lastKnownVersion) => {
    const isSessionActiveRef = useRef(isSessionActive);
    useEffect(() => {
        isSessionActiveRef.current = isSessionActive;
    }, [isSessionActive]);

    useEffect(() => {
        let timerId;

        const poll = async () => {
            try {
                const { version } = await api.getSessionVersion() || {};
                const known = lastKnownVersion?.current;
                // Refetch full state only when version changed or we have no cached version
                if (version !== known) {
                    const data = await api.getGroomingState();
                    if (data) {
                        onSyncState(data, { fromPoll: true });
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            } finally {
                const now = Date.now();
                const timeSinceAction = now - lastActionTime.current;
                const inBackoff = timeSinceAction < BACKOFF_MS;

                let interval;
                if (inBackoff) {
                    interval = BACKOFF_INTERVAL_MS;
                } else if (document.visibilityState === 'hidden') {
                    interval = POLLING_INTERVALS.BACKGROUND;
                } else {
                    interval = isSessionActiveRef.current ? POLLING_INTERVALS.ACTIVE : POLLING_INTERVALS.IDLE;
                }

                timerId = setTimeout(poll, interval);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                if (timerId) clearTimeout(timerId);
                poll();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        timerId = setTimeout(poll, POLLING_INTERVALS.IDLE);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearTimeout(timerId);
        };
    }, [onSyncState, lastActionTime, lastKnownVersion]);
};
