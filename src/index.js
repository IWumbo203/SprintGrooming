import Resolver from '@forge/resolver';
import api, { route, storage } from '@forge/api';

const resolver = new Resolver();

const GROOMING_LIST_KEY = 'grooming-list';
const SESSION_ACTIVE_KEY = 'session-active';

const CURRENT_ITEM_KEY = 'current-grooming-item';
const VOTES_PREFIX = 'votes-';

const SCRUM_MASTER_KEY = 'scrum-master-id';
const REVEALED_KEY = 'votes-revealed';

resolver.define('getBacklog', async (req) => {
    const { context } = req;
    const projectKey = context.extension.project.key;

    // First, find the story point field ID
    const fieldResponse = await api.asUser().requestJira(route`/rest/api/3/field`);
    let storyPointFieldId = 'customfield_10016'; // Default fallback
    if (fieldResponse.ok) {
        const fields = await fieldResponse.json();
        const field = fields.find(f => 
            f.name.toLowerCase() === 'story points' || 
            f.name.toLowerCase() === 'story point estimate'
        );
        if (field) storyPointFieldId = field.id;
    }

    const jql = `project = "${projectKey}" AND statusCategory != Done AND sprint is EMPTY`;
    
    const response = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jql: jql,
            fields: ['summary', 'issuetype', 'priority', storyPointFieldId]
        })
    });
    
    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch backlog: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    return data.issues.map(issue => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        type: issue.fields.issuetype.name,
        priority: issue.fields.priority?.name || 'Medium',
        points: issue.fields[storyPointFieldId]
    }));
});

resolver.define('getGroomingList', async () => {
    return await storage.get(GROOMING_LIST_KEY) || [];
});

resolver.define('updateGroomingList', async (req) => {
    const { list } = req.payload;
    await storage.set(GROOMING_LIST_KEY, list);
    return list;
});

resolver.define('isSessionActive', async () => {
    return await storage.get(SESSION_ACTIVE_KEY) || false;
});

resolver.define('startSession', async (req) => {
    const { accountId } = req.context;
    await storage.set(SESSION_ACTIVE_KEY, true);
    await storage.set(SCRUM_MASTER_KEY, accountId);
    await storage.set(REVEALED_KEY, false);
    
    const list = await storage.get(GROOMING_LIST_KEY) || [];
    for (const item of list) {
        await storage.delete(`${VOTES_PREFIX}${item.id}`);
    }

    if (list.length > 0) {
        await storage.set(CURRENT_ITEM_KEY, list[0]);
    }
    return true;
});

resolver.define('endSession', async () => {
    await storage.set(SESSION_ACTIVE_KEY, false);
    await storage.delete(SCRUM_MASTER_KEY);
    await storage.delete(REVEALED_KEY);
    
    const list = await storage.get(GROOMING_LIST_KEY) || [];
    for (const item of list) {
        await storage.delete(`${VOTES_PREFIX}${item.id}`);
    }

    await storage.delete(CURRENT_ITEM_KEY);
    return false;
});

resolver.define('getCurrentItem', async () => {
    return await storage.get(CURRENT_ITEM_KEY);
});

resolver.define('setCurrentItem', async (req) => {
    const { item } = req.payload;
    await storage.set(CURRENT_ITEM_KEY, item);
    await storage.set(REVEALED_KEY, false);
    await storage.delete(`${VOTES_PREFIX}${item.id}`);
    return item;
});

resolver.define('submitVote', async (req) => {
    const { itemId, vote } = req.payload;
    const { accountId } = req.context;
    
    // Scrum master cannot vote
    const smId = await storage.get(SCRUM_MASTER_KEY);
    if (accountId === smId) throw new Error('Scrum Master cannot vote');

    const votesKey = `${VOTES_PREFIX}${itemId}`;
    const votes = await storage.get(votesKey) || {};
    
    votes[accountId] = vote;
    await storage.set(votesKey, votes);
    return votes;
});

resolver.define('getVotes', async (req) => {
    const { itemId } = req.payload;
    const votes = await storage.get(`${VOTES_PREFIX}${itemId}`) || {};
    const revealed = await storage.get(REVEALED_KEY) || false;
    
    const accountIds = Object.keys(votes);
    if (accountIds.length === 0) return { votes: [], revealed };

    try {
        const query = accountIds.map(id => `accountId=${id}`).join('&');
        const response = await api.asApp().requestJira(route`/rest/api/3/user/bulk?${query}`);
        
        const users = response.ok ? await response.json() : [];
        const userMap = {};
        users.forEach(u => userMap[u.accountId] = u.displayName);

        const voteList = accountIds.map(id => ({
            accountId: id,
            displayName: userMap[id] || 'Unknown User',
            vote: revealed ? votes[id] : '?', // Hide vote value if not revealed
            hasVoted: true
        }));

        return { votes: voteList, revealed };
    } catch (err) {
        console.error('Error in getVotes:', err);
        return { votes: [], revealed };
    }
});

resolver.define('revealVotes', async () => {
    await storage.set(REVEALED_KEY, true);
    return true;
});

resolver.define('getScrumMaster', async () => {
    return await storage.get(SCRUM_MASTER_KEY);
});

resolver.define('getStoryPointField', async () => {
    const response = await api.asUser().requestJira(route`/rest/api/3/field`);
    if (!response.ok) return null;
    
    const fields = await response.json();
    // Look for "Story points" or "Story Point Estimate"
    const field = fields.find(f => 
        f.name.toLowerCase() === 'story points' || 
        f.name.toLowerCase() === 'story point estimate'
    );
    return field ? field.id : null;
});

resolver.define('updateStoryPoints', async (req) => {
    const { issueId, fieldId, points } = req.payload;
    
    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}`, {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                [fieldId]: parseFloat(points)
            }
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update story points: ${response.status} ${errorData}`);
    }
    
    return true;
});

export const handler = resolver.getDefinitions();

