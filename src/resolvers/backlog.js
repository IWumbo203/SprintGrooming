import api, { route } from '@forge/api';

export const getBacklog = async (req) => {
    const { context } = req;
    const projectKey = context.extension.project.key;

    // Discover story points field by name (no hardcoded ID — varies by site).
    const fieldResponse = await api.asUser().requestJira(route`/rest/api/3/field`);
    let storyPointFieldId = null;
    if (fieldResponse.ok) {
        const fields = await fieldResponse.json();
        const field = fields.find(f => {
            const name = (f.name || '').toLowerCase();
            return name.includes('story point') || name.includes('point estimate');
        });
        if (field) storyPointFieldId = field.id;
    }

    const requestFields = ['summary', 'issuetype', 'priority', 'description', 'labels'];
    if (storyPointFieldId) requestFields.push(storyPointFieldId);

    const jql = `project = "${projectKey}" AND statusCategory != Done AND sprint is EMPTY`;

    const response = await api.asUser().requestJira(route`/rest/api/3/search/jql`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            jql: jql,
            fields: requestFields
        })
    });
    
    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to fetch backlog: ${response.status} ${errorData}`);
    }

    const data = await response.json();
    const issues = data.issues.map(issue => ({
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary,
        description: issue.fields.description,
        type: issue.fields.issuetype.name,
        priority: issue.fields.priority?.name || 'Medium',
        points: storyPointFieldId ? issue.fields[storyPointFieldId] : undefined,
        labels: issue.fields.labels || []
    }));

    return { issues, storyPointFieldId };
};
