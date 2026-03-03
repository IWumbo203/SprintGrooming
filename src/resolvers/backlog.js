import api, { route } from '@forge/api';

/** Max backlog issues to fetch in one request (no pagination). */
const BACKLOG_MAX_RESULTS = 100;

/**
 * Maps a Jira API issue object to our app's issue shape.
 * @param {object} issue - Raw issue from Jira search
 * @param {string|null} storyPointFieldId - Custom field ID for story points
 * @returns {object} Normalized issue for UI
 */
function mapIssue(issue, storyPointFieldId) {
    const fields = issue.fields || {};
    return {
        id: issue.id,
        key: issue.key,
        summary: fields.summary,
        description: fields.description,
        type: fields.issuetype?.name,
        priority: fields.priority?.name || 'Medium',
        points: storyPointFieldId ? fields[storyPointFieldId] : undefined,
        labels: fields.labels || []
    };
}

/**
 * Discovers custom field IDs for story points and sprint (by name).
 * Uses only /rest/api/3/field — no board/sprint scopes.
 */
async function discoverFieldIds() {
    const response = await api.asUser().requestJira(route`/rest/api/3/field`);
    if (!response.ok) return { storyPointFieldId: null, sprintFieldId: null };
    const fields = await response.json();
    let storyPointFieldId = null;
    let storyPointFieldIdFallback = null;
    let sprintFieldId = null;
    let sprintFieldIdFallback = null;
    for (const f of fields) {
        const name = (f.name || '').toLowerCase();
        if (!storyPointFieldId && (name.includes('story point') || name.includes('point estimate') || name === 'story points')) {
            storyPointFieldId = f.id;
        }
        if (!storyPointFieldIdFallback && (name === 'points' || name === 'estimate')) {
            storyPointFieldIdFallback = f.id;
        }
        if (name.includes('sprint')) {
            if (name === 'sprint' || name === 'sprint(s)') {
                sprintFieldId = f.id;
                break;
            }
            if (!sprintFieldIdFallback) sprintFieldIdFallback = f.id;
        }
    }
    if (!sprintFieldId && sprintFieldIdFallback) sprintFieldId = sprintFieldIdFallback;
    if (!storyPointFieldId && storyPointFieldIdFallback) storyPointFieldId = storyPointFieldIdFallback;
    return { storyPointFieldId, sprintFieldId };
}

/**
 * Runs JQL search via /rest/api/3/search/jql (new API; no startAt).
 * Body: jql, fields, maxResults, optional nextPageToken.
 * Returns { issues, total, nextPageToken }.
 */
async function searchJqlPost(jql, requestFields, storyPointFieldId, maxResults = 100, nextPageToken = null) {
    const body = {
        jql,
        fields: requestFields,
        maxResults
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const response = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const err = await response.text();
        throw new Error(`JQL search failed: ${response.status} ${err}`);
    }
    const data = await response.json();
    const issues = (data.issues || []).map(issue => mapIssue(issue, storyPointFieldId));
    const total = data.totalIssueCount ?? data.total ?? issues.length;
    return { issues, total, nextPageToken: data.nextPageToken || null };
}

/**
 * Runs a single page of JQL search (raw issues). Uses /rest/api/3/search/jql with optional nextPageToken.
 * @returns {Promise<{ issues: object[], total: number, nextPageToken: string|null }>}
 */
async function searchJqlRawPage(jql, requestFields, maxResults = 100, nextPageToken = null) {
    const body = {
        jql,
        fields: requestFields,
        maxResults
    };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const response = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) return { issues: [], total: 0, nextPageToken: null };
    const data = await response.json();
    const issues = data.issues || [];
    const total = data.totalIssueCount ?? data.total ?? 0;
    return { issues, total, nextPageToken: data.nextPageToken || null };
}

/**
 * Fetches all pages of a JQL search (raw issues). Paginates until no nextPageToken.
 * Use when you need every matching issue (e.g. all issues in all open sprints).
 */
async function searchJqlRawAllPages(jql, requestFields, maxResultsPerPage = 100) {
    const allIssues = [];
    let nextPageToken = null;
    let total = 0;
    do {
        const result = await searchJqlRawPage(jql, requestFields, maxResultsPerPage, nextPageToken);
        allIssues.push(...(result.issues || []));
        total = result.total;
        nextPageToken = result.nextPageToken || null;
    } while (nextPageToken);
    return { issues: allIssues, total };
}

