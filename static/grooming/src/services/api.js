import { invoke } from '@forge/bridge';

export const getBacklog = () => invoke('getBacklog');
export const getGroomingList = () => invoke('getGroomingList');
export const updateGroomingList = (list) => invoke('updateGroomingList', { list });
export const isSessionActive = () => invoke('isSessionActive');
export const startSession = () => invoke('startSession');
export const endSession = () => invoke('endSession');
export const getCurrentItem = () => invoke('getCurrentItem');
export const setCurrentItem = (item) => invoke('setCurrentItem', { item });
export const submitVote = (itemId, vote) => invoke('submitVote', { itemId, vote });
export const getVotes = (itemId) => invoke('getVotes', { itemId });
export const revealVotes = () => invoke('revealVotes');
export const getScrumMaster = () => invoke('getScrumMaster');
export const getStoryPointField = () => invoke('getStoryPointField');
export const updateStoryPoints = (issueId, fieldId, points) => invoke('updateStoryPoints', { issueId, fieldId, points });
