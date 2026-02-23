import React from 'react';
import { useGroomingState } from './hooks/useGroomingState';
import BacklogView from './components/BacklogView/BacklogView';
import GroomingSession from './components/GroomingSession/GroomingSession';
import './styles/Common.css';

function App() {
    const { state, actions } = useGroomingState();

    if (state.error) return <div className="error-message">{state.error}</div>;
    if (state.loading) return <div className="status-message">Loading...</div>;

    const isSM = state.currentUserId === state.scrumMasterId;

    if (state.isSessionActive && state.currentItem) {
        return (
            <GroomingSession 
                {...state}
                {...actions}
                isSM={isSM}
            />
        );
    }

    return (
        <BacklogView 
            backlog={state.backlog}
            groomingList={state.groomingList}
            onDragEnd={actions.onDragEnd}
            startSession={actions.startSession}
        />
    );
}

export default App;
