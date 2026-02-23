import React from 'react';
import QueueSidebar from './QueueSidebar';
import UserPresenceList from './UserPresenceList';
import SessionHeader from './SessionHeader';
import CurrentItemCard from './CurrentItemCard';
import VotingArea from './VotingArea';
import ResultsArea from './ResultsArea';
import '../../styles/GroomingSession.css';
import '../../styles/Common.css';

const GroomingSession = ({ 
    currentItem, 
    isSM, 
    scrumMasterId,
    endSession, 
    myVote, 
    handleVote, 
    votes, 
    votesRevealed, 
    revealVotes, 
    groomingList, 
    selectNextItem, 
    applyPoints, 
    updating,
    sessionUsers,
    isVotingOpen,
    openVoting,
    siteUrl
}) => {
    // Filter out the Scrum Master from the team members list
    const teamMembers = (sessionUsers || []).filter(u => u.accountId !== scrumMasterId);

    const groupedVotes = votes.reduce((acc, v) => {
        if (!acc[v.vote]) acc[v.vote] = [];
        acc[v.vote].push(v.displayName);
        return acc;
    }, {});

    return (
        <div className="grooming-session-container">
            <SessionHeader isSM={isSM} endSession={endSession} />

            <div className="session-content">
                <div className="main-area">
                    <CurrentItemCard currentItem={currentItem} siteUrl={siteUrl} />

                    {!isSM && (
                        <VotingArea 
                            isVotingOpen={isVotingOpen} 
                            handleVote={handleVote} 
                            myVote={myVote} 
                        />
                    )}

                    <div className="votes-section">
                        <div className="votes-header">
                            <h3>{votesRevealed ? 'Results' : 'Votes'} ({votes.length})</h3>
                            <div className="header-actions">
                                {isSM && !isVotingOpen && !votesRevealed && (
                                    <button onClick={openVoting} className="btn-primary btn-voting">
                                        OPEN VOTING
                                    </button>
                                )}
                                {isSM && isVotingOpen && !votesRevealed && votes.length > 0 && (
                                    <button onClick={revealVotes} className="btn-success btn-voting btn-bold">
                                        REVEAL VOTES
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="vote-list">
                            {!votesRevealed ? (
                                <UserPresenceList users={teamMembers} votes={votes} hideHeader={true} />
                            ) : (
                                <ResultsArea 
                                    groupedVotes={groupedVotes} 
                                    isSM={isSM} 
                                    updating={updating} 
                                    applyPoints={applyPoints} 
                                />
                            )}
                        </div>
                    </div>
                </div>

                <div className="queue-sidebar">
                    <QueueSidebar 
                        groomingList={groomingList} 
                        currentItem={currentItem} 
                        isSM={isSM} 
                        onSelectItem={selectNextItem} 
                    />
                    <div className="presence-sidebar-section">
                        <h3>Team Members</h3>
                        <div className="presence-list-simple">
                            {teamMembers.length === 0 ? (
                                <p className="no-members-text">No other members online.</p>
                            ) : (
                                teamMembers.map(user => (
                                    <div key={user.accountId} className="presence-item-simple">
                                        <img src={user.avatarUrl} alt="" className="presence-avatar-small" />
                                        <span>{user.displayName}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GroomingSession;
