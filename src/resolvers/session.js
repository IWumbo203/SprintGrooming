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
export const SESSION_VERSION_KEY = 'session-version';

const SESSION_DURATION = 7200000; // 2 hours in milliseconds

/**
 * Project key from the current module context (Jira project page).
 * Ensures grooming state and stories are isolated per project.
 */
export const getProjectKey = (req) => req?.context?.extension?.project?.key || 'default';

/**
 * Returns a storage key namespaced by project so each project has its own state.
 */
export const getStorageKey = (req, baseKey) => `project:${getProjectKey(req)}:${baseKey}`;

export const isSessionActive = async (req) => {
    const active = await storage.get(getStorageKey(req, SESSION_ACTIVE_KEY)) || false;
    if (!active) return false;

    const startTime = await storage.get(getStorageKey(req, LAST_ACTIVITY_KEY));
    if (startTime && (Date.now() - startTime > SESSION_DURATION)) {
        await endSession(req);
        return false;
    }

    return true;
};

/**
 * Returns the current session version (for lightweight poll). Does not run heartbeat.
 * Used so the client can compare to lastKnownVersion and only fetch full state when changed.
 */
export const getSessionVersion = async (req) => {
    const version = await storage.get(getStorageKey(req, SESSION_VERSION_KEY));
    return { version: version ?? 0 };
};

/**
 * Increment and persist session version. Call after any mutation that changes session state
 * so clients that poll getSessionVersion() know to refetch full state.
 */
export const incrementSessionVersion = async (req) => {
    const key = getStorageKey(req, SESSION_VERSION_KEY);
    const current = (await storage.get(key)) ?? 0;
    const next = current + 1;
    await storage.set(key, next);
    return next;
};

/**
 * Builds the full grooming state from storage. Optionally runs heartbeat when req is provided
 * so the calling user stays in presence. Used by getGroomingState and by mutating resolvers
 * so they can return full state and the client can skip redundant polls.
 * If the session has been active for more than SESSION_DURATION (2 hours), it is auto-ended
 * so any client (including non–scrum masters) sees a reset and is not locked out.
 */
export const buildGroomingState = async (req) => {
    if (req) {
        await heartbeat(req);
    }

    const key = (base) => getStorageKey(req, base);

    // Auto-end session after 2 hours so users are not locked out if the scrum master didn't end it
    const [isActive, sessionStartTime] = await Promise.all([
        storage.get(key(SESSION_ACTIVE_KEY)),
        storage.get(key(LAST_ACTIVITY_KEY))
    ]);
    if (isActive && sessionStartTime && (Date.now() - sessionStartTime > SESSION_DURATION)) {
        return endSession(req);
    }

    const [
        active,
        currentItem,
        scrumMasterId,
        groomingList,
        users,
        votingOpen,
        revealed,
        version
    ] = await Promise.all([
        storage.get(key(SESSION_ACTIVE_KEY)),
        storage.get(key(CURRENT_ITEM_KEY)),
        storage.get(key(SCRUM_MASTER_KEY)),
        storage.get(key(GROOMING_LIST_KEY)),
        getSessionUsers(req),
        storage.get(key(VOTING_OPEN_KEY)),
        storage.get(key(REVEALED_KEY)),
        storage.get(key(SESSION_VERSION_KEY))
    ]);

    let votes = [];
    if (active && currentItem) {
        const votesData = await storage.get(key(`${VOTES_PREFIX}${currentItem.id}`)) || {};
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
        votesRevealed: !!revealed,
        version: version ?? 0
    };
};

export const getGroomingState = async (req) => {
    return buildGroomingState(req);
};

export const startSession = async (req) => {
    const { accountId } = req.context;
    const now = Date.now();
    const key = (base) => getStorageKey(req, base);

    await storage.set(key(SESSION_ACTIVE_KEY), true);
    await storage.set(key(SCRUM_MASTER_KEY), accountId);
    await storage.set(key(REVEALED_KEY), false);
    await storage.set(key(VOTING_OPEN_KEY), false);
    await storage.set(key(LAST_ACTIVITY_KEY), now);

    const list = await storage.get(key(GROOMING_LIST_KEY)) || [];
    await Promise.all(list.map((item) => storage.delete(key(`${VOTES_PREFIX}${item.id}`))));

    if (list.length > 0) {
        await storage.set(key(CURRENT_ITEM_KEY), list[0]);
    }
    await incrementSessionVersion(req);
    return buildGroomingState(req);
};

export const endSession = async (req) => {
    const key = (base) => getStorageKey(req, base);

    await storage.set(key(SESSION_ACTIVE_KEY), false);
    await storage.delete(key(SCRUM_MASTER_KEY));
    await storage.delete(key(REVEALED_KEY));
    await storage.delete(key(LAST_ACTIVITY_KEY));
    await storage.set(key(VOTING_OPEN_KEY), false);

    const list = await storage.get(key(GROOMING_LIST_KEY)) || [];
    await Promise.all(list.map((item) => storage.delete(key(`${VOTES_PREFIX}${item.id}`))));

    await storage.delete(key(CURRENT_ITEM_KEY));
    await incrementSessionVersion(req);
    return buildGroomingState(req);
};

export const getScrumMaster = async (req) => {
    return await storage.get(getStorageKey(req, SCRUM_MASTER_KEY));
};
