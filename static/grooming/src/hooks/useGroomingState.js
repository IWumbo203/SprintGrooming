import { useState, useEffect, useCallback, useRef } from 'react';
import { view } from '@forge/bridge';
import * as api from '../services/api';
import { useSessionPolling } from './useSessionPolling';

export const useGroomingState = () => {
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
    const [siteUrl, setSiteUrl] = useState('');

    const init = useCallback(async () => {
        try {
            const context = await view.getContext();
            setCurrentUserId(context.accountId);
            
            const params = new URLSearchParams(window.location.search);
            const hostUrl = params.get('xdm_e');
            const url = context.siteUrl || hostUrl || '';
            setSiteUrl(url);

            // Parallel load: Backlog (Master Data) + Current Session State (Consolidated)
            const [backlogResult, sessionState] = await Promise.all([
                api.getBacklog(),
                api.getGroomingState()
            ]);
            
            const backlogItems = backlogResult?.issues || [];
            const fieldId = backlogResult?.storyPointFieldId;
            setStoryPointFieldId(fieldId);
            setFullBacklog(backlogItems);

            if (sessionState) {
                const {
                    isSessionActive: serverActive,
                    currentItem: serverItem,
                    scrumMasterId: serverSmId,
                    groomingList: serverList,
                    sessionUsers: serverUsers,
                    isVotingOpen: serverVoting,
                    votes: serverVotes,
                    votesRevealed: serverRevealed
                } = sessionState;

                setScrumMasterId(serverSmId);
                setIsVotingOpen(!!serverVoting);
                setGroomingList(serverList || []);
                setIsSessionActive(!!serverActive);
                setSessionUsers(serverUsers || []);
                setVotes(serverVotes || []);
                setVotesRevealed(!!serverRevealed);
                
                // Use the map we just built to enrich the current item
                const issueMap = new Map(backlogItems.map(item => [item.id, item]));
                if (serverItem) {
                    const fullItem = issueMap.get(serverItem.id);
                    setCurrentItem(fullItem ? { ...serverItem, description: fullItem.description } : serverItem);
                }
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

    // Master map for O(1) description lookup
    const issueMap = new Map(fullBacklog.map(item => [item.id, item]));

    // Track last manual action time to avoid "race condition" jump-backs and for poll back-off
    const lastActionTime = useRef(0);

    // Ref for applyServerState so we can read current state without stale closures
    const stateRef = useRef({ isSessionActive, currentItem, groomingList });
    useEffect(() => {
        stateRef.current = { isSessionActive, currentItem, groomingList };
    }, [isSessionActive, currentItem, groomingList]);

    const updateCurrentItem = useCallback((serverItem) => {
        if (!serverItem) {
            setCurrentItem(null);
            return;
        }

        const fullItem = issueMap.get(serverItem.id);
        if (fullItem) {
            setCurrentItem({ ...serverItem, description: fullItem.description });
        } else {
            setCurrentItem(serverItem);
        }
    }, [fullBacklog]);

    /**
     * Single place to apply server state (from poll or from mutation response).
     * When fromPoll is true, uses the 4s "recent manual switch" guard for currentItem.
     * Enriches currentItem with description from local issueMap.
     */
    const applyServerState = useCallback((data, { fromPoll = false } = {}) => {
        if (!data) return;

        const {
            isSessionActive: serverSessionActive,
            currentItem: serverCurrentItem,
            scrumMasterId: serverSmId,
            groomingList: serverGroomingList,
            sessionUsers: serverUsers,
            isVotingOpen: serverVotingOpen,
            votes: serverVotes,
            votesRevealed: serverVotesRevealed
        } = data;

        setScrumMasterId(serverSmId);
        setSessionUsers(serverUsers || []);
        setIsVotingOpen(!!serverVotingOpen);
        setVotesRevealed(!!serverVotesRevealed);
        setVotes(serverVotes || []);

        if (JSON.stringify(serverGroomingList) !== JSON.stringify(stateRef.current.groomingList)) {
            setGroomingList(serverGroomingList || []);
        }

        if (!!serverSessionActive !== stateRef.current.isSessionActive) {
            setIsSessionActive(!!serverSessionActive);
            if (!serverSessionActive) {
                setMyVote(null);
                setVotes([]);
                setVotesRevealed(false);
            }
        }

        if (serverSessionActive && serverCurrentItem) {
            const localItemId = stateRef.current.currentItem?.id;
            const serverItemId = serverCurrentItem?.id;
            const isRecentlySwitched = (Date.now() - lastActionTime.current) < 4000;

            if (fromPoll && serverItemId === localItemId) return;
            if (fromPoll && isRecentlySwitched && serverItemId !== localItemId) return;

            setMyVote(null);
            updateCurrentItem(serverCurrentItem);
        } else if (serverSessionActive && !serverCurrentItem) {
            setCurrentItem(null);
            setMyVote(null);
        }
    }, [updateCurrentItem]);

    useSessionPolling(applyServerState, lastActionTime, isSessionActive);

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
        try {
            const state = await api.updateGroomingList(newGrooming);
            if (state) applyServerState(state, { fromPoll: false });
            lastActionTime.current = Date.now();
        } catch (err) {
            console.error('Failed to update grooming list:', err);
        }
    };

    const startSession = async () => {
        if (groomingList.length === 0) return;
        try {
            const state = await api.startSession();
            if (state) applyServerState(state, { fromPoll: false });
            lastActionTime.current = Date.now();
        } catch (err) {
            console.error('Failed to start session:', err);
        }
    };

    const endSession = async () => {
        try {
            const state = await api.endSession();
            if (state) applyServerState(state, { fromPoll: false });
            lastActionTime.current = Date.now();
        } catch (err) {
            console.error('Failed to end session:', err);
        }
    };

    const handleVote = async (value) => {
        if (!currentItem || currentUserId === scrumMasterId) return;
        setMyVote(value);
        try {
            const state = await api.submitVote(currentItem.id, value);
            if (state) applyServerState(state, { fromPoll: false });
            lastActionTime.current = Date.now();
        } catch (err) {
            console.error('Failed to submit vote:', err);
        }
    };

    const revealVotes = async () => {
        try {
            const state = await api.revealVotes();
            if (state) applyServerState(state, { fromPoll: false });
            lastActionTime.current = Date.now();
        } catch (err) {
            console.error('Failed to reveal votes:', err);
        }
    };

    const openVoting = async () => {
        try {
            const state = await api.openVoting();
            if (state) applyServerState(state, { fromPoll: false });
            lastActionTime.current = Date.now();
        } catch (err) {
            console.error('Failed to open voting:', err);
        }
    };

    const selectNextItem = async (item) => {
        lastActionTime.current = Date.now();
        updateCurrentItem(item);
        setMyVote(null);
        setVotes([]);
        setVotesRevealed(false);

        try {
            const state = await api.setCurrentItem(item);
            if (state) applyServerState(state, { fromPoll: false });
            lastActionTime.current = Date.now();
        } catch (err) {
            console.error('Failed to select next item:', err);
        }
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
            const state = await api.updateGroomingList(updatedList);
            if (state) applyServerState(state, { fromPoll: false });
            lastActionTime.current = Date.now();

            try {
                await view.refresh();
            } catch (e) {
                console.warn('View refresh failed:', e);
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

    return {
        state: {
            backlog,
            groomingList,
            loading,
            isSessionActive,
            currentItem,
            votes,
            votesRevealed,
            myVote,
            scrumMasterId,
            currentUserId,
            error,
            updating,
            sessionUsers,
            isVotingOpen,
            siteUrl
        },
        actions: {
            onDragEnd,
            startSession,
            endSession,
            handleVote,
            revealVotes,
            openVoting,
            selectNextItem,
            applyPoints
        }
    };
};
