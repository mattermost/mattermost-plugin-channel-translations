// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {createStore} from 'redux';

import {setupRedux, translationsModal} from './redux';

describe('redux', () => {
    describe('translationsModal reducer', () => {
        test('should handle OPEN_TRANSLATIONS_MODAL action', async () => {
            // Arrange
            const mockRegistry = {
                registerReducer: jest.fn(),
            };
            const mockStore = {} as any;

            // Act
            await setupRedux(mockRegistry, mockStore);

            // Test directly with the reducer
            const post = {id: 'post1', message: 'Test message'};
            const action = {type: 'OPEN_TRANSLATIONS_MODAL', post};
            const result = translationsModal(false, action);

            // Assert
            expect(result).toBe(post);
            expect(mockRegistry.registerReducer).toHaveBeenCalled();
        });

        test('should return default state for unknown action', async () => {
            // Arrange
            const mockRegistry = {
                registerReducer: jest.fn(),
            };
            const mockStore = {} as any;

            // Act
            await setupRedux(mockRegistry, mockStore);

            // Test directly with the reducer
            const initialState = translationsModal(undefined, {type: '', post: null});
            expect(initialState).toBe(false);

            // Dispatch unknown action
            const newState = translationsModal(false, {type: 'UNKNOWN_ACTION', post: null});

            // Assert state didn't change
            expect(newState).toBe(false);
            expect(mockRegistry.registerReducer).toHaveBeenCalled();
        });
    });
});
