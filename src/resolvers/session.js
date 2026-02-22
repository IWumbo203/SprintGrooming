import { storage } from '@forge/api';

export const GROOMING_LIST_KEY = 'grooming-list';
export const SESSION_ACTIVE_KEY = 'session-active';
export const CURRENT_ITEM_KEY = 'current-grooming-item';
export const SCRUM_MASTER_KEY = 'scrum-master-id';
export const REVEALED_KEY = 'votes-revealed';
export const VOTES_PREFIX = 'votes-';
export const VOTING_OPEN_KEY = 'voting-open';
export const LAST_ACTIVITY_KEY = 'session-start-time';

const SESSION_DURATION = 7200000; // 2 hours in milliseconds

export const updateActivity = async () => {
    // No longer used for idle tracking, but kept as empty for compatibility if called
};

export const isSessionActive = async () => {
    const active = await storage.get(SESSION_ACTIVE_KEY) || false;
    if (!active) return false;

    const startTime = await storage.get(LAST_ACTIVITY_KEY);
    if (startTime && (Date.now() - startTime > SESSION_DURATION)) {
        console.log('Session expired (2 hour limit reached). Automatically ending.');
        await endSession();
        return false;
    }

    return true;
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
    return true;
};

export const endSession = async () => {
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
    return false;
};

export const getScrumMaster = async () => {
    return await storage.get(SCRUM_MASTER_KEY);
};
