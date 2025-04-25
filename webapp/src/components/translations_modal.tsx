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
}

const TranslationsModal: React.FC<TranslationsModalProps> = ({show, onHide, post}) => {
    const translations = post.props?.translations || {};
    return (
        <Modal
            show={show}
            onHide={onHide}
            aria-labelledby='translations-modal-title'
        >
            <Modal.Header
                closeButton={true}
                data-testid='modal-header'
            >
                <Modal.Title id='translations-modal-title'>
                    <FormattedMessage defaultMessage='Translations'/>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <TranslationItem>
                    <TranslationLanguage data-testid='original-label'>
                        <FormattedMessage defaultMessage='Original'/>
                    </TranslationLanguage>
                    <TranslationText>{post.message}</TranslationText>
                </TranslationItem>

                {Object.entries(translations || {}).map(([lang, text]) => (
                    <TranslationItem key={lang}>
                        <TranslationLanguage>{lang}</TranslationLanguage>
                        <TranslationText>{text}</TranslationText>
                    </TranslationItem>
                ))}
            </Modal.Body>
        </Modal>
    );
};

export default TranslationsModal;
