import { storage } from '@forge/api';
import { GROOMING_LIST_KEY, CURRENT_ITEM_KEY, REVEALED_KEY, VOTES_PREFIX } from './session';

export const getGroomingList = async () => {
    return await storage.get(GROOMING_LIST_KEY) || [];
};

export const updateGroomingList = async (req) => {
    const { list } = req.payload;
    await storage.set(GROOMING_LIST_KEY, list);
    return list;
};

export const getCurrentItem = async () => {
    return await storage.get(CURRENT_ITEM_KEY);
};

export const setCurrentItem = async (req) => {
    const { item } = req.payload;
    await storage.set(CURRENT_ITEM_KEY, item);
    await storage.set(REVEALED_KEY, false);
    await storage.delete(`${VOTES_PREFIX}${item.id}`);
    return item;
};
