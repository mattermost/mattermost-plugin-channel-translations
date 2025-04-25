// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '@testing-library/jest-dom';
import React from 'react';

/* global jest */

// Mock PostUtils global
window.PostUtils = {
    formatText: jest.fn().mockReturnValue('formatted text'),
    messageHtmlToComponent: jest.fn().mockImplementation((text) => React.createElement('div', null, text)),
};
