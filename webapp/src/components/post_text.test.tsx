// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render, screen} from '@testing-library/react';
import {Provider} from 'react-redux';
import configureStore from 'redux-mock-store';

import PostText from './post_text';

describe('PostText', () => {
    const mockStore = configureStore();
    const channel = {id: 'channel1', team_id: 'team1'};
    const team = {id: 'team1', name: 'testteam'};
    
    beforeEach(() => {
        jest.clearAllMocks();
        window.PostUtils.formatText.mockReturnValue('formatted text');
        window.PostUtils.messageHtmlToComponent.mockImplementation((text) => <div>{text}</div>);
    });

    test('renders message correctly', () => {
        // Arrange
        const store = mockStore({
            entities: {
                channels: {
                    channels: {
                        channel1: channel,
                    },
                },
                teams: {
                    teams: {
                        team1: team,
                    },
                },
                general: {
                    config: {
                        SiteURL: 'http://localhost:8065',
                    },
                },
            },
        });

        // Act
        render(
            <Provider store={store}>
                <PostText 
                    message="Test message" 
                    channelID="channel1" 
                    postID="post1"
                />
            </Provider>
        );

        // Assert
        expect(window.PostUtils.formatText).toHaveBeenCalledWith(
            'Test message',
            expect.objectContaining({
                singleline: false,
                mentionHighlight: true,
                atMentions: true,
            })
        );
        expect(window.PostUtils.messageHtmlToComponent).toHaveBeenCalledWith(
            'formatted text',
            expect.objectContaining({
                postId: 'post1',
            })
        );
        expect(screen.getByTestId('posttext')).toBeInTheDocument();
    });

    test('handles missing channel and team', () => {
        // Arrange
        const store = mockStore({
            entities: {
                channels: {
                    channels: {},
                },
                teams: {
                    teams: {},
                },
                general: {
                    config: {
                        SiteURL: 'http://localhost:8065',
                    },
                },
            },
        });

        // Act
        render(
            <Provider store={store}>
                <PostText 
                    message="Test message" 
                    channelID="nonexistent" 
                    postID="post1"
                />
            </Provider>
        );

        // Assert
        expect(window.PostUtils.formatText).toHaveBeenCalled();
        expect(window.PostUtils.messageHtmlToComponent).toHaveBeenCalled();
        expect(screen.getByTestId('posttext')).toBeInTheDocument();
    });

    test('handles channelNamesMap prop', () => {
        // Arrange
        const channelNamesMap = {
            'channel-name': {
                display_name: 'Channel Display Name',
                team_name: 'team-name',
            },
        };
        const store = mockStore({
            entities: {
                channels: {
                    channels: {
                        channel1: channel,
                    },
                },
                teams: {
                    teams: {
                        team1: team,
                    },
                },
                general: {
                    config: {},
                },
            },
        });

        // Act
        render(
            <Provider store={store}>
                <PostText 
                    message="Test message with ~channel-name" 
                    channelID="channel1" 
                    postID="post1"
                    channelNamesMap={channelNamesMap}
                />
            </Provider>
        );

        // Assert
        expect(window.PostUtils.formatText).toHaveBeenCalledWith(
            'Test message with ~channel-name',
            expect.objectContaining({
                channelNamesMap,
            })
        );
    });

    test('renders empty text with paragraph when text is empty', () => {
        // Arrange
        window.PostUtils.messageHtmlToComponent.mockReturnValueOnce(null);
        const store = mockStore({
            entities: {
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

        // Act
        render(
            <Provider store={store}>
                <PostText 
                    message="" 
                    channelID="channel1" 
                    postID="post1"
                    showCursor={true}
                />
            </Provider>
        );

        // Assert
        const container = screen.getByTestId('posttext');
        expect(container).toContainHTML('<p></p>');
    });

    test('applies showCursor prop correctly', () => {
        // Arrange
        const store = mockStore({
            entities: {
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

        // Act
        const {rerender} = render(
            <Provider store={store}>
                <PostText 
                    message="Test message" 
                    channelID="channel1" 
                    postID="post1"
                    showCursor={true}
                />
            </Provider>
        );

        // Assert
        const withCursor = screen.getByTestId('posttext');
        expect(withCursor).toHaveAttribute('showCursor', 'true');

        // Rerender without cursor
        rerender(
            <Provider store={store}>
                <PostText 
                    message="Test message" 
                    channelID="channel1" 
                    postID="post1"
                    showCursor={false}
                />
            </Provider>
        );

        const withoutCursor = screen.getByTestId('posttext');
        expect(withoutCursor).toHaveAttribute('showCursor', 'false');
    });
});
