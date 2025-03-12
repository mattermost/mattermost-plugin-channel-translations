// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client4} from 'mattermost-redux/client';

export async function getTranslationLanguages() {
    return Client4.doFetch('/plugins/mattermost-ai/api/v1/translation/languages', {
        method: 'GET',
    });
}

export async function setUserTranslationLanguage(language: string) {
    return Client4.doFetch('/plugins/mattermost-ai/api/v1/translation/user_preference', {
        method: 'POST',
        body: JSON.stringify({language}),
    });
}
