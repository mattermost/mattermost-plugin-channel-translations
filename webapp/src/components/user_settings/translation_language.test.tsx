// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';

import * as client from '../../client';
import TranslationLanguageSetting from './translation_language';

jest.mock('../../client', () => ({
    getTranslationLanguages: jest.fn(),
}));

describe('TranslationLanguageSetting', () => {
    const mockStore = configureStore();
    const informChange = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (client.getTranslationLanguages as jest.Mock).mockResolvedValue({
            languages: ['en', 'es', 'fr', 'de'],
            userPreference: 'en',
        });
    });

    test('renders with default state', async () => {
        // Arrange
        const store = mockStore({
            entities: {
                preferences: {
                    myPreferences: {},
                },
            },
        });

        // Act
        render(
            <Provider store={store}>
                <TranslationLanguageSetting informChange={informChange} />
            </Provider>
        );

        // Assert
        // Should have a select element
        expect(screen.getByRole('combobox')).toBeInTheDocument();
        expect(screen.getByText('Default (Auto)')).toBeInTheDocument();
        
        // Wait for languages to load
        await waitFor(() => {
            expect(client.getTranslationLanguages).toHaveBeenCalled();
        });
    });

    test('displays language options when loaded', async () => {
        // Arrange
        const store = mockStore({
            entities: {
                preferences: {
                    myPreferences: {},
                },
            },
        });

        // Act
        render(
            <Provider store={store}>
                <TranslationLanguageSetting informChange={informChange} />
            </Provider>
        );

        // Assert - Wait for languages to load
        await waitFor(() => {
            // Check that all languages are in the document
            expect(screen.getByText('en')).toBeInTheDocument();
            expect(screen.getByText('es')).toBeInTheDocument();
            expect(screen.getByText('fr')).toBeInTheDocument();
            expect(screen.getByText('de')).toBeInTheDocument();
        });
    });

    test('handles error in loading languages gracefully', async () => {
        // Arrange
        (client.getTranslationLanguages as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));
        const store = mockStore({
            entities: {
                preferences: {
                    myPreferences: {},
                },
            },
        });

        // Act
        render(
            <Provider store={store}>
                <TranslationLanguageSetting informChange={informChange} />
            </Provider>
        );

        // Assert - Component doesn't crash
        await waitFor(() => {
            expect(screen.getByRole('combobox')).toBeInTheDocument();
        });
    });

    test('sets the initial selected language from user preferences', async () => {
        // Arrange
        const store = mockStore({
            entities: {
                preferences: {
                    myPreferences: {
                        'pp_mattermost-channel-translatio--translation_language': {
                            value: 'es',
                        },
                    },
                },
            },
        });

        // Act
        render(
            <Provider store={store}>
                <TranslationLanguageSetting informChange={informChange} />
            </Provider>
        );

        // Assert - Selected value should be 'es'
        await waitFor(() => {
            const select = screen.getByRole('combobox') as HTMLSelectElement;
            expect(select.value).toBe('es');
        });
    });

    test('calls informChange when a language is selected', async () => {
        // Arrange
        const store = mockStore({
            entities: {
                preferences: {
                    myPreferences: {},
                },
            },
        });

        // Act
        render(
            <Provider store={store}>
                <TranslationLanguageSetting informChange={informChange} />
            </Provider>
        );

        // Wait for options to be available
        await waitFor(() => {
            expect(screen.getByText('fr')).toBeInTheDocument();
        });

        // Select a new language
        act(() => {
            fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fr' } });
        });

        // Assert
        expect(informChange).toHaveBeenCalledWith('translation_language', 'fr');
    });
});
