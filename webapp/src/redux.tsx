// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers, Store, Action} from 'redux';
import {GlobalState} from '@mattermost/types/store';

type WebappStore = Store<GlobalState, Action<Record<string, unknown>>>

export function translationsModal(state = false, action: {type: string, post: any}) {
    switch (action.type) {
    case 'OPEN_TRANSLATIONS_MODAL':
        return action.post || false;
    default:
        return state;
    }
}

export async function setupRedux(registry: any, _store: WebappStore) {
    const reducer = combineReducers({
        translationsModal,
    });
    registry.registerReducer(reducer);
}
