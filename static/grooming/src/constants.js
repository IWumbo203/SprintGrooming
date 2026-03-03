export const FIBONACCI = ['1', '2', '3', '5', '8', '13', '21', '☕', '∞'];

/**
 * Returns the extra CSS class suffix for special point values (☕ tea, ∞ infinity).
 * @param {string} point - Vote/point value (e.g. '1', '☕', '∞').
 * @param {string} prefix - Class name prefix (e.g. 'point-button', 'revealed-vote-badge').
 * @returns {string} Full class name like 'point-button-tea' or '' for numeric points.
 */
export const getPointExtraClass = (point, prefix) => {
    if (point === '☕') return `${prefix}-tea`;
    if (point === '∞') return `${prefix}-infinity`;
    return '';
};
