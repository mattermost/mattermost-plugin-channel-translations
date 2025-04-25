// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render, screen} from '@testing-library/react';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';
import {IntlProvider} from 'react-intl';

import {TranslatedPost} from './translated_post';

describe('TranslatedPost', () => {
    const mockStore = configureStore();

    beforeEach(() => {
        jest.clearAllMocks();
        window.PostUtils.formatText.mockReturnValue('formatted text');
        window.PostUtils.messageHtmlToComponent.mockImplementation((text: string) => <div>{text}</div>);
    });

    test('renders loading state when post type is custom_translation', () => {
        // Arrange
        const store = mockStore({
            entities: {
                users: {
                    currentUserId: 'user1',
                    profiles: {
                        user1: {
                            id: 'user1',
                            locale: 'en',
                        },
                    },
                },
                preferences: {
                    myPreferences: {},
                },
                channels: {
                    channels: {},
                },
                teams: {
                    teams: {},
                },
                general: {
                    config: {},
                },
            },
        });

        const post = {
            id: 'post1',
            message: 'Original message',
            type: 'custom_translation',
            channel_id: 'channel1',
            props: {
                translations: {},
            },
        };

        // Act
        render(
            <IntlProvider locale='en'>
                <Provider store={store}>
                    <TranslatedPost post={post}/>
                </Provider>
            </IntlProvider>,
        );

        // Assert
        expect(screen.getByTestId('loadingSpinner')).toBeInTheDocument();
        expect(screen.getByText('Translating')).toBeInTheDocument();
    });

    test('renders translated text based on user preference', () => {
        // Arrange
        const store = mockStore({
            entities: {
                users: {
                    currentUserId: 'user1',
                    profiles: {
                        user1: {
                            id: 'user1',
                            locale: 'en',
                        },
                    },
                },
                preferences: {
                    myPreferences: {
                        'pp_mattermost-channel-translatio--translation_language': {
                            value: 'es',
                        },
                    },
                },
                channels: {
                    channels: {},
                },
                teams: {
                    teams: {},
                },
                general: {
                    config: {},
                },
            },
        });

        const post = {
            id: 'post1',
            message: 'Original message',
            channel_id: 'channel1',
            props: {
                translations: {
                    es: 'Mensaje traducido',
                    fr: 'Message traduit',
                },
            },
        };

        // Act
        render(
            <IntlProvider locale='en'>
                <Provider store={store}>
                    <TranslatedPost post={post}/>
                </Provider>
            </IntlProvider>,
        );

        // Assert
        expect(screen.queryByTestId('loadingSpinner')).not.toBeInTheDocument();
        expect(window.PostUtils.formatText).toHaveBeenCalledWith(
            'Mensaje traducido',
            expect.anything(),
        );
    });

    test('falls back to user locale when no preference is set', () => {
        // Arrange
        const store = mockStore({
            entities: {
                users: {
                    currentUserId: 'user1',
                    profiles: {
                        user1: {
                            id: 'user1',
                            locale: 'fr',
                        },
                    },
                },
                preferences: {
                    myPreferences: {},
                },
                channels: {
                    channels: {},
                },
                teams: {
                    teams: {},
                },
                general: {
                    config: {},
                },
            },
        });

        const post = {
            id: 'post1',
            message: 'Original message',
            channel_id: 'channel1',
            props: {
                translations: {
                    es: 'Mensaje traducido',
                    fr: 'Message traduit',
                },
            },
        };

        // Act
        render(
            <IntlProvider locale='en'>
                <Provider store={store}>
                    <TranslatedPost post={post}/>
                </Provider>
            </IntlProvider>,
        );

        // Assert
        expect(screen.queryByTestId('loadingSpinner')).not.toBeInTheDocument();
        expect(window.PostUtils.formatText).toHaveBeenCalledWith(
            'Message traduit',
            expect.anything(),
        );
    });

    test('renders original message when no translation available', () => {
        // Arrange
        const store = mockStore({
            entities: {
                users: {
                    currentUserId: 'user1',
                    profiles: {
                        user1: {
                            id: 'user1',
                            locale: 'de',
                        },
                    },
                },
                preferences: {
                    myPreferences: {},
                },
                channels: {
                    channels: {},
                },
                teams: {
                    teams: {},
                },
                general: {
                    config: {},
                },
            },
        });

        const post = {
            id: 'post1',
            message: 'Original message',
            channel_id: 'channel1',
            props: {
                translations: {
                    es: 'Mensaje traducido',
                    fr: 'Message traduit',
                },
            },
        };

        // Act
        render(
            <IntlProvider locale='en'>
                <Provider store={store}>
                    <TranslatedPost post={post}/>
                </Provider>
            </IntlProvider>,
        );

        // Assert
        expect(screen.queryByTestId('loadingSpinner')).not.toBeInTheDocument();
        expect(window.PostUtils.formatText).toHaveBeenCalledWith(
            'Original message',
            expect.anything(),
        );
    });

    test('handles posts with no props', () => {
        // Arrange
        const store = mockStore({
            entities: {
                users: {
                    currentUserId: 'user1',
                    profiles: {
                        user1: {
                            id: 'user1',
                            locale: 'en',
                        },
                    },
                },
                preferences: {
                    myPreferences: {},
                },
                channels: {
                    channels: {},
                },
                teams: {
                    teams: {},
                },
                general: {
                    config: {},
                },
            },
        });

        const post = {
            id: 'post1',
            message: 'Original message',
            channel_id: 'channel1',
        };

        // Act
        render(
            <IntlProvider locale='en'>
                <Provider store={store}>
                    <TranslatedPost post={post}/>
                </Provider>
            </IntlProvider>,
        );

        // Assert
        expect(screen.queryByTestId('loadingSpinner')).not.toBeInTheDocument();
        expect(window.PostUtils.formatText).toHaveBeenCalledWith(
            'Original message',
            expect.anything(),
        );
    });

    test('handles channel_mentions props', () => {
        // Arrange
        const store = mockStore({
            entities: {
                users: {
                    currentUserId: 'user1',
                    profiles: {
                        user1: {
                            id: 'user1',
                            locale: 'en',
                        },
                    },
                },
                preferences: {
                    myPreferences: {},
                },
                channels: {
                    channels: {},
                },
                teams: {
                    teams: {},
                },
                general: {
                    config: {},
                },
            },
        });

        const channelMentions = {
            'test-channel': {
                display_name: 'Test Channel',
                team_name: 'team-1',
            },
        };

        const post = {
            id: 'post1',
            message: 'Message with ~test-channel mention',
            channel_id: 'channel1',
            props: {
                channel_mentions: channelMentions,
            },
        };

        // Act
        render(
            <IntlProvider locale='en'>
                <Provider store={store}>
                    <TranslatedPost post={post}/>
                </Provider>
            </IntlProvider>,
        );

        // Assert
        expect(screen.queryByTestId('loadingSpinner')).not.toBeInTheDocument();

        // Verify the channelNamesMap was passed to PostText
        expect(window.PostUtils.formatText).toHaveBeenCalledWith(
            'Message with ~test-channel mention',
            expect.objectContaining({
                channelNamesMap: channelMentions,
            }),
        );
    });
});
