import Resolver from '@forge/resolver';
import { getBacklog } from './resolvers/backlog';
import { isSessionActive, startSession, endSession, getScrumMaster } from './resolvers/session';
import { getGroomingList, updateGroomingList, getCurrentItem, setCurrentItem } from './resolvers/storage';
import { submitVote, getVotes, revealVotes } from './resolvers/voting';
import { getStoryPointField, updateStoryPoints } from './resolvers/jira';

const resolver = new Resolver();

resolver.define('getBacklog', getBacklog);
resolver.define('getGroomingList', getGroomingList);
resolver.define('updateGroomingList', updateGroomingList);
resolver.define('isSessionActive', isSessionActive);
resolver.define('startSession', startSession);
resolver.define('endSession', endSession);
resolver.define('getCurrentItem', getCurrentItem);
resolver.define('setCurrentItem', setCurrentItem);
resolver.define('submitVote', submitVote);
resolver.define('getVotes', getVotes);
resolver.define('revealVotes', revealVotes);
resolver.define('getScrumMaster', getScrumMaster);
resolver.define('getStoryPointField', getStoryPointField);
resolver.define('updateStoryPoints', updateStoryPoints);

export const handler = resolver.getDefinitions();
