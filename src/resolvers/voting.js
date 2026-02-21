import api, { route, storage } from '@forge/api';
import { VOTES_PREFIX, REVEALED_KEY, SCRUM_MASTER_KEY } from './session';

export const submitVote = async (req) => {
    const { itemId, vote } = req.payload;
    const { accountId } = req.context;
    
    // Scrum master cannot vote
    const smId = await storage.get(SCRUM_MASTER_KEY);
    if (accountId === smId) throw new Error('Scrum Master cannot vote');

    const votesKey = `${VOTES_PREFIX}${itemId}`;
    const votes = await storage.get(votesKey) || {};
    
    votes[accountId] = vote;
    await storage.set(votesKey, votes);
    return votes;
};

export const getVotes = async (req) => {
    const { itemId } = req.payload;
    const votes = await storage.get(`${VOTES_PREFIX}${itemId}`) || {};
    const revealed = await storage.get(REVEALED_KEY) || false;
    
    const accountIds = Object.keys(votes);
    if (accountIds.length === 0) return { votes: [], revealed };

    try {
        const query = accountIds.map(id => `accountId=${id}`).join('&');
        const response = await api.asApp().requestJira(route`/rest/api/3/user/bulk?${query}`);
        
        const users = response.ok ? await response.json() : [];
        const userMap = {};
        users.forEach(u => userMap[u.accountId] = u.displayName);

        const voteList = accountIds.map(id => ({
            accountId: id,
            displayName: userMap[id] || 'Unknown User',
            vote: revealed ? votes[id] : '?', // Hide vote value if not revealed
            hasVoted: true
        }));

        return { votes: voteList, revealed };
    } catch (err) {
        console.error('Error in getVotes:', err);
        return { votes: [], revealed };
    }
};

export const revealVotes = async () => {
    await storage.set(REVEALED_KEY, true);
    return true;
};
