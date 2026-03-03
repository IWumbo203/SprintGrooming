import Resolver from '@forge/resolver';
import { getBacklog } from './resolvers/backlog';
import { startSession, endSession, getGroomingState } from './resolvers/session';
import { getGroomingList, updateGroomingList, setCurrentItem, openVoting } from './resolvers/storage';
import { submitVote, revealVotes } from './resolvers/voting';
import { updateStoryPoints, getStoryPointField } from './resolvers/jira';

const resolver = new Resolver();

resolver.define('getBacklog', getBacklog);
resolver.define('getGroomingList', getGroomingList);
resolver.define('updateGroomingList', updateGroomingList);
resolver.define('getGroomingState', getGroomingState);
resolver.define('startSession', startSession);
resolver.define('endSession', endSession);
resolver.define('setCurrentItem', setCurrentItem);
resolver.define('openVoting', openVoting);
resolver.define('submitVote', submitVote);
resolver.define('revealVotes', revealVotes);
resolver.define('updateStoryPoints', updateStoryPoints);
resolver.define('getStoryPointField', (_req) => getStoryPointField());

export const handler = resolver.getDefinitions();
