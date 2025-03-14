// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Modal} from 'react-bootstrap';
import {FormattedMessage} from 'react-intl';
import styled from 'styled-components';

const TranslationItem = styled.div`
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(var(--center-channel-color-rgb), 0.08);
    
    &:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
    }
`;

const TranslationLanguage = styled.div`
    font-weight: 600;
    margin-bottom: 4px;
`;

const TranslationText = styled.div`
    white-space: pre-wrap;
`;

interface TranslationsModalProps {
    show: boolean;
    onHide: () => void;
    post: any;
    translations: Record<string, string>;
}

const TranslationsModal: React.FC<TranslationsModalProps> = ({show, onHide, post, translations}) => {
    // Function to get language display name
    const getLanguageDisplayName = (code: string) => {
        const languages: Record<string, string> = {
            en: 'English',
            es: 'Spanish',
            fr: 'French',
            de: 'German',
            it: 'Italian',
            pt: 'Portuguese',
            ja: 'Japanese',
            ko: 'Korean',
            zh: 'Chinese',
            ru: 'Russian',
            // Add more languages as needed
        };
        return languages[code] || code;
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            centered
            aria-labelledby="translations-modal-title"
        >
            <Modal.Header closeButton>
                <Modal.Title id="translations-modal-title">
                    <FormattedMessage defaultMessage="Translations" />
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <TranslationItem>
                    <TranslationLanguage>
                        <FormattedMessage defaultMessage="Original" />
                    </TranslationLanguage>
                    <TranslationText>{post.message}</TranslationText>
                </TranslationItem>
                
                {Object.entries(translations || {}).map(([lang, text]) => (
                    <TranslationItem key={lang}>
                        <TranslationLanguage>
                            {getLanguageDisplayName(lang)}
                        </TranslationLanguage>
                        <TranslationText>{text}</TranslationText>
                    </TranslationItem>
                ))}
            </Modal.Body>
        </Modal>
    );
};

export default TranslationsModal;
