import React from 'react';
import { router } from '@forge/bridge';
import '../../styles/GroomingSession.css';

const CurrentItemCard = ({ currentItem, siteUrl }) => {
    const extractTextFromADF = (node) => {
        if (!node) return '';
        if (node.type === 'text') return node.text || '';
        
        if (node.content && Array.isArray(node.content)) {
            const contentText = node.content.map(extractTextFromADF).join('');
            // Add newlines for block-level elements
            if (['paragraph', 'heading', 'listItem'].includes(node.type)) {
                return contentText + '\n';
            }
            return contentText;
        }
        return '';
    };

    const renderDescription = (description) => {
        if (!description) return <p style={{ color: '#666', fontStyle: 'italic' }}>No description provided.</p>;
        
        if (typeof description === 'object') {
            try {
                // If it's a top-level ADF doc
                if (description.type === 'doc' && Array.isArray(description.content)) {
                    const text = description.content.map(extractTextFromADF).join('');
                    return <p style={{ whiteSpace: 'pre-wrap' }}>{text.trim()}</p>;
                }
                // Fallback for other object structures
                return <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{JSON.stringify(description, null, 2)}</pre>;
            } catch (e) {
                return <p style={{ color: 'red' }}>Error rendering description.</p>;
            }
        }
        return <p style={{ whiteSpace: 'pre-wrap' }}>{description}</p>;
    };

    const handleOpenIssue = (e) => {
        e.preventDefault();
        const issueUrl = siteUrl ? `${siteUrl}/browse/${currentItem.key}` : `/browse/${currentItem.key}`;
        router.navigate(issueUrl);
    };

    const issueLink = siteUrl ? `${siteUrl}/browse/${currentItem.key}` : `/browse/${currentItem.key}`;

    return (
        <div className="current-item-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ color: '#666', fontSize: '0.9rem' }}>POINTING ON: {currentItem.key}</span>
                <a 
                    href={issueLink} 
                    onClick={handleOpenIssue}
                    className="open-issue-link"
                    title="Open issue in new tab"
                >
                    <img 
                        src="./assets/image-removebg-preview.png" 
                        alt="Open" 
                        style={{ width: '1.25rem', height: '1.25rem' }} 
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAWklEQVR4nGNgGFmAlYGB4T8DA8N/BvIBByD9n4GBgeE/A9VAKAH08B+Gf0pADf/p6D8GqhioYqCKgSoGqhhogK6U6v8MBP6To//BfwaGf0pAOnYvMTIAsX+JkQEAbOQYf0X7488AAAAASUVORK5CYII=';
                        }}
                    />
                </a>
            </div>
            <h2 style={{ marginTop: '0.3125rem', marginBottom: '1rem' }}>{currentItem.summary}</h2>
            <div className="description-area">
                {renderDescription(currentItem.description)}
            </div>
        </div>
    );
};

export default CurrentItemCard;
