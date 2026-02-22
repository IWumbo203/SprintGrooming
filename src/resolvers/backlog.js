import api, { route } from '@forge/api';

export const getBacklog = async (req) => {
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
            fields: ['summary', 'issuetype', 'priority', 'description', storyPointFieldId]
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
        description: issue.fields.description,
        type: issue.fields.issuetype.name,
        priority: issue.fields.priority?.name || 'Medium',
        points: issue.fields[storyPointFieldId]
    }));
};
