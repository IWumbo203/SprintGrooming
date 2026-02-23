import React from 'react';
import '../../styles/GroomingSession.css';

const SessionHeader = ({ isSM, endSession }) => (
    <div className="session-header">
        <div>
            {isSM && <span className="sm-badge">SCRUM MASTER MODE</span>}
        </div>
        {isSM && (
            <button className="btn-danger btn-header" onClick={endSession}>
                End Session
            </button>
        )}
    </div>
);

export default SessionHeader;
