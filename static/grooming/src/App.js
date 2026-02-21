import React, { useEffect, useState, useCallback } from 'react';
import { view } from '@forge/bridge';
import * as api from './services/api';
import BacklogView from './components/BacklogView/BacklogView';
import GroomingSession from './components/GroomingSession/GroomingSession';
import { useSessionPolling } from './hooks/useSessionPolling';
import './styles/Common.css';

function App() {
    const [backlog, setBacklog] = useState([]);
    const [fullBacklog, setFullBacklog] = useState([]);
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
    const [sessionUsers, setSessionUsers] = useState([]);
    const [isVotingOpen, setIsVotingOpen] = useState(false);

    const init = useCallback(async () => {
        try {
            const context = await view.getContext();
            setCurrentUserId(context.accountId);

            const [backlogData, groomingData, sessionActive, currentItemData, fieldId, smId, votingOpen] = await Promise.all([
                api.getBacklog(),
                api.getGroomingList(),
                api.isSessionActive(),
                api.getCurrentItem(),
                api.getStoryPointField(),
                api.getScrumMaster(),
                api.isVotingOpen()
            ]);
            
            setStoryPointFieldId(fieldId);
            setScrumMasterId(smId);
            setIsVotingOpen(!!votingOpen);
            const groomingItems = groomingData || [];
            const backlogItems = backlogData || [];
            
            setFullBacklog(backlogItems);
            const groomingIds = new Set(groomingItems.map(item => item.id));
            setBacklog(backlogItems.filter(item => !groomingIds.has(item.id)));
            setGroomingList(groomingItems);
            setIsSessionActive(!!sessionActive);
            setCurrentItem(currentItemData);

            if (currentItemData) {
                const result = await api.getVotes(currentItemData.id);
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

    useEffect(() => {
        const groomingIds = new Set(groomingList.map(item => item.id));
        setBacklog(fullBacklog.filter(item => !groomingIds.has(item.id)));
    }, [fullBacklog, groomingList]);

    useSessionPolling(
        isSessionActive, 
        currentItem, 
        groomingList, 
        setScrumMasterId, 
        setGroomingList, 
        setIsSessionActive, 
        setMyVote, 
        setVotes, 
        setVotesRevealed, 
        setCurrentItem,
        setSessionUsers,
        setIsVotingOpen
    );

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
        await api.updateGroomingList(newGrooming);
    };

    const startSession = async () => {
        if (groomingList.length === 0) return;
        await api.startSession();
        const smId = await api.getScrumMaster();
        setScrumMasterId(smId);
        setIsSessionActive(true);
        setMyVote(null);
        setVotesRevealed(false);
        setCurrentItem(groomingList[0]);
    };

    const endSession = async () => {
        await api.endSession();
        setIsSessionActive(false);
        setMyVote(null);
        setVotesRevealed(false);
    };

    const handleVote = async (value) => {
        if (!currentItem || currentUserId === scrumMasterId) return;
        setMyVote(value);
        await api.submitVote(currentItem.id, value);
    };

    const revealVotes = async () => {
        await api.revealVotes();
        setVotesRevealed(true);
    };

    const openVoting = async () => {
        await api.openVoting();
        setIsVotingOpen(true);
    };

    const selectNextItem = async (item) => {
        setCurrentItem(item);
        setMyVote(null);
        setVotes([]);
        setVotesRevealed(false);
        await api.setCurrentItem(item);
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
            await api.updateStoryPoints(currentItem.id, storyPointFieldId, points);
            
            const updatedList = groomingList.map(item => 
                item.id === currentItem.id ? { ...item, points } : item
            );
            
            setGroomingList(updatedList);
            await api.updateGroomingList(updatedList);

            try {
                await view.refresh();
            } catch (e) {
                console.warn('View refresh failed, but points were updated:', e);
            }

            const currentIndex = groomingList.findIndex(item => item.id === currentItem.id);
            if (currentIndex < groomingList.length - 1) {
                await selectNextItem(groomingList[currentIndex + 1]);
            }
        } catch (err) {
            alert(`Failed to update points: ${err.message}`);
        } finally {
            setUpdating(false);
        }
    };

    if (error) return <div style={{ padding: '1.25rem', color: 'red' }}>{error}</div>;
    if (loading) return <div style={{ padding: '1.25rem' }}>Loading...</div>;

    const isSM = currentUserId === scrumMasterId;

    if (isSessionActive && currentItem) {
        return (
            <GroomingSession 
                currentItem={currentItem}
                isSM={isSM}
                scrumMasterId={scrumMasterId}
                endSession={endSession}
                myVote={myVote}
                handleVote={handleVote}
                votes={votes}
                votesRevealed={votesRevealed}
                revealVotes={revealVotes}
                groomingList={groomingList}
                selectNextItem={selectNextItem}
                applyPoints={applyPoints}
                updating={updating}
                sessionUsers={sessionUsers}
                isVotingOpen={isVotingOpen}
                openVoting={openVoting}
            />
        );
    }

    return (
        <BacklogView 
            backlog={backlog}
            groomingList={groomingList}
            onDragEnd={onDragEnd}
            startSession={startSession}
        />
    );
}

export default App;
