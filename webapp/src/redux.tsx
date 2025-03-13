// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers, Store, Action} from 'redux';
import {GlobalState} from '@mattermost/types/store';

type WebappStore = Store<GlobalState, Action<Record<string, unknown>>>

export async function setupRedux(registry: any, store: WebappStore) {
    const reducer = combineReducers({});
    registry.registerReducer(reducer);
}
