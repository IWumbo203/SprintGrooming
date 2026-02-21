import { useEffect } from 'react';
import * as api from '../services/api';

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
    setCurrentItem
) => {
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const [sessionActive, currentItemData, smId, groomingData] = await Promise.all([
                    api.isSessionActive(),
                    api.getCurrentItem(),
                    api.getScrumMaster(),
                    api.getGroomingList()
                ]);
                
                setScrumMasterId(smId);
                
                // Update grooming list if changed (to catch SM movements or points applied)
                if (JSON.stringify(groomingData) !== JSON.stringify(groomingList)) {
                    setGroomingList(groomingData || []);
                }
                
                if (!!sessionActive !== isSessionActive) {
                    setIsSessionActive(!!sessionActive);
                    if (!sessionActive) {
                        setMyVote(null);
                        setVotes([]);
                        setVotesRevealed(false);
                    }
                }

                if (sessionActive) {
                    if (currentItemData && (!currentItem || currentItemData.id !== currentItem.id)) {
                        setMyVote(null);
                        setCurrentItem(currentItemData);
                    }
                    
                    if (currentItemData) {
                        const result = await api.getVotes(currentItemData.id);
                        setVotes(result.votes || []);
                        setVotesRevealed(result.revealed);
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [
        isSessionActive, 
        currentItem, 
        groomingList, 
        setScrumMasterId, 
        setGroomingList, 
        setIsSessionActive, 
        setMyVote, 
        setVotes, 
        setVotesRevealed, 
        setCurrentItem
    ]);
};
