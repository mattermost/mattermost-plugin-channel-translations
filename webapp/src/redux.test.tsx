// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {combineReducers, createStore} from 'redux';
import {setupRedux} from './redux';

describe('redux', () => {
    describe('translationsModal reducer', () => {
        test('should handle OPEN_TRANSLATIONS_MODAL action', async () => {
            // Arrange
            const mockRegistry = {
                registerReducer: jest.fn((reducer) => {
                    // Create a test store with the reducer
                    const store = createStore(combineReducers({translationsModal: reducer.translationsModal}));
                    
                    // Dispatch action
                    const post = { id: 'post1', message: 'Test message' };
                    store.dispatch({type: 'OPEN_TRANSLATIONS_MODAL', post});
                    
                    // Assert
                    expect(store.getState().translationsModal).toBe(post);
                }),
            };
            const mockStore = {} as any;

            // Act
            await setupRedux(mockRegistry, mockStore);

            // Assert
            expect(mockRegistry.registerReducer).toHaveBeenCalled();
        });

        test('should return default state for unknown action', async () => {
            // Arrange
            const mockRegistry = {
                registerReducer: jest.fn((reducer) => {
                    // Create a test store with the reducer
                    const store = createStore(combineReducers({translationsModal: reducer.translationsModal}));
                    
                    // Initial state should be false
                    expect(store.getState().translationsModal).toBe(false);
                    
                    // Dispatch unknown action
                    store.dispatch({type: 'UNKNOWN_ACTION'});
                    
                    // Assert state didn't change
                    expect(store.getState().translationsModal).toBe(false);
                }),
            };
            const mockStore = {} as any;

            // Act
            await setupRedux(mockRegistry, mockStore);

            // Assert
            expect(mockRegistry.registerReducer).toHaveBeenCalled();
        });
    });
});
