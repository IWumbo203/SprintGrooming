import React from 'react';
import { router } from '@forge/bridge';
import ReactMarkdown from 'react-markdown';
import '../../styles/GroomingSession.css';

const CurrentItemCard = ({ currentItem, siteUrl }) => {
    const extractTextFromADF = (node) => {
        if (!node) return '';
        if (node.type === 'text') {
            let text = node.text || '';
            // Basic Markdown-like formatting for text nodes (Bold/Italic)
            if (node.marks) {
                node.marks.forEach(mark => {
                    if (mark.type === 'strong') text = `**${text}**`;
                    if (mark.type === 'em') text = `_${text}_`;
                    if (mark.type === 'code') text = `\`${text}\``;
                });
            }
            return text;
        }
        
        if (node.content && Array.isArray(node.content)) {
            const contentText = node.content.map(extractTextFromADF).join('');
            
            // Handle block elements by adding newlines or Markdown-like prefixes
            switch (node.type) {
                case 'paragraph':
                    return contentText + '\n\n';
                case 'heading':
                    const level = node.attrs?.level || 1;
                    return '#'.repeat(level) + ' ' + contentText + '\n\n';
                case 'bulletList':
                    return contentText;
                case 'orderedList':
                    return contentText;
                case 'listItem':
                    return '• ' + contentText.trim() + '\n';
                case 'blockquote':
                    return '> ' + contentText.trim() + '\n\n';
                default:
                    return contentText;
            }
        }
        return '';
    };

    const renderDescription = (description) => {
        if (!description) return <p className="empty-description">No description provided.</p>;
        if (description === 'Loading description...') return <p className="status-message">{description}</p>;
        
        let markdown = '';
        if (typeof description === 'object') {
            try {
                // If it's a top-level ADF doc
                if (description.type === 'doc' && Array.isArray(description.content)) {
                    markdown = description.content.map(extractTextFromADF).join('');
                } else {
                    // Fallback for other object structures
                    return <pre className="pre-wrap-text font-inherit">{JSON.stringify(description, null, 2)}</pre>;
                }
            } catch (e) {
                return <p className="render-error">Error rendering description.</p>;
            }
        } else {
            markdown = description;
        }

        return (
            <div className="markdown-container">
                <ReactMarkdown>{markdown.trim()}</ReactMarkdown>
            </div>
        );
    };

    const handleOpenIssue = (e) => {
        e.preventDefault();
        const issueUrl = siteUrl ? `${siteUrl}/browse/${currentItem.key}` : `/browse/${currentItem.key}`;
        router.navigate(issueUrl);
    };

    const issueLink = siteUrl ? `${siteUrl}/browse/${currentItem.key}` : `/browse/${currentItem.key}`;

    return (
        <div className="current-item-card">
            <div className="pointing-header">
                <span className="pointing-label">POINTING ON: {currentItem.key}</span>
                <a 
                    href={issueLink} 
                    onClick={handleOpenIssue}
                    className="open-issue-link"
                    title="Open work item in new tab"
                    target="_blank"
                >
                    <img 
                        src="./assets/image-removebg-preview.png" 
                        alt="Open" 
                        className="open-issue-icon"
                        onError={(e) => {
                            e.target.onerror = null; 
                            e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAWklEQVR4nGNgGFmAlYGB4T8DA8N/BvIBByD9n4GBgeE/A9VAKAH08B+Gf0pADf/p6D8GqhioYqCKgSoGqhhogK6U6v8MBP6To//BfwaGf0pAOnYvMTIAsX+JkQEAbOQYf0X7488AAAAASUVORK5CYII=';
                        }}
                    />
                </a>
            </div>
            <h2 className="item-summary">{currentItem.summary}</h2>
            <div className="description-area">
                {renderDescription(currentItem.description)}
            </div>
        </div>
    );
};

export default CurrentItemCard;
