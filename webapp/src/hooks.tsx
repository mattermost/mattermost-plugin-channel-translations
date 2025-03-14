// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useDispatch} from 'react-redux';

const openTranslationsModal = (post: string) => {
    return {
        type: 'OPEN_TRANSLATIONS_MODAL',
        post: post,
    };
};

export const doOpenTranslationsModal = (post: any, dispatch: any) => {
    dispatch(openTranslationsModal(post));
};

export const useOpenTranslationsModal= () => {
    const dispatch = useDispatch();

    return (post: any) => {
        doOpenTranslationsModal(post, dispatch);
    };
};
