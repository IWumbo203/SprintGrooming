import Resolver from '@forge/resolver';
import { getBacklog } from './resolvers/backlog';
import { isSessionActive, startSession, endSession, getScrumMaster, getGroomingState } from './resolvers/session';
import { getGroomingList, updateGroomingList, getCurrentItem, setCurrentItem, isVotingOpen, openVoting } from './resolvers/storage';
import { submitVote, getVotes, revealVotes } from './resolvers/voting';
import { getStoryPointField, updateStoryPoints } from './resolvers/jira';
import { heartbeat, getSessionUsers } from './resolvers/presence';

const resolver = new Resolver();

resolver.define('getBacklog', getBacklog);
resolver.define('getGroomingList', getGroomingList);
resolver.define('updateGroomingList', updateGroomingList);
resolver.define('isSessionActive', isSessionActive);
resolver.define('getGroomingState', getGroomingState);
resolver.define('startSession', startSession);
resolver.define('endSession', endSession);
resolver.define('getCurrentItem', getCurrentItem);
resolver.define('setCurrentItem', setCurrentItem);
resolver.define('isVotingOpen', isVotingOpen);
resolver.define('openVoting', openVoting);
resolver.define('submitVote', submitVote);
resolver.define('getVotes', getVotes);
resolver.define('revealVotes', revealVotes);
resolver.define('getScrumMaster', getScrumMaster);
resolver.define('getStoryPointField', getStoryPointField);
resolver.define('updateStoryPoints', updateStoryPoints);
resolver.define('heartbeat', heartbeat);
resolver.define('getSessionUsers', getSessionUsers);

export const handler = resolver.getDefinitions();
