// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';


const LoadingSpinner = () => {
    const {formatMessage} = useIntl();

    return (
        <span
            id='loadingSpinner'
            className='LoadingSpinner'
            data-testid='loadingSpinner'
        >
            <span
                className='fa fa-spinner fa-fw fa-pulse spinner'
                title={formatMessage({defaultMessage: 'Loading Icon'})}
            />
        </span>
    );
};

export default React.memo(LoadingSpinner);
