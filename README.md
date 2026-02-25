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

This application is designed to be highly efficient to minimize Forge platform costs and ensure stability at scale. Adaptive polling is applied with exponential backoff using client-side events.

### Billing Considerations
| Capability | Unit | Free usage allowance (monthly) | Overage price per unit ($USD) |
| :--- | :--- | :--- | :--- |
| **Forge Functions: Duration** | $/GB-seconds | 100,000 GB-seconds | 0.000025 |
| **Key-Value Store: Reads** | $/GB | 0.1 GB | 0.055 |
| **Key-Value Store: Writes** | $/GB | 0.1 GB | 1.090 |
| **Logs: Writes** | $/GB | 1 GB | 1.005 |
| **SQL: Compute duration** | $/hr | 1 hr | 0.143 |
| **SQL: Compute requests** | $/1M-requests | 100,000 requests | 1.929 |
| **SQL: Data stored** | $/GB-hours | 730 GB-hours | 0.00076850 |

## Project Structure
- `src/index.js`: Main entry point for Forge resolvers.
- `src/resolvers/`: Modularized backend logic.
- `static/grooming/src/`: React frontend with optimized hooks.
- `manifest.yml`: App configuration and permissions.
