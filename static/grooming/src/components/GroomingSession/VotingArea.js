import React from 'react';
import PointButton from './PointButton';
import { FIBONACCI } from '../../constants';
import '../../styles/GroomingSession.css';

const VotingArea = ({ isVotingOpen, handleVote, myVote }) => (
    <div className="voting-area">
        <h3 className="voting-title">
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
            <div className="voting-locked-notice">
                Please wait for the Scrum Master to open voting for this item.
            </div>
        )}
    </div>
);

export default VotingArea;
