import React from 'react';
import '../styles/Common.css';

/**
 * Renders the story-points badge when points are set.
 * Used in IssueCard and QueueSidebar to avoid duplicate markup.
 */
const PointsBadge = ({ points }) => {
    if (points === undefined || points === null) return null;
    return <div className="issue-points-badge">{points}</div>;
};

export default PointsBadge;
