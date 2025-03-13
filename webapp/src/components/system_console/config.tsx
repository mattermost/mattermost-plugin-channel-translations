// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import styled from 'styled-components';
import {FormattedMessage, useIntl} from 'react-intl';

import Panel  from './panel';
import {BooleanItem, ItemList, SelectionItem, SelectionItemOption, TextItem} from './item';

type Config = {
    enableTranslations: boolean
    translationLanguages: string
    translationBotName: string
}

type Props = {
    id: string
    value: Config
    disabled: boolean
    onChange: (id: string, value: any) => void
    registerSaveAction: (action: () => Promise<{ error?: { message?: string } }>) => void
    unRegisterSaveAction: (action: () => Promise<{ error?: { message?: string } }>) => void
}

const MessageContainer = styled.div`
	display: flex;
	align-items: center;
	flex-direction: row;
	gap: 5px;
	padding: 10px 12px;
	background: white;
	border-radius: 4px;
	border: 1px solid rgba(63, 67, 80, 0.08);
`;

const ConfigContainer = styled.div`
	display: flex;
	flex-direction: column;
	gap: 20px;
`;

const defaultConfig = {
    services: [],
    llmBackend: '',
    transcriptBackend: '',
    enableLLMTrace: false,
};

const BetaMessage = () => (
    <MessageContainer>
        <span>
            <FormattedMessage
                defaultMessage='To report a bug or to provide feedback, <link>create a new issue in the plugin repository</link>.'
                values={{
                    link: (chunks: any) => (
                        <a
                            target={'_blank'}
                            rel={'noopener noreferrer'}
                            href='http://github.com/mattermost/mattermost-plugin-ai/issues'
                        >
                            {chunks}
                        </a>
                    ),
                }}
            />
        </span>
    </MessageContainer>
);

const Config = (props: Props) => {
    const value = props.value || defaultConfig;
    const intl = useIntl();

    useEffect(() => {
        const save = async () => {
            return {};
        };
        props.registerSaveAction(save);
        return () => {
            props.unRegisterSaveAction(save);
        };
    }, []);

    return (
        <ConfigContainer>
            <BetaMessage/>
            <Panel
                title={intl.formatMessage({defaultMessage: 'Configuration'})}
                subtitle=''
            >
                <ItemList>
                    <BooleanItem
                        label={intl.formatMessage({defaultMessage: 'Enable Channel  Translations'})}
                        value={value.enableTranslations}
                        onChange={(to) => props.onChange(props.id, {...value, enableTranslations: to})}
                        helpText={intl.formatMessage({defaultMessage: 'Enable automatic message translations in channels using AI.'})}
                    />
                    <TextItem
                        label={intl.formatMessage({defaultMessage: 'Translation Languages'})}
                        value={value.translationLanguages}
                        onChange={(e) => props.onChange(props.id, {...value, translationLanguages: e.target.value})}
                        helpText={intl.formatMessage({defaultMessage: 'Comma-separated list of language codes to translate messages to (e.g. "en,es,fr"). Default is "en".'})}
                    />
                    <SelectionItem
                        label={intl.formatMessage({defaultMessage: 'Translation Bot'})}
                        value={value.translationBotName}
                        onChange={(e) => props.onChange(props.id, {...value, translationBotName: e.target.value})}
                        helpText={intl.formatMessage({defaultMessage: 'Select which bot will handle message translations.'})}
                    >
                        {props.value.bots.map((bot: any) => (
                            <SelectionItemOption
                                key={bot.name}
                                value={bot.name}
                            >
                                {bot.displayName}
                            </SelectionItemOption>
                        ))}
                    </SelectionItem>
                </ItemList>
            </Panel>
        </ConfigContainer>
    );
};
export default Config;
