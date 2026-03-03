import React from 'react';
import { getPointExtraClass } from '../../constants';
import '../../styles/GroomingSession.css';
import '../../styles/Common.css';

const PointButton = ({ val, onClick, isSelected }) => {
    const extraClass = getPointExtraClass(val, 'point-button');

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
