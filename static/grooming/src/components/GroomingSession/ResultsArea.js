import React, { useState, useMemo } from 'react';
import '../../styles/GroomingSession.css';

const sortOrder = (point) => {
    const order = { '☕': 998, '∞': 999 };
    return order[point] ?? parseInt(point, 10);
};

const MIN_POINTS = 0;
const MAX_POINTS = 21;

/**
 * Compute average of numeric votes only (excludes ☕ and ∞).
 * Returns { average, hasNumeric }.
 */
function useNumericAverage(groupedVotes) {
    return useMemo(() => {
        let sum = 0;
        let count = 0;
        Object.entries(groupedVotes).forEach(([point, names]) => {
            const num = parseFloat(point);
            if (!Number.isNaN(num)) {
                sum += num * names.length;
                count += names.length;
            }
        });
        if (count === 0) return { average: null, hasNumeric: false };
        return { average: sum / count, hasNumeric: true };
    }, [groupedVotes]);
}

const ResultsArea = ({ groupedVotes, isSM, updating, applyPoints }) => {
    const entries = Object.entries(groupedVotes).sort((a, b) => sortOrder(a[0]) - sortOrder(b[0]));
    const { average, hasNumeric } = useNumericAverage(groupedVotes);

    // Selected story points (0–21); start at round(average), then +/- adjust as much as SM wants
    const defaultRounded = hasNumeric
        ? Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.round(average)))
        : MIN_POINTS;
    const [roundedValue, setRoundedValue] = useState(defaultRounded);

    // When average changes (e.g. new vote), reset selection to rounded average (still clamped)
    React.useEffect(() => {
        if (hasNumeric)
            setRoundedValue((prev) =>
                Math.max(MIN_POINTS, Math.min(MAX_POINTS, Math.round(average)))
            );
    }, [average, hasNumeric]);

    const handleDecrement = () => {
        setRoundedValue((prev) => Math.max(MIN_POINTS, prev - 1));
    };
    const handleIncrement = () => {
        setRoundedValue((prev) => Math.min(MAX_POINTS, prev + 1));
    };
    const handleApplyRounded = () => {
        if (roundedValue != null) applyPoints(String(roundedValue));
    };

    return (
        <div className="results-area">
            {/* Vote chips: who voted for what so devs can see names per value */}
            <div className="revealed-vote-chips">
                {entries.map(([point, names]) => {
                    let extraClass = '';
                    if (point === '☕') extraClass = 'revealed-vote-badge-tea';
                    else if (point === '∞') extraClass = 'revealed-vote-badge-infinity';
                    return (
                        <div key={point} className={`revealed-vote-chip ${extraClass}`}>
                            <span className="revealed-vote-chip-value">{point}</span>
                            <span className="revealed-vote-chip-names">{names.join(', ')}</span>
                        </div>
                    );
                })}
            </div>

            {/* True average shown; +/- let SM select floor or ceil as story points */}
            {hasNumeric && (
                <div className="results-average-row">
                    <span className="results-average-label">Average: {average.toFixed(1)}</span>
                    <div className="results-average-box-wrap">
                        <button
                            type="button"
                            className="results-average-btn results-average-btn-minus"
                            onClick={handleDecrement}
                            disabled={updating || roundedValue <= MIN_POINTS}
                            title="Decrease (min 0)"
                            aria-label="Decrease points"
                        >
                            −
                        </button>
                        <div className="results-average-box">
                            <span className="results-average-rounded">{roundedValue}</span>
                        </div>
                        <button
                            type="button"
                            className="results-average-btn results-average-btn-plus"
                            onClick={handleIncrement}
                            disabled={updating || roundedValue >= MAX_POINTS}
                            title="Increase (max 21)"
                            aria-label="Increase points"
                        >
                            +
                        </button>
                    </div>
                    {isSM && (
                        <button
                            type="button"
                            disabled={updating}
                            onClick={handleApplyRounded}
                            className="btn-primary btn-apply-point"
                        >
                            {updating ? 'Updating...' : 'APPLY'}
                        </button>
                    )}
                </div>
            )}

            {/* Legacy per-value Apply: optional compact row for non-numeric (☕, ∞) only */}
            {entries.some(([point]) => point === '☕' || point === '∞') && isSM && (
                <div className="revealed-vote-special-apply">
                    {entries.filter(([point]) => point === '☕' || point === '∞').map(([point]) => (
                        <button
                            key={point}
                            type="button"
                            disabled={updating}
                            onClick={() => applyPoints(point)}
                            className="btn-primary btn-apply-point btn-apply-point-small"
                        >
                            Apply {point}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ResultsArea;
