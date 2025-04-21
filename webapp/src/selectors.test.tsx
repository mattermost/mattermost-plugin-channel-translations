// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {GlobalState} from '@mattermost/types/store';
import {getTranslationsModalPost} from './selectors';

describe('selectors', () => {
    describe('getTranslationsModalPost', () => {
        test('should return translationsModal from plugin state', () => {
            // Arrange
            const translationsModal = { id: 'post1', message: 'Test message' };
            const state = {
                ['plugins-mattermost-channel-translation']: {
                    translationsModal,
                },
            } as unknown as GlobalState;

            // Act
            const result = getTranslationsModalPost(state);

            // Assert
            expect(result).toBe(translationsModal);
        });

        test('should return falsy value if plugin state does not exist', () => {
            // Arrange
            const state = {} as unknown as GlobalState;

            // Act
            const result = getTranslationsModalPost(state);

            // Assert
            expect(result).toBeFalsy();
        });
    });
});
