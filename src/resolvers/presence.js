import api, { route, storage } from '@forge/api';
import { getStorageKey } from './session';
import { incrementSessionVersion } from './session';

export const SESSION_USERS_KEY = 'session-active-users';

/**
 * Updates presence for the current user and cleans stale entries.
 * Uses a single key with full read-modify-write; for very large sessions
 * consider per-user keys (e.g. session-users:{accountId}) and aggregate in getSessionUsers.
 */
export const heartbeat = async (req) => {
    const { accountId } = req.context;
    const now = Date.now();
    const key = getStorageKey(req, SESSION_USERS_KEY);

    // Get current active users (per-project)
    let users = await storage.get(key) || {};
    
    // Fetch user details if not already in the session cache or if it's been a while
    if (!users[accountId] || (now - users[accountId].lastFetch > 3600000)) { // Refresh profile every hour
        const response = await api.asApp().requestJira(route`/rest/api/3/user?accountId=${accountId}`);
        if (response.ok) {
            const user = await response.json();
            users[accountId] = {
                accountId,
                displayName: user.displayName,
                avatarUrl: user.avatarUrls['48x48'],
                lastSeen: now,
                lastFetch: now
            };
        }
    } else {
        users[accountId].lastSeen = now;
    }

    // Clean up old users (inactive for more than 180 seconds)
    const activeThreshold = now - 180000;
    const cleanedUsers = {};
    Object.keys(users).forEach(id => {
        if (users[id].lastSeen > activeThreshold) {
            cleanedUsers[id] = users[id];
        }
    });

    await storage.set(key, cleanedUsers);
    await incrementSessionVersion(req);
    return true;
};

export const getSessionUsers = async (req) => {
    const key = getStorageKey(req, SESSION_USERS_KEY);
    const users = await storage.get(key) || {};
    const now = Date.now();
    const activeThreshold = now - 180000;

    // Return only currently active ones
    return Object.values(users).filter(u => u.lastSeen > activeThreshold);
};
