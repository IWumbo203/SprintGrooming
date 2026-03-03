import api, { route } from '@forge/api';

/**
 * Returns true if the field name looks like a story points field (broad match for different sites).
 */
const isStoryPointFieldNameStrict = (name) => {
    if (!name || typeof name !== 'string') return false;
    const lower = name.toLowerCase();
    return lower.includes('story point') || lower.includes('point estimate') || lower === 'story points';
};

const isStoryPointFieldNameLoose = (name) => {
    if (!name || typeof name !== 'string') return false;
    const lower = name.toLowerCase();
    return lower === 'points' || lower === 'estimate';
};

export const getStoryPointField = async () => {
    const response = await api.asUser().requestJira(route`/rest/api/3/field`);
    if (!response.ok) return null;

    const fields = await response.json();
    const strict = fields.find(f => isStoryPointFieldNameStrict(f.name));
    if (strict) return strict.id;
    const loose = fields.find(f => isStoryPointFieldNameLoose(f.name));
    return loose ? loose.id : null;
};

/**
 * Builds a user-friendly message from Jira 400/403 error body (e.g. "field cannot be set", "not on screen").
 */
const parseStoryPointsError = (status, errorData) => {
    try {
        const body = JSON.parse(errorData);
        const errors = body.errors || {};
        const messages = body.errorMessages || [];
        const firstError = Object.values(errors)[0] || messages[0];
        if (firstError && typeof firstError === 'string') {
            if (firstError.toLowerCase().includes('cannot be set') ||
                firstError.toLowerCase().includes('not on the appropriate screen') ||
                firstError.toLowerCase().includes('unknown')) {
                return 'The Story points field is not on the edit screen for this issue in this project. Ask your Jira admin to add the field to the issue\'s edit screen.';
            }
            return firstError;
        }
    } catch (_) { /* ignore parse failure */ }
    return `Failed to update story points (${status}). ${errorData}`;
};

export const updateStoryPoints = async (req) => {
    const { issueId, fieldId, points } = req.payload;

    if (!issueId || !fieldId) {
        throw new Error('Missing issue or story points field.');
    }

    // Only update if the field is editable for this issue (on the appropriate screen).
    const editmetaRes = await api.asUser().requestJira(route`/rest/api/3/issue/${issueId}/editmeta`);
    if (!editmetaRes.ok) {
        const text = await editmetaRes.text();
        throw new Error(`Could not check editable fields: ${editmetaRes.status} ${text}`);
    }

    const editmeta = await editmetaRes.json();
    const editableFields = editmeta.fields || {};
    if (!Object.prototype.hasOwnProperty.call(editableFields, fieldId)) {
        throw new Error(
            'The Story points field is not on the edit screen for this issue in this project. Ask your Jira admin to add the field to the issue\'s edit screen.'
        );
    }

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
        throw new Error(parseStoryPointsError(response.status, errorData));
    }

    return true;
};
