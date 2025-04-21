import {GlobalState} from '@mattermost/types/store';
import manifest from './manifest';

const pluginState = (state: GlobalState): any => {
    const key = `plugins-${manifest.id}`;
    return state[key as keyof GlobalState] || {};
}

export const getTranslationsModalPost = (state: GlobalState): any => {
    const plugin = pluginState(state);
    return plugin.translationsModal;
};
