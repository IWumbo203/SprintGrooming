import React from 'react';
import '../../styles/GroomingSession.css';
import '../../styles/Common.css';

const QueueSidebar = ({ groomingList, currentItem, isSM, onSelectItem }) => (
    <div>
        <h3>Queue</h3>
        {groomingList.map((item) => (
            <div 
                key={item.id} 
                onClick={() => isSM && onSelectItem(item)}
                className={`queue-item ${currentItem.id === item.id ? 'active' : 'inactive'}`}
                style={{ cursor: isSM ? 'pointer' : 'default' }}
            >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.625rem' }}>
                    <strong>{item.key}</strong>
                    <div style={{ fontSize: '0.8rem' }}>{item.summary}</div>
                </div>
                {item.points !== undefined && item.points !== null && (
                    <div className="issue-points-badge">
                        {item.points}
                    </div>
                )}
            </div>
        ))}
    </div>
);

export default QueueSidebar;
