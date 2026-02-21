import api, { route, storage } from '@forge/api';
import { VOTES_PREFIX, REVEALED_KEY, SCRUM_MASTER_KEY } from './session';

export const submitVote = async (req) => {
    const { itemId, vote } = req.payload;
    const { accountId } = req.context;
    
    // Scrum master cannot vote
    const smId = await storage.get(SCRUM_MASTER_KEY);
    if (accountId === smId) throw new Error('Scrum Master cannot vote');

    // Get user display name from presence cache or fetch it
    let displayName = 'Unknown User';
    const activeUsers = await storage.get('session-active-users') || {};
    if (activeUsers[accountId]) {
        displayName = activeUsers[accountId].displayName;
    } else {
        const response = await api.asApp().requestJira(route`/rest/api/3/user?accountId=${accountId}`);
        if (response.ok) {
            const user = await response.json();
            displayName = user.displayName;
        }
    }

    const votesKey = `${VOTES_PREFIX}${itemId}`;
    const votes = await storage.get(votesKey) || {};
    
    // Store both vote value and display name
    votes[accountId] = { vote, displayName };
    await storage.set(votesKey, votes);
    return votes;
};

export const getVotes = async (req) => {
    const { itemId } = req.payload;
    const votes = await storage.get(`${VOTES_PREFIX}${itemId}`) || {};
    const revealed = await storage.get(REVEALED_KEY) || false;
    
    const accountIds = Object.keys(votes);
    if (accountIds.length === 0) return { votes: [], revealed };

    const voteList = accountIds.map(id => {
        const voteData = votes[id];
        // Handle both old (string) and new (object) vote formats
        const voteValue = typeof voteData === 'object' ? voteData.vote : voteData;
        const displayName = typeof voteData === 'object' ? voteData.displayName : 'Unknown User';

        return {
            accountId: id,
            displayName: displayName,
            vote: revealed ? voteValue : '?', // Hide vote value if not revealed
            hasVoted: true
        };
    });

    return { votes: voteList, revealed };
};

export const revealVotes = async () => {
    await storage.set(REVEALED_KEY, true);
    return true;
};
