import api, { route } from '@forge/api';

export const getStoryPointField = async () => {
    const response = await api.asUser().requestJira(route`/rest/api/3/field`);
    if (!response.ok) return null;
    
    const fields = await response.json();
    // Look for "Story points" or "Story Point Estimate"
    const field = fields.find(f => 
        f.name.toLowerCase() === 'story points' || 
        f.name.toLowerCase() === 'story point estimate'
    );
    return field ? field.id : null;
};

export const updateStoryPoints = async (req) => {
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
};
