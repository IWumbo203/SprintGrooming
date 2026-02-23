import React from 'react';
import '../../styles/GroomingSession.css';

const ResultsArea = ({ groupedVotes, isSM, updating, applyPoints }) => {
    return Object.entries(groupedVotes).sort((a, b) => {
        const order = {'☕': 998, '∞': 999};
        const valA = order[a[0]] || parseInt(a[0]);
        const valB = order[b[0]] || parseInt(b[0]);
        return valA - valB;
    }).map(([point, names]) => {
        let extraBadgeClass = '';
        if (point === '☕') extraBadgeClass = 'revealed-vote-badge-tea';
        else if (point === '∞') extraBadgeClass = 'revealed-vote-badge-infinity';

        return (
            <div key={point} className="revealed-vote-row">
                <div className={`revealed-vote-badge ${extraBadgeClass}`}>
                    {point}
                </div>
                <div className="revealed-vote-details">
                    <div className="revealed-vote-count">
                        {names.length} {names.length === 1 ? 'vote' : 'votes'}
                    </div>
                    <div className="revealed-vote-names">
                        {names.join(', ')}
                    </div>
                </div>
                {isSM && (
                    <button 
                        disabled={updating || isNaN(parseFloat(point))}
                        onClick={() => applyPoints(point)}
                        className="btn-primary btn-apply-point"
                    >
                        {updating ? 'Updating...' : 'APPLY POINT'}
                    </button>
                )}
            </div>
        );
    });
};

export default ResultsArea;
