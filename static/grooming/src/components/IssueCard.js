import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import '../styles/Common.css';

const IssueCard = ({ item, index }) => (
    <Draggable key={item.id} draggableId={item.id} index={index}>
        {(provided) => (
            <div 
                ref={provided.innerRef} 
                {...provided.draggableProps} 
                {...provided.dragHandleProps} 
                className="issue-card"
                style={{ ...provided.draggableProps.style }}
            >
                <div className="issue-summary">
                    <strong>{item.key}</strong>: {item.summary}
                </div>
                {item.points !== undefined && item.points !== null && (
                    <div className="issue-points-badge">
                        {item.points}
                    </div>
                )}
            </div>
        )}
    </Draggable>
);

export default IssueCard;
