import { storage } from '@forge/api';

export const GROOMING_LIST_KEY = 'grooming-list';
export const SESSION_ACTIVE_KEY = 'session-active';
export const CURRENT_ITEM_KEY = 'current-grooming-item';
export const SCRUM_MASTER_KEY = 'scrum-master-id';
export const REVEALED_KEY = 'votes-revealed';
export const VOTES_PREFIX = 'votes-';
export const VOTING_OPEN_KEY = 'voting-open';

export const isSessionActive = async () => {
    return await storage.get(SESSION_ACTIVE_KEY) || false;
};

export const startSession = async (req) => {
    const { accountId } = req.context;
    await storage.set(SESSION_ACTIVE_KEY, true);
    await storage.set(SCRUM_MASTER_KEY, accountId);
    await storage.set(REVEALED_KEY, false);
    await storage.set(VOTING_OPEN_KEY, false);
    
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
