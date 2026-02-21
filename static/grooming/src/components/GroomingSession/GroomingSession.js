import React from 'react';
import PointButton from './PointButton';
import QueueSidebar from './QueueSidebar';
import UserPresenceList from './UserPresenceList';
import { FIBONACCI } from '../../constants';
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
    openVoting
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
            <div className="session-header">
                <div>
                    {isSM && <span className="sm-badge">SCRUM MASTER MODE</span>}
                </div>
                {isSM && (
                    <button className="btn-danger" style={{ padding: '0.5rem 1rem' }} onClick={endSession}>
                        End Session
                    </button>
                )}
            </div>

            <div className="session-content">
                <div className="main-area">
                    <div className="current-item-card">
                        <span style={{ color: '#666', fontSize: '0.9rem' }}>POINTING ON: {currentItem.key}</span>
                        <h2 style={{ marginTop: '0.3125rem' }}>{currentItem.summary}</h2>
                    </div>

                    {!isSM && (
                        <div style={{ marginTop: '1.875rem' }}>
                            <h3 style={{ marginBottom: '15px' }}>
                                {isVotingOpen ? 'Select your Story Points' : 'Voting is currently locked'}
                            </h3>
                            {isVotingOpen ? (
                                <div className="point-grid">
                                    {FIBONACCI.map(val => (
                                        <PointButton 
                                            key={val} 
                                            val={val} 
                                            onClick={handleVote} 
                                            isSelected={myVote === val} 
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div style={{ background: '#f4f5f7', padding: '1.25rem', borderRadius: '0.5rem', border: '1px dashed #ccc', textAlign: 'center', color: '#666' }}>
                                    Please wait for the Scrum Master to open voting for this item.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="votes-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>{votesRevealed ? 'Results' : 'Votes'} ({votes.length})</h3>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                {isSM && !isVotingOpen && !votesRevealed && (
                                    <button onClick={openVoting} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                                        OPEN VOTING
                                    </button>
                                )}
                                {isSM && isVotingOpen && !votesRevealed && votes.length > 0 && (
                                    <button onClick={revealVotes} className="btn-success" style={{ padding: '0.5rem 1rem', fontWeight: 'bold' }}>
                                        REVEAL VOTES
                                    </button>
                                )}
                            </div>
                        </div>
                        
                        <div className="vote-list">
                            {!votesRevealed ? (
                                <UserPresenceList users={teamMembers} votes={votes} hideHeader={true} />
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
                                        <div key={point} className="revealed-vote-row">
                                            <div className="revealed-vote-badge" style={{ fontSize: summaryFontSize }}>
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
                                                    className="btn-primary"
                                                    style={{ 
                                                        padding: '0.5rem 1rem', 
                                                        background: isNaN(parseFloat(point)) ? '#ccc' : '#0052cc',
                                                        cursor: (updating || isNaN(parseFloat(point))) ? 'not-allowed' : 'pointer'
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
                                <p style={{ fontSize: '0.8rem', color: '#666' }}>No other members online.</p>
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
