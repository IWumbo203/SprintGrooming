import { storage } from '@forge/api';
import {
    SESSION_ACTIVE_KEY,
    SCRUM_MASTER_KEY,
    CURRENT_ITEM_KEY,
    GROOMING_LIST_KEY,
    VOTING_OPEN_KEY,
    REVEALED_KEY,
    VOTES_PREFIX,
    getStorageKey
} from './session';
import { getSessionUsers } from './presence';

export const getFullSessionState = async (req) => {
    const { itemId } = req.payload || {};
    const key = (base) => getStorageKey(req, base);

    // Fetch all core session state in parallel (per-project)
    const [
        sessionActive,
        scrumMasterId,
        currentItem,
        groomingList,
        isVotingOpen,
        votesRevealed,
        sessionUsers
    ] = await Promise.all([
        storage.get(key(SESSION_ACTIVE_KEY)),
        storage.get(key(SCRUM_MASTER_KEY)),
        storage.get(key(CURRENT_ITEM_KEY)),
        storage.get(key(GROOMING_LIST_KEY)),
        storage.get(key(VOTING_OPEN_KEY)),
        storage.get(key(REVEALED_KEY)),
        getSessionUsers(req)
    ]);

    let voteData = { votes: [], revealed: !!votesRevealed };

    // Only fetch votes if there's a session and an item being pointed
    const targetItemId = itemId || (currentItem ? currentItem.id : null);

    if (sessionActive && targetItemId) {
        const votes = await storage.get(key(`${VOTES_PREFIX}${targetItemId}`)) || {};
        const accountIds = Object.keys(votes);
        
        const voteList = accountIds.map(id => {
            const data = votes[id];
            const voteValue = typeof data === 'object' ? data.vote : data;
            const displayName = typeof data === 'object' ? data.displayName : 'Unknown User';

            return {
                accountId: id,
                displayName: displayName,
                vote: votesRevealed ? voteValue : '?',
                hasVoted: true
            };
        });
        voteData.votes = voteList;
    }

    return {
        sessionActive: !!sessionActive,
        scrumMasterId,
        currentItem,
        groomingList: groomingList || [],
        isVotingOpen: !!isVotingOpen,
        votesRevealed: !!votesRevealed,
        sessionUsers: sessionUsers || [],
        votes: voteData.votes
    };
};
