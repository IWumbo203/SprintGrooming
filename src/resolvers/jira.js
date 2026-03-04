import api, { route } from '@forge/api';

export const getStoryPointField = async () => {
    const response = await api.asUser().requestJira(route`/rest/api/3/field`);
    if (!response.ok) return null;

    const fields = await response.json();
    return fields.find(f => f.name.toLowerCase() === 'story point estimate')?.id;
};

export const updateStoryPoints = async (req) => {
    const { issueId, fieldId, points } = req.payload;

    const numericPoints = parseFloat(points);
    if (isNaN(numericPoints)) {
        throw new Error('Story points must be a valid number.');
    }

    if (!issueId || !fieldId) {
        throw new Error('Missing issue or story points field.');
    }

    const editmetaRes = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}/editmeta`);
    const editmeta = await editmetaRes.json();
    
    if (!editmeta.fields || !editmeta.fields[fieldId]) {
        throw new Error('Story points field is not editable or not on the screen.');
    }

    const response = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}`, {
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fields: {
                [fieldId]: numericPoints
            }
        })
    });

    if (!response.ok) {
        throw new Error(`Failed to update story points`);
    }

    return true;
};
