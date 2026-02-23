import api, { route, storage } from '@forge/api';

const SESSION_USERS_KEY = 'session-active-users';

export const heartbeat = async (req) => {
    const { accountId } = req.context;
    const now = Date.now();
    
    // Get current active users
    let users = await storage.get(SESSION_USERS_KEY) || {};
    
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

    await storage.set(SESSION_USERS_KEY, cleanedUsers);
    return true;
};

export const getSessionUsers = async () => {
    const users = await storage.get(SESSION_USERS_KEY) || {};
    const now = Date.now();
    const activeThreshold = now - 180000;

    // Return only currently active ones
    return Object.values(users).filter(u => u.lastSeen > activeThreshold);
};
