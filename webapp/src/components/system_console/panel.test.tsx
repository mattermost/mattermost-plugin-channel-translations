// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render, screen} from '@testing-library/react';

import Panel, {PanelContainer, PanelFooterText} from './panel';

describe('Panel', () => {
    test('renders with title and subtitle', () => {
        // Arrange
        const title = 'Test Title';
        const subtitle = 'Test Subtitle';
        const childText = 'Panel child content';

        // Act
        render(
            <Panel
                title={title}
                subtitle={subtitle}
            >
                <div>{childText}</div>
            </Panel>,
        );

        // Assert
        expect(screen.getByText(title)).toBeInTheDocument();
        expect(screen.getByText(subtitle)).toBeInTheDocument();
        expect(screen.getByText(childText)).toBeInTheDocument();
    });

    test('renders children correctly', () => {
        // Arrange
        const childText1 = 'First child';
        const childText2 = 'Second child';

        // Act
        render(
            <Panel
                title='Title'
                subtitle='Subtitle'
            >
                <div data-testid='first-child'>{childText1}</div>
                <div data-testid='second-child'>{childText2}</div>
            </Panel>,
        );

        // Assert
        expect(screen.getByTestId('first-child')).toHaveTextContent(childText1);
        expect(screen.getByTestId('second-child')).toHaveTextContent(childText2);
    });

    test('styled components are exported correctly', () => {
        // This test ensures the styled components are exported and can be used
        expect(PanelContainer).toBeDefined();
        expect(PanelFooterText).toBeDefined();

        // Render the components to make sure they work
        render(
            <div>
                <PanelContainer data-testid='panel-container'>
                    {'Container content'}
                </PanelContainer>
                <PanelFooterText data-testid='panel-footer'>
                    {'Footer text'}
                </PanelFooterText>
            </div>,
        );

        expect(screen.getByTestId('panel-container')).toBeInTheDocument();
        expect(screen.getByTestId('panel-footer')).toBeInTheDocument();
        expect(screen.getByText('Container content')).toBeInTheDocument();
        expect(screen.getByText('Footer text')).toBeInTheDocument();
    });
});
