// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render, screen} from '@testing-library/react';
import {IntlProvider} from 'react-intl';

import LoadingSpinner from './loading_spinner';

describe('LoadingSpinner', () => {
    test('renders correctly', () => {
        // Arrange & Act
        render(
            <IntlProvider locale="en">
                <LoadingSpinner />
            </IntlProvider>
        );
        
        // Assert
        expect(screen.getByTestId('loadingSpinner')).toBeInTheDocument();
    });

    test('has correct classes and attributes', () => {
        // Arrange & Act
        render(
            <IntlProvider locale="en">
                <LoadingSpinner />
            </IntlProvider>
        );
        
        // Assert
        const spinner = screen.getByTestId('loadingSpinner');
        expect(spinner).toHaveClass('LoadingSpinner');
        expect(spinner).toHaveAttribute('id', 'loadingSpinner');
        
        // Check the inner span
        const innerSpan = spinner.querySelector('span');
        expect(innerSpan).toBeInTheDocument();
        expect(innerSpan).toHaveClass('fa', 'fa-spinner', 'fa-fw', 'fa-pulse', 'spinner');
        expect(innerSpan).toHaveAttribute('title', 'Loading Icon');
    });

    test('is accessible', () => {
        // Arrange & Act
        render(
            <IntlProvider locale="en">
                <LoadingSpinner />
            </IntlProvider>
        );
        
        // Assert - Should have a title for screen readers
        const innerSpan = screen.getByTitle('Loading Icon');
        expect(innerSpan).toBeInTheDocument();
    });
});