/**
 * Extracts sprint id/name/state from an issue's sprint field value.
 * Value can be a single object or array of objects (multi-sprint).
 * @returns {object|null} { id, name, state } or null
 */
function getSprintFromIssue(issue, sprintFieldId) {
    if (!sprintFieldId || !issue.fields) return null;
    const raw = issue.fields[sprintFieldId];
    if (raw === undefined || raw === null) return null;
    const arr = Array.isArray(raw) ? raw : [raw];
    const first = arr.find(s => s && (s.id !== undefined || s.name || typeof s === 'object'));
    if (!first) {
        if (typeof raw === 'number') return { id: raw, name: `Sprint ${raw}`, state: 'active' };
        if (typeof raw === 'string') return { id: 0, name: raw, state: 'active' };
        return null;
    }
    const id = first.id !== undefined ? first.id : 0;
    const name = first.name != null ? String(first.name) : `Sprint ${id}`;
    const state = (first.state || '').toLowerCase() || 'active';
    return { id, name, state };
}

/**
 * Fetches all issues in any sprint (active and future) via JQL, groups by sprint, returns one entry per sprint.
 * Uses "sprint is not EMPTY" first so we include future/not-started sprints; openSprints() only returns the active sprint.
 * Sorts active first, then future by id.
 * @returns {Array<{ id: number, name: string, issues: object[] }>}
 */
async function getAllSprintIssues(projectKey, requestFields, storyPointFieldId, sprintFieldId) {
    const fieldsWithSprint = sprintFieldId
        ? [...requestFields, sprintFieldId].filter(Boolean)
        : requestFields;
    // Prefer broad query so we get active AND future sprints; openSprints() returns only the started sprint.
    const jqlCandidates = [
        `project = "${projectKey}" AND statusCategory != Done AND sprint is not EMPTY`,
        `project = "${projectKey}" AND statusCategory != Done AND sprint in openSprints()`
    ];
    // Fetch all pages so we get issues from every sprint, not just the first 100/200.
    let rawIssues = [];
    for (const jql of jqlCandidates) {
        const result = await searchJqlRawAllPages(jql, fieldsWithSprint, 100);
        rawIssues = result.issues || [];
        if (rawIssues.length > 0) break;
    }
    if (rawIssues.length === 0) return [];
    const bySprint = new Map();
    for (const issue of rawIssues) {
        const sprint = sprintFieldId ? getSprintFromIssue(issue, sprintFieldId) : null;
        const key = sprint ? sprint.id : 0;
        if (!bySprint.has(key)) {
            bySprint.set(key, {
                id: sprint?.id ?? 0,
                name: sprint?.name ?? 'Sprint',
                state: (sprint?.state || 'active').toLowerCase(),
                issues: []
            });
        }
        bySprint.get(key).issues.push(mapIssue(issue, storyPointFieldId));
    }
    const sections = Array.from(bySprint.values());
    const activeFirst = sections.filter(s => s.state === 'active').sort((a, b) => a.id - b.id);
    const futureThen = sections.filter(s => s.state === 'future').sort((a, b) => a.id - b.id);
    const ordered = [...activeFirst, ...futureThen];
    return ordered.map(s => ({ id: s.id, name: s.name, issues: s.issues }));
}

/**
 * Main backlog resolver: returns all sprints (one per open sprint) and full backlog. No pagination.
 */
export const getBacklog = async (req) => {
    const { context } = req;
    const projectKey = context.extension.project.key;

    const { storyPointFieldId, sprintFieldId } = await discoverFieldIds();
    const requestFields = ['summary', 'issuetype', 'priority', 'description', 'labels'];
    if (storyPointFieldId) requestFields.push(storyPointFieldId);

    const baseJql = `project = "${projectKey}" AND statusCategory != Done`;
    const sprints = await getAllSprintIssues(projectKey, requestFields, storyPointFieldId, sprintFieldId);

    const backlogJql = `${baseJql} AND sprint is EMPTY`;
    const backlogResult = await searchJqlPost(
        backlogJql,
        requestFields,
        storyPointFieldId,
        BACKLOG_MAX_RESULTS,
        null
    );

    return {
        sprints,
        backlog: backlogResult.issues,
        storyPointFieldId
    };
};
