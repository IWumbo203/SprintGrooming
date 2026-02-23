import { useEffect, useRef } from 'react';
import * as api from '../services/api';

const POLLING_INTERVALS = {
    ACTIVE: 2000,      // 2s: Active session, tab visible
    IDLE: 5000,        // 5s: No session, tab visible
    BACKGROUND: 15000  // 15s: Tab hidden
};

export const useSessionPolling = (
    isSessionActive, 
    currentItem, 
    groomingList, 
    setScrumMasterId, 
    setGroomingList, 
    setIsSessionActive, 
    setMyVote, 
    setVotes, 
    setVotesRevealed, 
    setCurrentItem,
    setSessionUsers,
    setIsVotingOpen,
    lastActionTime
) => {
    // Use refs to access current state in the poll without triggering interval resets
    const stateRef = useRef({ isSessionActive, currentItem, groomingList });
    
    useEffect(() => {
        stateRef.current = { isSessionActive, currentItem, groomingList };
    }, [isSessionActive, currentItem, groomingList]);

    useEffect(() => {
        let timerId;

        const poll = async () => {
            try {
                // Perform consolidated fetch (includes heartbeat)
                const data = await api.getGroomingState();
                
                if (!data) return;

                const {
                    isSessionActive: serverSessionActive,
                    currentItem: serverCurrentItem,
                    scrumMasterId: serverSmId,
                    groomingList: serverGroomingList,
                    sessionUsers: serverUsers,
                    isVotingOpen: serverVotingOpen,
                    votes: serverVotes,
                    votesRevealed: serverVotesRevealed
                } = data;

                // 1. Sync Base State
                setScrumMasterId(serverSmId);
                setSessionUsers(serverUsers || []);
                setIsVotingOpen(!!serverVotingOpen);
                setVotesRevealed(!!serverVotesRevealed);
                setVotes(serverVotes || []);

                // 2. Sync Grooming List (if changed)
                if (JSON.stringify(serverGroomingList) !== JSON.stringify(stateRef.current.groomingList)) {
                    setGroomingList(serverGroomingList || []);
                }

                // 3. Sync Session Status
                if (!!serverSessionActive !== stateRef.current.isSessionActive) {
                    setIsSessionActive(!!serverSessionActive);
                    if (!serverSessionActive) {
                        setMyVote(null);
                        setVotes([]);
                        setVotesRevealed(false);
                    }
                }

                // 4. Sync Current Item
                if (serverSessionActive) {
                    const localItemId = stateRef.current.currentItem?.id;
                    const serverItemId = serverCurrentItem?.id;
                    
                    // RACING CONDITION PROTECTION:
                    // If we just manually switched items in the last 4 seconds,
                    // we IGNORE the server's currentItem, as it may still be reporting the old one.
                    const isRecentlySwitched = (Date.now() - lastActionTime.current) < 4000;

                    if (serverItemId && serverItemId !== localItemId && !isRecentlySwitched) {
                        setMyVote(null);
                        setCurrentItem(serverCurrentItem);
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            } finally {
                // Schedule next poll based on current visibility and activity
                const interval = document.visibilityState === 'hidden' 
                    ? POLLING_INTERVALS.BACKGROUND 
                    : (stateRef.current.isSessionActive ? POLLING_INTERVALS.ACTIVE : POLLING_INTERVALS.IDLE);
                
                timerId = setTimeout(poll, interval);
            }
        };

        // Start the polling loop
        timerId = setTimeout(poll, POLLING_INTERVALS.IDLE);

        return () => clearTimeout(timerId);
    }, [
        // We only want to restart the loop if the setter functions change (which they shouldn't)
        // or if the component mounts/unmounts.
        setScrumMasterId, 
        setGroomingList, 
        setIsSessionActive, 
        setMyVote, 
        setVotes, 
        setVotesRevealed, 
        setCurrentItem,
        setSessionUsers,
        setIsVotingOpen
    ]);
};
