# Sprint Grooming Forge App Development

## Overview
A Jira Forge application that facilitates sprint grooming sessions. The Scrum Master can drag and drop items from the backlog into a selection window, start a session where developers point items one by one, and update story points in Jira.

## Architecture
- **Frontend:** Forge Custom UI (React) hosted in `static/hello-world`.
- **Backend:** Forge Functions (Resolvers) for interacting with Jira API and Forge Storage.
- **State Management:** Forge Storage to track session state, active grooming items, and developer votes.

## Development Workflow

### 1. Project Setup
- Verify Forge CLI installation.
- Define necessary permissions in `manifest.yml`.
- Configure Custom UI resources.

### 2. Implementation Phases

#### Phase 1: Data Fetching & Backlog View 
- ✅ Implement resolvers to fetch backlog items from Jira using the REST API (`/rest/api/3/search`).
- ✅ Build a UI to display the backlog.
- ✅ Added `@forge/api` dependency for backend requests.

#### Phase 2: Selection & Session Management (COMPLETED)
- ✅ Implement drag-and-drop functionality using `react-beautiful-dnd`.
- ✅ Use Forge Storage to persist the "Grooming List" of selected issues.
- ✅ Create a "Start Session" flow.

#### Phase 3: Real-time Pointing (COMPLETED)
- ✅ Use Forge Storage to sync state across developer clients.
- ✅ Developers submit points; Scrum Master views votes.
- ✅ Implemented polling for live updates.

#### Phase 4: Jira Integration (COMPLETED)
- ✅ Automatically find "Story Points" custom field ID.
- ✅ Implement resolver to update story points via Jira REST API.
- ✅ Add "Apply Points" flow to finalize grooming for each item.

## Permissions & Scopes
- `read:jira-work`: Read issue details and backlog.
- `write:jira-work`: Update story points.
- `read:jira-user`: Identify the user pointing.
- `storage:app`: Store session state and votes.

## Commands
- `forge deploy`: Deploy changes to the development environment.
- `forge tunnel`: Local development with hot reloading.
- `npm run build`: Build the static frontend assets.
