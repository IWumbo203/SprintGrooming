import { storage } from '@forge/api';
import { GROOMING_LIST_KEY, CURRENT_ITEM_KEY, REVEALED_KEY, VOTES_PREFIX, VOTING_OPEN_KEY, buildGroomingState } from './session';

export const getGroomingList = async () => {
    return await storage.get(GROOMING_LIST_KEY) || [];
};

export const updateGroomingList = async (req) => {
    const { list } = req.payload;
    
    // Safety: Strip descriptions before storing in Forge to avoid the 32KB limit
    const leanList = list.map(({ description, ...rest }) => rest);
    
    await storage.set(GROOMING_LIST_KEY, leanList);
    return buildGroomingState(req);
};

export const getCurrentItem = async () => {
    return await storage.get(CURRENT_ITEM_KEY);
};

export const setCurrentItem = async (req) => {
    const { item } = req.payload;
    
    // Since we now pre-load descriptions in memory on the frontend, 
    // we only need to store the basic item info in Forge Storage.
    await storage.set(CURRENT_ITEM_KEY, item);
    await storage.set(REVEALED_KEY, false);
    await storage.set(VOTING_OPEN_KEY, false);
    await storage.delete(`${VOTES_PREFIX}${item.id}`);
    return buildGroomingState(req);
};

export const isVotingOpen = async () => {
    return await storage.get(VOTING_OPEN_KEY) || false;
};

export const openVoting = async (req) => {
    await storage.set(VOTING_OPEN_KEY, true);
    return buildGroomingState(req);
};
