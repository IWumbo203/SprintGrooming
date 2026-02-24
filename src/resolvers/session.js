import { storage } from '@forge/api';
import { heartbeat, getSessionUsers } from './presence';

export const GROOMING_LIST_KEY = 'grooming-list';
export const SESSION_ACTIVE_KEY = 'session-active';
export const CURRENT_ITEM_KEY = 'current-grooming-item';
export const SCRUM_MASTER_KEY = 'scrum-master-id';
export const REVEALED_KEY = 'votes-revealed';
export const VOTES_PREFIX = 'votes-';
export const VOTING_OPEN_KEY = 'voting-open';
export const LAST_ACTIVITY_KEY = 'session-start-time';

const SESSION_DURATION = 7200000; // 2 hours in milliseconds

export const isSessionActive = async () => {
    const active = await storage.get(SESSION_ACTIVE_KEY) || false;
    if (!active) return false;

    const startTime = await storage.get(LAST_ACTIVITY_KEY);
    if (startTime && (Date.now() - startTime > SESSION_DURATION)) {
        await endSession();
        return false;
    }

    return true;
};

/**
 * Builds the full grooming state from storage. Optionally runs heartbeat when req is provided
 * so the calling user stays in presence. Used by getGroomingState and by mutating resolvers
 * so they can return full state and the client can skip redundant polls.
 */
export const buildGroomingState = async (req) => {
    if (req) {
        await heartbeat(req);
    }

    const [
        active,
        currentItem,
        scrumMasterId,
        groomingList,
        users,
        votingOpen,
        revealed
    ] = await Promise.all([
        storage.get(SESSION_ACTIVE_KEY),
        storage.get(CURRENT_ITEM_KEY),
        storage.get(SCRUM_MASTER_KEY),
        storage.get(GROOMING_LIST_KEY),
        getSessionUsers(),
        storage.get(VOTING_OPEN_KEY),
        storage.get(REVEALED_KEY)
    ]);

    let votes = [];
    if (active && currentItem) {
        const votesData = await storage.get(`${VOTES_PREFIX}${currentItem.id}`) || {};
        const accountIds = Object.keys(votesData);
        votes = accountIds.map(id => {
            const voteData = votesData[id];
            const voteValue = typeof voteData === 'object' ? voteData.vote : voteData;
            const displayName = typeof voteData === 'object' ? voteData.displayName : 'Unknown User';
            return {
                accountId: id,
                displayName,
                vote: revealed ? voteValue : '?',
                hasVoted: true
            };
        });
    }

    return {
        isSessionActive: !!active,
        currentItem,
        scrumMasterId,
        groomingList: groomingList || [],
        sessionUsers: users || [],
        isVotingOpen: !!votingOpen,
        votes,
        votesRevealed: !!revealed
    };
};

export const getGroomingState = async (req) => {
    return buildGroomingState(req);
};

export const startSession = async (req) => {
    const { accountId } = req.context;
    const now = Date.now();
    await storage.set(SESSION_ACTIVE_KEY, true);
    await storage.set(SCRUM_MASTER_KEY, accountId);
    await storage.set(REVEALED_KEY, false);
    await storage.set(VOTING_OPEN_KEY, false);
    await storage.set(LAST_ACTIVITY_KEY, now);
    
    const list = await storage.get(GROOMING_LIST_KEY) || [];
    for (const item of list) {
        await storage.delete(`${VOTES_PREFIX}${item.id}`);
    }

    if (list.length > 0) {
        await storage.set(CURRENT_ITEM_KEY, list[0]);
    }
    return buildGroomingState(req);
};

export const endSession = async (req) => {
    await storage.set(SESSION_ACTIVE_KEY, false);
    await storage.delete(SCRUM_MASTER_KEY);
    await storage.delete(REVEALED_KEY);
    await storage.delete(LAST_ACTIVITY_KEY);
    await storage.set(VOTING_OPEN_KEY, false);
    
    const list = await storage.get(GROOMING_LIST_KEY) || [];
    for (const item of list) {
        await storage.delete(`${VOTES_PREFIX}${item.id}`);
    }

    await storage.delete(CURRENT_ITEM_KEY);
    return buildGroomingState(req);
};

export const getScrumMaster = async () => {
    return await storage.get(SCRUM_MASTER_KEY);
};
