import React from 'react';
import '../../styles/GroomingSession.css';

const ResultsArea = ({ groupedVotes, isSM, updating, applyPoints }) => {
    return Object.entries(groupedVotes).sort((a, b) => {
        const order = {'☕': 998, '∞': 999};
        const valA = order[a[0]] || parseInt(a[0]);
        const valB = order[b[0]] || parseInt(b[0]);
        return valA - valB;
    }).map(([point, names]) => {
        let summaryFontSize = '1.5rem';
        if (point === '☕') summaryFontSize = '1.5rem';
        else if (point === '∞') summaryFontSize = '2rem';

        return (
            <div key={point} className="revealed-vote-row">
                <div className="revealed-vote-badge" style={{ fontSize: summaryFontSize }}>
                    {point}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>
                        {names.length} {names.length === 1 ? 'vote' : 'votes'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#444' }}>
                        {names.join(', ')}
                    </div>
                </div>
                {isSM && (
                    <button 
                        disabled={updating || isNaN(parseFloat(point))}
                        onClick={() => applyPoints(point)}
                        className="btn-primary"
                        style={{ 
                            padding: '0.5rem 1rem', 
                            background: isNaN(parseFloat(point)) ? '#ccc' : '#0052cc',
                            cursor: (updating || isNaN(parseFloat(point))) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {updating ? 'Updating...' : 'APPLY POINT'}
                    </button>
                )}
            </div>
        );
    });
};

export default ResultsArea;
