import {GlobalState} from '@mattermost/types/store';
import manifest from './manifest';

const pluginState = (state: GlobalState): any => state['plugins-' + manifest.id as keyof GlobalState] || {}

export const getTranslationsModalPost = (state: GlobalState): any => pluginState(state).translationsModal;
