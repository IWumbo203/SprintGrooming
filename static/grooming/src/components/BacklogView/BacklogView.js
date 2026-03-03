import React from 'react';
import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import IssueCard from '../IssueCard';
import '../../styles/BacklogView.css';
import '../../styles/Common.css';

const DroppableSection = ({ droppableId, title, issues, minHeight = true }) => (
    <div className="backlog-section">
        <h4 className="backlog-section-title">{title}</h4>
        <Droppable droppableId={droppableId}>
            {(provided) => (
                <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`droppable-area ${minHeight ? 'droppable-section' : ''}`}
                >
                    {issues.map((item, index) => (
                        <IssueCard key={item.id} item={item} index={index} />
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
    </div>
);

const BacklogView = ({
    backlog,
    sprints,
    groomingList,
    onDragEnd,
    startSession,
    labelFilter,
    onLabelFilterChange
}) => {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="backlog-container">
                <div className="backlog-column backlog-column-left">
                    <div className="backlog-column-header">
                        <h3 className="column-title">Backlog &amp; Sprints</h3>
                        <div className="backlog-label-search">
                            <input
                                type="text"
                                className="label-search-input"
                                placeholder="Filter by label (e.g. Ready-For-Grooming)"
                                value={labelFilter || ''}
                                onChange={(e) => onLabelFilterChange && onLabelFilterChange(e.target.value)}
                                aria-label="Filter backlog by label"
                            />
                        </div>
                    </div>

                    {(sprints || []).map((sprint) => (
                        <DroppableSection
                            key={sprint.id}
                            droppableId={`sprint-${sprint.id}`}
                            title={sprint.name}
                            issues={sprint.issues || []}
                        />
                    ))}

                    <div className="backlog-section">
                        <h4 className="backlog-section-title">Backlog</h4>
                        <Droppable droppableId="backlog">
                            {(provided) => (
                                <div
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    className="droppable-area droppable-section"
                                >
                                    {backlog.map((item, index) => (
                                        <IssueCard key={item.id} item={item} index={index} />
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>
                </div>

                <div className="backlog-column">
                    <h3 className="column-title">Grooming Selection</h3>
                    <Droppable droppableId="grooming">
                        {(provided) => (
                            <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={`droppable-area grooming-droppable ${groomingList.length === 0 ? 'grooming-droppable--empty' : ''}`}
                            >
                                {groomingList.length === 0 && (
                                    <p className="grooming-droppable-empty-hint" aria-hidden="true">
                                        Drag and drop stories here
                                    </p>
                                )}
                                {groomingList.map((item, index) => (
                                    <IssueCard key={item.id} item={item} index={index} />
                                ))}
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
