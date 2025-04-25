// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {render, screen, fireEvent} from '@testing-library/react';
import {IntlProvider} from 'react-intl';

import {
    ItemList,
    TextItem,
    SelectionItem,
    SelectionItemOption,
    BooleanItem,
    HelpText,
    ItemLabel,
    StyledInput,
    StyledRadio,
} from './item';

describe('Item components', () => {
    // Helper to wrap components with IntlProvider for FormattedMessage
    const renderWithIntl = (component: React.ReactNode) => {
        return render(
            <IntlProvider locale='en'>
                {component}
            </IntlProvider>,
        );
    };

    describe('ItemList', () => {
        test('renders children correctly', () => {
            // Arrange
            render(
                <ItemList data-testid='item-list'>
                    <div data-testid='child1'>Child 1</div>
                    <div data-testid='child2'>Child 2</div>
                </ItemList>,
            );

            // Assert
            expect(screen.getByTestId('item-list')).toBeInTheDocument();
            expect(screen.getByTestId('child1')).toBeInTheDocument();
            expect(screen.getByTestId('child2')).toBeInTheDocument();
        });
    });

    describe('TextItem', () => {
        test('renders input field with label', () => {
            // Arrange
            const label = 'Test Label';
            const value = 'Test Value';
            const onChange = jest.fn();

            // Act
            render(
                <TextItem
                    label={label}
                    value={value}
                    onChange={onChange}
                />,
            );

            // Assert
            expect(screen.getByText(label)).toBeInTheDocument();
            expect(screen.getByDisplayValue(value)).toBeInTheDocument();
        });

        test('renders help text when provided', () => {
            // Arrange
            const helptext = 'This is help text';
            const onChange = jest.fn();

            // Act
            render(
                <TextItem
                    label='Label'
                    value='Value'
                    helptext={helptext}
                    onChange={onChange}
                />,
            );

            // Assert
            expect(screen.getByText(helptext)).toBeInTheDocument();
        });

        test('renders as textarea when multiline is true', () => {
            // Arrange
            const onChange = jest.fn();

            // Act
            render(
                <TextItem
                    label='Label'
                    value='Value'
                    multiline={true}
                    onChange={onChange}
                />,
            );

            // Assert - Check that a textarea is rendered
            const textarea = screen.getByDisplayValue('Value');
            expect(textarea.tagName.toLowerCase()).toBe('textarea');
        });

        test('calls onChange when input changes', () => {
            // Arrange
            const onChange = jest.fn();

            // Act
            render(
                <TextItem
                    label='Label'
                    value='Value'
                    onChange={onChange}
                />,
            );

            fireEvent.change(screen.getByDisplayValue('Value'), {target: {value: 'New Value'}});

            // Assert
            expect(onChange).toHaveBeenCalled();
        });
    });

    describe('SelectionItem', () => {
        test('renders select field with label', () => {
            // Arrange
            const label = 'Test Select';
            const value = 'option1';
            const onChange = jest.fn();

            // Act
            render(
                <SelectionItem
                    label={label}
                    value={value}
                    onChange={onChange}
                >
                    <SelectionItemOption value='option1'>Option 1</SelectionItemOption>
                    <SelectionItemOption value='option2'>Option 2</SelectionItemOption>
                </SelectionItem>,
            );

            // Assert
            expect(screen.getByText(label)).toBeInTheDocument();
            expect(screen.getByRole('combobox')).toHaveValue(value);
            expect(screen.getByText('Option 1')).toBeInTheDocument();
            expect(screen.getByText('Option 2')).toBeInTheDocument();
        });

        test('calls onChange when selection changes', () => {
            // Arrange
            const onChange = jest.fn();

            // Act
            render(
                <SelectionItem
                    label='Label'
                    value='option1'
                    onChange={onChange}
                >
                    <SelectionItemOption value='option1'>Option 1</SelectionItemOption>
                    <SelectionItemOption value='option2'>Option 2</SelectionItemOption>
                </SelectionItem>,
            );

            fireEvent.change(screen.getByRole('combobox'), {target: {value: 'option2'}});

            // Assert
            expect(onChange).toHaveBeenCalled();
        });
    });

    describe('BooleanItem', () => {
        test('renders radio buttons with label', () => {
            // Arrange
            const label = 'Test Boolean';
            const onChange = jest.fn();

            // Act
            renderWithIntl(
                <BooleanItem
                    label={label}
                    value={true}
                    onChange={onChange}
                />,
            );

            // Assert
            expect(screen.getByText(label)).toBeInTheDocument();

            // Get all radio inputs
            const radioInputs = screen.getAllByRole('radio');
            expect(radioInputs).toHaveLength(2);

            // First radio should be checked (true)
            expect(radioInputs[0]).toBeChecked();

            // Second radio should not be checked (false)
            expect(radioInputs[1]).not.toBeChecked();
        });

        test('renders help text when provided', () => {
            // Arrange
            const helpText = 'This is help text';
            const onChange = jest.fn();

            // Act
            renderWithIntl(
                <BooleanItem
                    label='Label'
                    value={true}
                    helpText={helpText}
                    onChange={onChange}
                />,
            );

            // Assert
            expect(screen.getByText(helpText)).toBeInTheDocument();
        });

        test('calls onChange with true when true option is clicked', () => {
            // Arrange
            const onChange = jest.fn();

            // Act
            renderWithIntl(
                <BooleanItem
                    label='Label'
                    value={false}
                    onChange={onChange}
                />,
            );

            // Click the "true" radio button
            const radioInputs = screen.getAllByRole('radio');
            fireEvent.click(radioInputs[0]);

            // Assert
            expect(onChange).toHaveBeenCalledWith(true);
        });

        test('calls onChange with false when false option is clicked', () => {
            // Arrange
            const onChange = jest.fn();

            // Act
            renderWithIntl(
                <BooleanItem
                    label='Label'
                    value={true}
                    onChange={onChange}
                />,
            );

            // Click the "false" radio button
            const radioInputs = screen.getAllByRole('radio');
            fireEvent.click(radioInputs[1]);

            // Assert
            expect(onChange).toHaveBeenCalledWith(false);
        });
    });

    describe('styled components', () => {
        test('styled components are exported correctly', () => {
            // This test ensures the styled components are exported and can be used
            expect(HelpText).toBeDefined();
            expect(ItemLabel).toBeDefined();
            expect(StyledInput).toBeDefined();
            expect(StyledRadio).toBeDefined();
            expect(SelectionItemOption).toBeDefined();
        });
    });
});
