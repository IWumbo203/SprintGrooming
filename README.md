# Sprint Grooming App

## Overview
This Jira Forge application facilitates collaborative sprint grooming sessions. It allows a Scrum Master to select items from the backlog, lead a real-time voting session where team members estimate story points, and apply those points directly to Jira issues.

## Core Features
- **Backlog Management:** Drag-and-drop issues from the project backlog into a grooming queue with pre-loaded descriptions.
- **Real-time Session Synchronization:** All participants see the current item, active voters, and revealed results simultaneously using an optimized polling mechanism.
- **Secure Voting:** Team members cast votes privately; values are hidden until the Scrum Master chooses to reveal them.
- **User Presence:** Tracks active participants in the session using a heartbeat system integrated into the main sync poll.
- **Jira Integration:** Automatically identifies the Story Point custom field and updates issue values via the Jira REST API.
- **Markdown Support:** Full support for rendering Jira issue descriptions as formatted Markdown.

## Architecture

### Frontend
- **Framework:** React (Forge Custom UI).
- **State Management:** Custom React hooks (`useGroomingState`, `useSessionPolling`) manage local state and synchronization.
- **Local Cache:** Backlog items and descriptions are cached in memory on initial load to ensure instant item switching and zero-flicker UI.
- **Communication:** Uses `@forge/bridge` to invoke consolidated backend resolvers.

### Backend
- **Runtime:** Forge Functions (Node.js).
- **Consolidated Resolvers:** A "Single Sync" pattern (`getGroomingState`) combines heartbeat, session status, voting, and presence into one network call.
- **Storage Strategy:** Utilizes Forge Storage with a "Lean Storage" approach—stripping bulky descriptions before saving to stay under the 32KB limit while providing full data to the client.

## Workflow

1. **Preparation:** The Scrum Master opens the app and drags issues from the "Backlog" to the "Grooming List". Descriptions are pre-loaded for instant preview.
2. **Starting a Session:** Clicking "Start Session" designates the current user as the Scrum Master and initializes the session.
3. **Voting:**
    - The Scrum Master selects an item. The UI updates instantly across all clients.
    - Team members select a point value. The UI shows who has voted in real-time.
4. **Finalizing:**
    - The Scrum Master clicks "Reveal Votes" to show all estimates.
    - The Scrum Master clicks "Apply Points" to update Jira and move to the next item automatically.

## Permissions and Scopes
The app requires the following OAuth scopes:
- `read:jira-work`: To fetch backlog issues and details.
- `write:jira-work`: To update story point values.
- `read:jira-user`: To identify and display participant names.
- `storage:app`: To manage session state and votes.

## Resource Utilization & Billing

This application is designed to be highly efficient to minimize Forge platform costs and ensure stability at scale.

### 1. Polling & Invocation Costs
The app uses an event-driven client strategy to minimize `getGroomingState` invocations:
- **State from mutations:** Mutating resolvers (start/end session, set current item, vote, reveal, open voting, update list) return the full grooming state. The acting client applies this immediately, so it does not rely on the next poll to see the result.
- **Back-off after actions:** For 3 seconds after a user action, the next poll uses a 5-second interval instead of the normal 2-second active interval, avoiding redundant polls right after the client already received state from the mutation.
- **Visibility refetch:** When the tab becomes visible again, the app triggers one immediate sync so returning users see up-to-date state without waiting for the next scheduled poll.
- **Adaptive intervals:** Active session (tab visible): 2-second interval; idle backlog: 5-second interval; background tab: 15-second interval.

### 2. Storage Efficiency (32KB Limit)
Forge Storage has a strict 32KB limit per key. To prevent crashes:
- **Lean Storage:** Issue descriptions are **never stored** in Forge Storage. They are loaded once from Jira and held in the client's browser memory.
- **Scalability:** This allows the "Grooming List" to hold hundreds of issues without hitting storage limits.

### 3. API Call Management
- **Initial Load:** Optimized to just **2 parallel calls** (Backlog + Session State).
- **Metadata Caching:** The "Story Point" field ID is discovered once during the backlog fetch and shared with the rest of the app to avoid redundant Jira API lookups.

### 4. Billing Considerations for Enterprise
- **Marketplace Billing:** If distributed, Atlassian handles per-user licensing.
- **No Infrastructure Cost:** As a Forge app, there are no server, database, or maintenance costs for the enterprise; all compute is hosted by Atlassian.
- **Data Residency:** Fully compliant with Atlassian's data residency, as all session data stays within the Forge Storage environment.
