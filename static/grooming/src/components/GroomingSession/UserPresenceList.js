import React from 'react';
import '../../styles/GroomingSession.css';

const UserPresenceList = ({ users, votes, hideHeader }) => {
    // Create a map for quick lookup of who has voted
    const votedMap = new Set(votes.map(v => v.accountId));

    if (users.length === 0) {
        return <p className="no-users-text">No team members online.</p>;
    }

    return (
        <div className="presence-container">
            {!hideHeader && <h3>Team Members</h3>}
            <div className="presence-list">
                {users.map(user => (
                    <div key={user.accountId} className="presence-item">
                        <img 
                            src={user.avatarUrl} 
                            alt={user.displayName} 
                            className="presence-avatar"
                        />
                        <div className="presence-info">
                            <span className="presence-name">{user.displayName}</span>
                        </div>
                        <div className={`presence-check ${votedMap.has(user.accountId) ? 'voted' : 'not-voted'}`}>
                            {votedMap.has(user.accountId) ? '✔️' : '　'}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserPresenceList;
