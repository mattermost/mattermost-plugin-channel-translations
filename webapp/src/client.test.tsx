// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {
    getChannelTranslationStatus,
    toggleChannelTranslations,
    translatePost,
    getTranslationLanguages,
    setUserTranslationLanguage
} from './client';
import manifest from './manifest';

// Mock fetch
global.fetch = jest.fn();

describe('client', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock successful fetch response
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({}),
        });
    });

    describe('getChannelTranslationStatus', () => {
        test('should make GET request to correct URL', async () => {
            // Arrange
            const channelId = 'channel123';
            const expectedUrl = `/plugins/${manifest.id}/channel/${channelId}/translations`;

            // Act
            await getChannelTranslationStatus(channelId);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });
    });

    describe('toggleChannelTranslations', () => {
        test('should make POST request with correct payload', async () => {
            // Arrange
            const channelId = 'channel123';
            const enabled = true;
            const expectedUrl = `/plugins/${manifest.id}/channel/${channelId}/translations`;

            // Act
            await toggleChannelTranslations(channelId, enabled);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({enabled}),
                })
            );
        });
    });

    describe('translatePost', () => {
        test('should make POST request with language parameter', async () => {
            // Arrange
            const postId = 'post123';
            const lang = 'es';
            const expectedUrl = `/plugins/${manifest.id}/post/${postId}/translate`;

            // Act
            await translatePost(postId, lang);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({lang}),
                })
            );
        });
    });

    describe('getTranslationLanguages', () => {
        test('should make GET request to correct URL', async () => {
            // Arrange
            const expectedUrl = `/plugins/${manifest.id}/translation/languages`;

            // Act
            await getTranslationLanguages();

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });
    });

    describe('setUserTranslationLanguage', () => {
        test('should make POST request with language parameter', async () => {
            // Arrange
            const language = 'fr';
            const expectedUrl = `/plugins/${manifest.id}/translation/user_preference`;

            // Act
            await setUserTranslationLanguage(language);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({language}),
                })
            );
        });
    });

    test('should throw error when response is not ok', async () => {
        // Arrange
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: false,
            status: 500,
        });

        // Act & Assert
        await expect(getTranslationLanguages()).rejects.toThrow();
    });
});
