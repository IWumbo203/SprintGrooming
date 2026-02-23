import { invoke } from '@forge/bridge';

export const getBacklog = () => invoke('getBacklog');
export const getGroomingList = () => invoke('getGroomingList');
export const updateGroomingList = (list) => invoke('updateGroomingList', { list });
export const getGroomingState = () => invoke('getGroomingState');
export const startSession = () => invoke('startSession');
export const endSession = () => invoke('endSession');
export const setCurrentItem = (item) => invoke('setCurrentItem', { item });
export const openVoting = () => invoke('openVoting');
export const submitVote = (itemId, vote) => invoke('submitVote', { itemId, vote });
export const revealVotes = () => invoke('revealVotes');
export const getStoryPointField = () => invoke('getStoryPointField');
export const updateStoryPoints = (issueId, fieldId, points) => invoke('updateStoryPoints', { issueId, fieldId, points });
