import React from 'react';
import '../../styles/GroomingSession.css';
import '../../styles/Common.css';

const QueueSidebar = ({ groomingList, currentItem, isSM, onSelectItem }) => (
    <div>
        {groomingList.map((item) => (
            <div 
                key={item.id} 
                onClick={() => isSM && onSelectItem(item)}
                className={`queue-item ${currentItem.id === item.id ? 'active' : 'inactive'} ${isSM ? 'queue-item-sm' : ''}`}
            >
                <div className="queue-item-info">
                    <strong>{item.key}</strong>
                    <div className="queue-item-summary">{item.summary}</div>
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
