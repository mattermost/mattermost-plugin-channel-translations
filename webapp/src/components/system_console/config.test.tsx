// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {IntlProvider} from 'react-intl';

import Config from './config';

describe('Config', () => {
    // Common props for tests
    const defaultProps = {
        id: 'config-id',
        value: {
            enableTranslations: false,
            translationLanguages: 'en,es,fr',
            translationBotName: 'TranslateBot',
            translateSystemMessages: false,
        },
        disabled: false,
        onChange: jest.fn(),
        registerSaveAction: jest.fn(),
        unRegisterSaveAction: jest.fn(),
    };

    // Helper to render with IntlProvider
    const renderWithIntl = (component: React.ReactNode) => {
        return render(
            <IntlProvider locale='en'>
                {component}
            </IntlProvider>,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders all configuration items', () => {
        // Act
        renderWithIntl(<Config {...defaultProps}/>);

        // Assert
        // Check that all configuration items are present
        expect(screen.getByText('Configuration')).toBeInTheDocument();
        expect(screen.getByText('Enable Channel Translations')).toBeInTheDocument();
        expect(screen.getByText('Translation Languages')).toBeInTheDocument();
        expect(screen.getByText('Translation Bot')).toBeInTheDocument();
        expect(screen.getByText('Translate System Messages')).toBeInTheDocument();

        // Check input values are set correctly
        expect(screen.getByDisplayValue('en,es,fr')).toBeInTheDocument();
        expect(screen.getByDisplayValue('TranslateBot')).toBeInTheDocument();
    });

    test('renders BetaMessage with link', () => {
        // Act
        renderWithIntl(<Config {...defaultProps}/>);

        // Assert
        expect(screen.getByText(/create a new issue in the plugin repository/)).toBeInTheDocument();
        const link = screen.getByRole('link');
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', 'http://github.com/mattermost/mattermost-plugin-ai/issues');
        expect(link).toHaveAttribute('target', '_blank');
    });

    test('calls onChange when Enable Channel Translations is changed', () => {
        // Act
        renderWithIntl(<Config {...defaultProps}/>);

        // Find the "true" radio button (the first one) and click it
        const radioButtons = screen.getAllByRole('radio');
        fireEvent.click(radioButtons[0]);

        // Assert
        expect(defaultProps.onChange).toHaveBeenCalledWith(
            'config-id',
            {
                ...defaultProps.value,
                enableTranslations: true,
            },
        );
    });

    test('calls onChange when Translation Languages is changed', () => {
        // Act
        renderWithIntl(<Config {...defaultProps}/>);

        // Find the input field and change its value
        const input = screen.getByDisplayValue('en,es,fr');
        fireEvent.change(input, {target: {value: 'en,de,fr'}});

        // Assert
        expect(defaultProps.onChange).toHaveBeenCalledWith(
            'config-id',
            {
                ...defaultProps.value,
                translationLanguages: 'en,de,fr',
            },
        );
    });

    test('calls onChange when Translation Bot is changed', () => {
        // Act
        renderWithIntl(<Config {...defaultProps}/>);

        // Find the input field and change its value
        const input = screen.getByDisplayValue('TranslateBot');
        fireEvent.change(input, {target: {value: 'NewBot'}});

        // Assert
        expect(defaultProps.onChange).toHaveBeenCalledWith(
            'config-id',
            {
                ...defaultProps.value,
                translationBotName: 'NewBot',
            },
        );
    });

    test('calls onChange when Translate System Messages is changed', () => {
        // Act
        renderWithIntl(<Config {...defaultProps}/>);

        // Find the "true" radio button for system messages (would be the third radio button)
        const radioButtons = screen.getAllByRole('radio');
        fireEvent.click(radioButtons[2]);

        // Assert
        expect(defaultProps.onChange).toHaveBeenCalledWith(
            'config-id',
            {
                ...defaultProps.value,
                translateSystemMessages: true,
            },
        );
    });

    test('registers save action on mount and unregisters on unmount', () => {
        // Act
        const {unmount} = renderWithIntl(<Config {...defaultProps}/>);

        // Assert - registerSaveAction should be called on mount
        expect(defaultProps.registerSaveAction).toHaveBeenCalled();

        // Act - unmount the component
        unmount();

        // Assert - unRegisterSaveAction should be called on unmount
        expect(defaultProps.unRegisterSaveAction).toHaveBeenCalled();
    });

    test('renders with default config when value is undefined', () => {
        // Arrange
        const propsWithoutValue = {
            ...defaultProps,
        };
        delete propsWithoutValue.value;

        // Act
        renderWithIntl(<Config {...propsWithoutValue}/>);

        // Assert - should not crash and render with default values
        expect(screen.getByText('Configuration')).toBeInTheDocument();
    });
});
