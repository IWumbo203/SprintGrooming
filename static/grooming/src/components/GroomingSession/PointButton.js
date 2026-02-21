import React from 'react';
import '../../styles/GroomingSession.css';
import '../../styles/Common.css';

const PointButton = ({ val, onClick, isSelected }) => {
    let fontSize = '1.5rem';
    if (val === '☕') fontSize = '1.75rem';
    else if (val === '∞') fontSize = '2.5rem';

    return (
        <button
            onClick={() => onClick(val)}
            className={`point-button ${isSelected ? 'selected' : 'unselected'}`}
            style={{ fontSize }}
        >
            {val}
        </button>
    );
};

export default PointButton;
