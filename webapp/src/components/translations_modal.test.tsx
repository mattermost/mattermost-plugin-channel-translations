// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {IntlProvider} from 'react-intl';

import TranslationsModal from './translations_modal';

describe('TranslationsModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('renders modal with original message and translations', () => {
        // Arrange
        const post = {
            id: 'post1',
            message: 'Hello world',
            props: {
                translations: {
                    es: 'Hola mundo',
                    fr: 'Bonjour monde',
                },
            },
        };
        const onHide = jest.fn();

        // Act
        render(
            <IntlProvider locale='en'>
                <TranslationsModal
                    show={true}
                    onHide={onHide}
                    post={post}
                />
            </IntlProvider>,
        );

        // Assert
        expect(screen.getByText('Hello world')).toBeInTheDocument();
        expect(screen.getByText('Hola mundo')).toBeInTheDocument();
        expect(screen.getByText('Bonjour monde')).toBeInTheDocument();
        expect(screen.getByTestId('original-label')).toBeInTheDocument();
        expect(screen.getByText('es')).toBeInTheDocument();
        expect(screen.getByText('fr')).toBeInTheDocument();
    });

    test('calls onHide when close button is clicked', () => {
        // Arrange
        const post = {
            id: 'post1',
            message: 'Hello world',
            props: {
                translations: {
                    es: 'Hola mundo',
                },
            },
        };
        const onHide = jest.fn();

        // Act
        render(
            <IntlProvider locale='en'>
                <TranslationsModal
                    show={true}
                    onHide={onHide}
                    post={post}
                />
            </IntlProvider>,
        );

        const closeButton = screen.getByTestId('modal-header').querySelector('button.close');
        fireEvent.click(closeButton);

        // Assert
        expect(onHide).toHaveBeenCalledTimes(1);
    });

    test('handles post with no translations', () => {
        // Arrange
        const post = {
            id: 'post1',
            message: 'Hello world',
            props: {},
        };
        const onHide = jest.fn();

        // Act
        render(
            <IntlProvider locale='en'>
                <TranslationsModal
                    show={true}
                    onHide={onHide}
                    post={post}
                />
            </IntlProvider>,
        );

        // Assert
        expect(screen.getByText('Hello world')).toBeInTheDocument();
        expect(screen.getByTestId('original-label')).toBeInTheDocument();
        expect(screen.queryByText('es')).not.toBeInTheDocument();
    });

    test('handles post with null props', () => {
        // Arrange
        const post = {
            id: 'post1',
            message: 'Hello world',
        };
        const onHide = jest.fn();

        // Act
        render(
            <IntlProvider locale='en'>
                <TranslationsModal
                    show={true}
                    onHide={onHide}
                    post={post}
                />
            </IntlProvider>,
        );

        // Assert
        expect(screen.getByText('Hello world')).toBeInTheDocument();
        expect(screen.getByTestId('original-label')).toBeInTheDocument();
    });

    test('is not rendered when show is false', () => {
        // Arrange
        const post = {
            id: 'post1',
            message: 'Hello world',
            props: {
                translations: {
                    es: 'Hola mundo',
                },
            },
        };
        const onHide = jest.fn();

        // Act
        const {container} = render(
            <IntlProvider locale='en'>
                <TranslationsModal
                    show={false}
                    onHide={onHide}
                    post={post}
                />
            </IntlProvider>,
        );

        // Assert
        // The modal shouldn't be in the document or should be hidden
        expect(container.firstChild).toBeNull();
    });
});
