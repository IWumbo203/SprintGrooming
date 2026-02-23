import React from 'react';
import '../../styles/GroomingSession.css';
import '../../styles/Common.css';

const PointButton = ({ val, onClick, isSelected }) => {
    let extraClass = '';
    if (val === '☕') extraClass = 'point-button-tea';
    else if (val === '∞') extraClass = 'point-button-infinity';

    return (
        <button
            onClick={() => onClick(val)}
            className={`point-button ${isSelected ? 'selected' : 'unselected'} ${extraClass}`}
        >
            {val}
        </button>
    );
};

export default PointButton;
