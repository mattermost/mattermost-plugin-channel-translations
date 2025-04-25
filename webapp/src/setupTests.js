// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom';
import React from 'react';

// Mock PostUtils global
window.PostUtils = {
    formatText: jest.fn().mockReturnValue('formatted text'),
    messageHtmlToComponent: jest.fn().mockImplementation((text) => <div>{text}</div>),
};

// Mock for FormattedMessage since we're not using IntlProvider in some tests
jest.mock('react-intl', () => {
    const reactIntl = jest.requireActual('react-intl');
    const intl = {
        formatMessage: jest.fn((message) => message.defaultMessage || ''),
    };

    return {
        ...reactIntl,
        useIntl: () => intl,
        FormattedMessage: ({ defaultMessage }) => <span>{defaultMessage}</span>,
    };
});
