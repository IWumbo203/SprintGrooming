import React, { useEffect, useState, useCallback } from 'react';
import { invoke, view } from '@forge/bridge';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const FIBONACCI = ['1', '2', '3', '5', '8', '13', '21', '☕', '∞'];

function App() {
    const [backlog, setBacklog] = useState([]);
    const [fullBacklog, setFullBacklog] = useState([]); // Keep the original backlog from Jira
    const [groomingList, setGroomingList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [votes, setVotes] = useState([]); 
    const [votesRevealed, setVotesRevealed] = useState(false);
    const [myVote, setMyVote] = useState(null);
    const [scrumMasterId, setScrumMasterId] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const [error, setError] = useState(null);
    const [storyPointFieldId, setStoryPointFieldId] = useState(null);
    const [updating, setUpdating] = useState(false);

    const init = useCallback(async () => {
        try {
            const context = await view.getContext();
            setCurrentUserId(context.accountId);

            const [backlogData, groomingData, sessionActive, currentItemData, fieldId, smId] = await Promise.all([
                invoke('getBacklog'),
                invoke('getGroomingList'),
                invoke('isSessionActive'),
                invoke('getCurrentItem'),
                invoke('getStoryPointField'),
                invoke('getScrumMaster')
            ]);
            
            setStoryPointFieldId(fieldId);
            setScrumMasterId(smId);
            const groomingItems = groomingData || [];
            const backlogItems = backlogData || [];
            
            setFullBacklog(backlogItems);
            const groomingIds = new Set(groomingItems.map(item => item.id));
            setBacklog(backlogItems.filter(item => !groomingIds.has(item.id)));
            setGroomingList(groomingItems);
            setIsSessionActive(!!sessionActive);
            setCurrentItem(currentItemData);

            if (currentItemData) {
                const result = await invoke('getVotes', { itemId: currentItemData.id });
                setVotes(result.votes || []);
                setVotesRevealed(result.revealed);
            }
        } catch (err) {
            console.error('Initialization error:', err);
            setError(`Failed to initialize: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        init();
    }, [init]);

    // Sync filtered backlog whenever fullBacklog or groomingList changes
    useEffect(() => {
        const groomingIds = new Set(groomingList.map(item => item.id));
        setBacklog(fullBacklog.filter(item => !groomingIds.has(item.id)));
    }, [fullBacklog, groomingList]);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const [sessionActive, currentItemData, smId, groomingData] = await Promise.all([
                    invoke('isSessionActive'),
                    invoke('getCurrentItem'),
                    invoke('getScrumMaster'),
                    invoke('getGroomingList')
                ]);
                
                setScrumMasterId(smId);
                
                // Update grooming list if changed (to catch SM movements or points applied)
                if (JSON.stringify(groomingData) !== JSON.stringify(groomingList)) {
                    setGroomingList(groomingData || []);
                }
                
                if (!!sessionActive !== isSessionActive) {
                    setIsSessionActive(!!sessionActive);
                    if (!sessionActive) {
                        setMyVote(null);
                        setVotes([]);
                        setVotesRevealed(false);
                    }
                }

                if (sessionActive) {
                    if (currentItemData && (!currentItem || currentItemData.id !== currentItem.id)) {
                        setMyVote(null);
                        setCurrentItem(currentItemData);
                    }
                    
                    if (currentItemData) {
                        const result = await invoke('getVotes', { itemId: currentItemData.id });
                        setVotes(result.votes || []);
                        setVotesRevealed(result.revealed);
                    }
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [isSessionActive, currentItem, groomingList]);

    const onDragEnd = async (result) => {
        const { source, destination } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId) return;

        let newBacklog = Array.from(backlog);
        let newGrooming = Array.from(groomingList);

        if (source.droppableId === 'backlog' && destination.droppableId === 'grooming') {
            const [removed] = newBacklog.splice(source.index, 1);
            newGrooming.splice(destination.index, 0, removed);
        } else if (source.droppableId === 'grooming' && destination.droppableId === 'backlog') {
            const [removed] = newGrooming.splice(source.index, 1);
            newBacklog.splice(destination.index, 0, removed);
        }

        setBacklog(newBacklog);
        setGroomingList(newGrooming);
        await invoke('updateGroomingList', { list: newGrooming });
    };

    const startSession = async () => {
        if (groomingList.length === 0) return;
        await invoke('startSession');
        const smId = await invoke('getScrumMaster');
        setScrumMasterId(smId);
        setIsSessionActive(true);
        setMyVote(null);
        setVotesRevealed(false);
        setCurrentItem(groomingList[0]);
    };

    const endSession = async () => {
        await invoke('endSession');
        setIsSessionActive(false);
        setMyVote(null);
        setVotesRevealed(false);
    };

    const handleVote = async (value) => {
        if (!currentItem || currentUserId === scrumMasterId) return;
        setMyVote(value);
        await invoke('submitVote', { itemId: currentItem.id, vote: value });
    };

    const revealVotes = async () => {
        await invoke('revealVotes');
        setVotesRevealed(true);
    };

    const selectNextItem = async (item) => {
        setCurrentItem(item);
        setMyVote(null);
        setVotes([]);
        setVotesRevealed(false);
        await invoke('setCurrentItem', { item });
    };

    const applyPoints = async (points) => {
        if (!currentItem || !storyPointFieldId) {
            alert("Story Point field not found.");
            return;
        }
        
        if (isNaN(parseFloat(points))) {
            alert("Cannot apply non-numeric points to Jira.");
            return;
        }

        setUpdating(true);
        try {
            await invoke('updateStoryPoints', { 
                issueId: currentItem.id, 
                fieldId: storyPointFieldId, 
                points 
            });
            
            const updatedList = groomingList.map(item => 
                item.id === currentItem.id ? { ...item, points } : item
            );
            
            setGroomingList(updatedList);
            await invoke('updateGroomingList', { list: updatedList });

            // Refresh the Jira host page to show updated points in the backlog/issue view
            await view.refresh();

            const currentIndex = groomingList.findIndex(item => item.id === currentItem.id);
            if (currentIndex < groomingList.length - 1) {
                await selectNextItem(groomingList[currentIndex + 1]);
            } else {
                alert("Grooming complete!");
            }
        } catch (err) {
            alert(`Failed to update points: ${err.message}`);
        } finally {
            setUpdating(false);
        }
    };

    const isSM = currentUserId === scrumMasterId;

    const groupedVotes = votes.reduce((acc, v) => {
        if (!acc[v.vote]) acc[v.vote] = [];
        acc[v.vote].push(v.displayName);
        return acc;
    }, {});

    const renderCard = (item, index) => (
        <Draggable key={item.id} draggableId={item.id} index={index}>
            {(provided) => (
                <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{
                    padding: '0.625rem', margin: '0 0 0.5rem 0', background: 'white', border: '0.0625rem solid #ccc', borderRadius: '0.25rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    ...provided.draggableProps.style
                }}>
                    <div style={{ flex: 1, marginRight: '0.625rem' }}>
                        <strong>{item.key}</strong>: {item.summary}
                    </div>
                    {item.points !== undefined && item.points !== null && (
                        <div style={{
                            background: '#f4f5f7',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '1rem',
                            border: '0.0625rem solid #999',
                            fontSize: '0.75rem',
                            color: '#333',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}>
                            {item.points}
                        </div>
                    )}
                </div>
            )}
        </Draggable>
    );

    if (error) return <div style={{ padding: '1.25rem', color: 'red' }}>{error}</div>;
    if (loading) return <div style={{ padding: '1.25rem' }}>Loading...</div>;

    if (isSessionActive && currentItem) {
        return (
            <div style={{ padding: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div>{isSM && <span style={{ background: '#e3f2fd', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', color: '#0052cc', fontWeight: 'bold' }}>SCRUM MASTER MODE</span>}</div>
                    <button 
                        style={{ padding: '0.5rem 1rem', background: '#de350b', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}
                        onClick={endSession}
                    >End Session</button>
                </div>

                <div style={{ display: 'flex', gap: '1.875rem' }}>
                    <div style={{ flex: 2 }}>
                        <div style={{ background: '#f4f5f7', padding: '20px', borderRadius: '0.5rem', borderLeft: '0.3125rem solid #0052cc' }}>
                            <span style={{ color: '#666', fontSize: '0.9rem' }}>POINTING ON: {currentItem.key}</span>
                            <h2 style={{ marginTop: '0.3125rem' }}>{currentItem.summary}</h2>
                        </div>

                        {!isSM && (
                            <div style={{ marginTop: '1.875rem' }}>
                                <h3 style={{ marginBottom: '15px' }}>Select your Story Points</h3>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {FIBONACCI.map(val => {
                                        let fontSize = '1.5rem';
                                        if (val === '☕') fontSize = '1.75rem';
                                        else if (val === '∞') fontSize = '2.5rem';

                                        return (
                                            <button
                                                key={val}
                                                onClick={() => handleVote(val)}
                                                style={{
                                                    width: '3.75rem', height: '5rem', fontSize: fontSize, cursor: 'pointer',
                                                    borderRadius: '0.5rem', border: '0.125rem solid #0052cc',
                                                    backgroundColor: myVote === val ? '#0052cc' : 'white',
                                                    color: myVote === val ? 'white' : '#0052cc',
                                                    transition: 'all 0.2s',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                {val}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div style={{ marginTop: '40px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3>Votes ({votes.length})</h3>
                                {isSM && !votesRevealed && votes.length > 0 && (
                                    <button 
                                        onClick={revealVotes}
                                        style={{ padding: '0.5rem 1rem', background: '#36b37e', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold' }}
                                    >REVEAL VOTES</button>
                                )}
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '10px' }}>
                                {votes.length === 0 ? (
                                    <p style={{ color: '#666' }}>No votes cast yet.</p>
                                ) : !votesRevealed ? (
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {votes.map(v => (
                                            <div key={v.accountId} style={{ padding: '1rem', background: '#ebecf0', borderRadius: '0.5rem', textAlign: 'center', minWidth: '5rem' }}>
                                                <div style={{ fontSize: '1.5rem' }}>✅</div>
                                                <div style={{ fontSize: '0.75rem', color: '#666' }}>{v.displayName}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    Object.entries(groupedVotes).sort((a, b) => {
                                        const order = {'☕': 998, '∞': 999};
                                        const valA = order[a[0]] || parseInt(a[0]);
                                        const valB = order[b[0]] || parseInt(b[0]);
                                        return valA - valB;
                                    }).map(([point, names]) => {
                                        let summaryFontSize = '1.5rem';
                                        if (point === '☕') summaryFontSize = '1.5rem';
                                        else if (point === '∞') summaryFontSize = '2rem';

                                        return (
                                            <div key={point} style={{ 
                                                display: 'flex', alignItems: 'center', background: '#f4f5f7', 
                                                padding: '1rem', borderRadius: '0.5rem', border: '0.0625rem solid #ddd' 
                                            }}>
                                                <div style={{ 
                                                    width: '3.75rem', height: '3.75rem', background: '#0052cc', color: 'white',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: summaryFontSize, fontWeight: 'bold', borderRadius: '0.25rem', marginRight: '1rem'
                                                }}>
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
                                                        style={{ 
                                                            padding: '0.5rem 1rem', background: isNaN(parseFloat(point)) ? '#ccc' : '#0052cc', color: 'white', 
                                                            border: 'none', borderRadius: '0.25rem', cursor: (updating || isNaN(parseFloat(point))) ? 'not-allowed' : 'pointer'
                                                        }}
                                                    >
                                                        {updating ? 'Updating...' : 'APPLY POINT'}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ flex: 1, borderLeft: '0.0625rem solid #ddd', paddingLeft: '1.25rem' }}>
                        <h3>Queue</h3>
                        {groomingList.map((item, idx) => (
                            <div 
                                key={item.id} 
                                onClick={() => isSM && selectNextItem(item)}
                                style={{
                                    padding: '0.625rem', marginBottom: '0.625rem', borderRadius: '0.25rem', cursor: isSM ? 'pointer' : 'default',
                                    border: `0.0625rem solid ${currentItem.id === item.id ? '#0052cc' : '#ccc'}`,
                                    background: currentItem.id === item.id ? '#e3f2fd' : 'white',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}
                            >
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.625rem' }}>
                                    <strong>{item.key}</strong>
                                    <div style={{ fontSize: '0.8rem' }}>{item.summary}</div>
                                </div>
                                {item.points !== undefined && item.points !== null && (
                                    <div style={{
                                        background: '#f4f5f7',
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '1rem',
                                        border: '0.0625rem solid #999',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {item.points}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: '0.625rem' }}>
            <div style={{ display: 'flex', gap: '1.25rem' }}>
                <DragDropContext onDragEnd={onDragEnd}>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: '0.625rem' }}>Backlog</h3>
                        <Droppable droppableId="backlog">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} style={{ background: '#f4f5f7', padding: '0.625rem', minHeight: '25rem', borderRadius: '0.25rem' }}>
                                    {backlog.map((item, index) => renderCard(item, index))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </div>

                    <div style={{ flex: 1 }}>
                        <h3 style={{ marginBottom: '0.625rem' }}>Grooming Selection</h3>
                        <Droppable droppableId="grooming">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} style={{ background: '#ebecf0', padding: '0.625rem', minHeight: '25rem', borderRadius: '0.25rem' }}>
                                    {groomingList.map((item, index) => renderCard(item, index))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                        <button 
                            onClick={startSession}
                            disabled={groomingList.length === 0}
                            style={{ 
                                marginTop: '1.25rem', padding: '0.625rem', width: '100%',
                                backgroundColor: groomingList.length === 0 ? '#f4f5f7' : '#0052cc', 
                                color: groomingList.length === 0 ? '#a5adba' : 'white', 
                                border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            Start Session
                        </button>
                    </div>
                </DragDropContext>
            </div>
        </div>
    );
}

export default App;
