import { storage } from '@forge/api';
import { GROOMING_LIST_KEY, CURRENT_ITEM_KEY, REVEALED_KEY, VOTES_PREFIX, VOTING_OPEN_KEY, getStorageKey, buildGroomingState, incrementSessionVersion } from './session';

export const getGroomingList = async (req) => {
    return await storage.get(getStorageKey(req, GROOMING_LIST_KEY)) || [];
};

export const updateGroomingList = async (req) => {
    const { list } = req.payload;
    const key = (base) => getStorageKey(req, base);

    // Safety: Strip descriptions before storing in Forge to avoid the 32KB limit
    const leanList = list.map(({ description, ...rest }) => rest);

    await storage.set(key(GROOMING_LIST_KEY), leanList);
    await incrementSessionVersion(req);
    return buildGroomingState(req);
};

export const getCurrentItem = async (req) => {
    return await storage.get(getStorageKey(req, CURRENT_ITEM_KEY));
};

export const setCurrentItem = async (req) => {
    const { item } = req.payload;
    const key = (base) => getStorageKey(req, base);

    // Since we now pre-load descriptions in memory on the frontend,
    // we only need to store the basic item info in Forge Storage.
    await storage.set(key(CURRENT_ITEM_KEY), item);
    await storage.set(key(REVEALED_KEY), false);
    await storage.set(key(VOTING_OPEN_KEY), false);
    await storage.delete(key(`${VOTES_PREFIX}${item.id}`));
    await incrementSessionVersion(req);
    return buildGroomingState(req);
};

export const isVotingOpen = async (req) => {
    return await storage.get(getStorageKey(req, VOTING_OPEN_KEY)) || false;
};

export const openVoting = async (req) => {
    await storage.set(getStorageKey(req, VOTING_OPEN_KEY), true);
    await incrementSessionVersion(req);
    return buildGroomingState(req);
};
