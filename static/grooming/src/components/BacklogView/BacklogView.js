import React from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import IssueCard from '../IssueCard';
import '../../styles/BacklogView.css';
import '../../styles/Common.css';

const BacklogView = ({ backlog, groomingList, onDragEnd, startSession }) => {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="backlog-container">
                <div className="backlog-column">
                    <h3 style={{ marginBottom: '0.625rem' }}>Backlog</h3>
                    <Droppable droppableId="backlog">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="droppable-area">
                                {backlog.map((item, index) => <IssueCard key={item.id} item={item} index={index} />)}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </div>

                <div className="backlog-column">
                    <h3 style={{ marginBottom: '0.625rem' }}>Grooming Selection</h3>
                    <Droppable droppableId="grooming">
                        {(provided) => (
                            <div {...provided.droppableProps} ref={provided.innerRef} className="droppable-area grooming-droppable">
                                {groomingList.map((item, index) => <IssueCard key={item.id} item={item} index={index} />)}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                    <button 
                        onClick={startSession}
                        disabled={groomingList.length === 0}
                        className="btn-primary start-session-btn"
                    >
                        Start Session
                    </button>
                    <p className="sm-notice-text">Only the Scrum Master should press the button</p>
                </div>
            </div>
        </DragDropContext>
    );
};

export default BacklogView;
