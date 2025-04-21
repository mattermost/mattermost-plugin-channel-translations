// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {doOpenTranslationsModal} from './hooks';
import {renderHook} from '@testing-library/react-hooks';
import {useOpenTranslationsModal} from './hooks';
import * as reactRedux from 'react-redux';

jest.mock('react-redux', () => ({
    ...jest.requireActual('react-redux'),
    useDispatch: jest.fn(),
}));

describe('hooks', () => {
    describe('doOpenTranslationsModal', () => {
        test('should dispatch OPEN_TRANSLATIONS_MODAL action with post', () => {
            // Arrange
            const mockDispatch = jest.fn();
            const mockPost = { id: 'post1', message: 'Test message' };

            // Act
            doOpenTranslationsModal(mockPost, mockDispatch);

            // Assert
            expect(mockDispatch).toHaveBeenCalledWith({
                type: 'OPEN_TRANSLATIONS_MODAL',
                post: mockPost,
            });
        });
    });

    describe('useOpenTranslationsModal', () => {
        test('should return function that dispatches OPEN_TRANSLATIONS_MODAL action', () => {
            // Arrange
            const mockDispatch = jest.fn();
            jest.spyOn(reactRedux, 'useDispatch').mockReturnValue(mockDispatch);
            
            // Act
            const {result} = renderHook(() => useOpenTranslationsModal());
            const openModal = result.current;
            const mockPost = { id: 'post1', message: 'Test message' };
            openModal(mockPost);
            
            // Assert
            expect(mockDispatch).toHaveBeenCalledWith({
                type: 'OPEN_TRANSLATIONS_MODAL',
                post: mockPost,
            });
        });
    });
});
