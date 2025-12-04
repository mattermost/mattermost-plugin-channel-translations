// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// No need to import ClientError since we mock it

import {
    getChannelTranslationStatus,
    toggleChannelTranslations,
    translatePost,
    getTranslationLanguages,
    setUserTranslationLanguage,
    setSiteUrl,
} from './client';
import manifest from './manifest';

// Mock fetch
global.fetch = jest.fn();

// Mock Client4 methods
jest.mock('@mattermost/client', () => {
    const mockTestSiteUrl = 'http://localhost:8065';
    return {
        Client4: jest.fn().mockImplementation(() => ({
            getPluginsRoute: jest.fn().mockReturnValue('/api/v4/plugins'),
            getAbsoluteUrl: jest.fn().mockImplementation((url) => `${mockTestSiteUrl}${url}`),
            getOptions: jest.fn().mockImplementation((options) => options),
            url: mockTestSiteUrl,
        })),
        ClientError: jest.fn().mockImplementation((url, error) => {
            return new Error(`ClientError: ${error.status_code}`);
        }),
    };
});

// Get test site URL - use default for testing
const TEST_SITE_URL = 'http://localhost:8065';

describe('client', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Set siteURL for consistent testing
        setSiteUrl(TEST_SITE_URL);

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
            const expectedUrl = `${TEST_SITE_URL}/plugins/${manifest.id}/channel/${channelId}/translations`;

            // Act
            await getChannelTranslationStatus(channelId);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'GET',
                }),
            );
        });
    });

    describe('toggleChannelTranslations', () => {
        test('should make POST request with correct payload', async () => {
            // Arrange
            const channelId = 'channel123';
            const enabled = true;
            const expectedUrl = `${TEST_SITE_URL}/plugins/${manifest.id}/channel/${channelId}/translations`;

            // Act
            await toggleChannelTranslations(channelId, enabled);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({enabled}),
                }),
            );
        });
    });

    describe('translatePost', () => {
        test('should make POST request with language parameter', async () => {
            // Arrange
            const postId = 'post123';
            const lang = 'es';
            const expectedUrl = `${TEST_SITE_URL}/plugins/${manifest.id}/post/${postId}/translate`;

            // Act
            await translatePost(postId, lang);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({lang}),
                }),
            );
        });
    });

    describe('getTranslationLanguages', () => {
        test('should make GET request to correct URL', async () => {
            // Arrange
            const expectedUrl = `${TEST_SITE_URL}/plugins/${manifest.id}/translation/languages`;

            // Act
            await getTranslationLanguages();

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'GET',
                }),
            );
        });
    });

    describe('setUserTranslationLanguage', () => {
        test('should make POST request with language parameter', async () => {
            // Arrange
            const language = 'fr';
            const expectedUrl = `${TEST_SITE_URL}/plugins/${manifest.id}/translation/user_preference`;

            // Act
            await setUserTranslationLanguage(language);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({language}),
                }),
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

    describe('URL construction with different siteURL configurations', () => {
        test('should construct correct URLs for localhost without subpath', async () => {
            // Arrange
            setSiteUrl('http://localhost:8065');
            const channelId = 'channel123';
            const expectedUrl = `http://localhost:8065/plugins/${manifest.id}/channel/${channelId}/translations`;

            // Act
            await getChannelTranslationStatus(channelId);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'GET',
                }),
            );
        });

        test('should construct correct URLs for domain with subpath', async () => {
            // Arrange
            setSiteUrl('https://example.com/mattermost');
            const channelId = 'channel123';
            const expectedUrl = `https://example.com/mattermost/plugins/${manifest.id}/channel/${channelId}/translations`;

            // Act
            await getChannelTranslationStatus(channelId);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'GET',
                }),
            );
        });

        test('should NOT have double pathing with subpath URLs', async () => {
            // Arrange
            setSiteUrl('https://example.com/mattermost');
            const channelId = 'channel123';
            const correctUrl = `https://example.com/mattermost/plugins/${manifest.id}/channel/${channelId}/translations`;
            const incorrectUrl = `https://example.com/mattermost/mattermost/plugins/${manifest.id}/channel/${channelId}/translations`;

            // Act
            await getChannelTranslationStatus(channelId);

            // Assert
            expect(global.fetch).toHaveBeenCalledWith(correctUrl, expect.any(Object));
            expect(global.fetch).not.toHaveBeenCalledWith(incorrectUrl, expect.any(Object));
        });
    });
});
