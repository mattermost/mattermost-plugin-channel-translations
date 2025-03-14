// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react';
import styled from 'styled-components';
import {useSelector} from 'react-redux';
import {FormattedMessage} from 'react-intl';

import {GlobalState} from '@mattermost/types/store';
import LoadingSpinner from 'src/components/widgets/loading_spinner';
import {UserProfile} from '@mattermost/types/users';

import PostText from './post_text';
import TranslationsModal from './translations_modal';

const Loading = styled.div`
  opacity: 0.7;
`;

const PostContainer = styled.div`
  position: relative;
`;

const TranslationsButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  background: transparent;
  border: none;
  color: rgba(var(--center-channel-color-rgb), 0.56);
  font-size: 12px;
  padding: 4px;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;
  z-index: 1;
  
  &:hover {
    opacity: 1;
    color: rgba(var(--center-channel-color-rgb), 0.72);
  }
`;

interface Props {
    post: any;
}

export const TranslatedPost = (props: Props) => {
    const [showTranslationsModal, setShowTranslationsModal] = useState(false);
    
    const currentUserId = useSelector<GlobalState, string>((state) => state.entities.users.currentUserId);
    const currentUser = useSelector<GlobalState, UserProfile>((state) => state.entities.users.profiles[currentUserId]);

    let currentUserLocale = 'en'
    if (currentUser) {
      currentUserLocale = currentUser.locale || 'en';
    }

    const userPreferences = useSelector((state: GlobalState) => state.entities.preferences.myPreferences);
    const currentUserTranslationPreference = (userPreferences["pp_mattermost-channel-translatio--translation_language"] || {}).value || 'en'

    const post = props.post;
    let message = post.message
    let loading = false
    if (post.type === "custom_translation") {
        loading = true
    }
    
    const translations = post.props?.translations || {};
    if (translations[currentUserTranslationPreference || currentUserLocale || '']) {
        loading = false
        message = translations[currentUserTranslationPreference || currentUserLocale]
    }

    const hasTranslations = Object.keys(translations).length > 0;

    return (
        <PostContainer>
            {hasTranslations && (
                <TranslationsButton
                    onClick={() => setShowTranslationsModal(true)}
                    title="View all translations"
                >
                    <i className="icon icon-globe" />
                </TranslationsButton>
            )}
            
            {loading && <Loading><LoadingSpinner/><FormattedMessage defaultMessage="Translating"/></Loading>}
            {!loading && <PostText
                message={message}
                channelID={props.post.channel_id}
                postID={props.post.id}
            />}
            
            <TranslationsModal
                show={showTranslationsModal}
                onHide={() => setShowTranslationsModal(false)}
                post={post}
                translations={translations}
            />
        </PostContainer>
    );
};
