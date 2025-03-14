// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {Store, Action} from 'redux';
import {FormattedMessage} from 'react-intl';

import {GlobalState} from '@mattermost/types/store';
import type {
    PluginConfiguration,
    PluginConfigurationSection,
    PluginConfigurationCustomSetting
} from '@mattermost/types/plugins/user_settings';

import manifest from '@/manifest';

import Config from './components/system_console/config';
import {getChannelTranslationStatus, toggleChannelTranslations, translatePost} from './client';
import TranslationLanguageSetting from './components/user_settings/translation_language';
import PostEventListener from './websocket';
import {setupRedux} from './redux';
import { TranslatedPost } from './components/translated_post';

type WebappStore = Store<GlobalState, Action<Record<string, unknown>>>


export default class Plugin {
    postEventListener: PostEventListener = new PostEventListener();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    public async initialize(registry: any, store: WebappStore) {
        setupRedux(registry, store);

        registry.registerTranslations((locale: string) => {
            try {
                // eslint-disable-next-line global-require
                return require(`./i18n/${locale}.json`);
            } catch (e) {
                return {};
            }
        });

        const TranslationButton = () => {
          const [isTranslated, setIsTranslated] = useState(false)
          const channelId = store.getState().entities.channels.currentChannelId;

          useEffect(() => {
              getChannelTranslationStatus(channelId).then(({enabled}) => {
                  setIsTranslated(enabled)
              });
          }, [])
          if (isTranslated) {
            return <FormattedMessage defaultMessage='Disable Translations'/>;
          }
          return <FormattedMessage defaultMessage='Enable Translations'/>;
        }

        registry.registerPostDropdownMenuAction(
          <>
            <i className='icon icon-globe'/>
            <FormattedMessage defaultMessage='Translate again'/>
          </>,
          (postId: any) => {
            const state = store.getState();
            const lang = (state.entities.preferences.myPreferences["pp_mattermost-channel-translatio--translation_language"] || {}).value || 'en';
            translatePost(postId, lang);
          },
          (post: any) => {
            return post.type !== 'custom_translation';
          },
        )

        registry.registerPostTypeComponent('custom_translation', TranslatedPost);
        registry.registerChannelHeaderMenuAction(
            <TranslationButton/>,
            async (channelId: string) => {
                try {
                    const {enabled} = await getChannelTranslationStatus(channelId);
                    await toggleChannelTranslations(channelId, !enabled);
                    // Force menu to re-render with updated text
                    window.postMessage({type: 'UPDATE_CHANNEL_HEADER_MENU'}, window.origin);
                } catch (e) {
                    console.error('Failed to toggle translations:', e);
                }
            }
        );

        registry.registerAdminConsoleCustomSetting('Config', Config);

        // Register user settings
        const userSettings: PluginConfiguration = {
            id: manifest.id,
            uiName: 'Channel translations',
            icon: "icon-globe",
            sections: [
                {
                    title: 'Channel Translation Settings',
                    settings: [
                        {
                            type: 'custom',
                            name: 'translation_language',
                            title: 'Preferred Channel Translation Language',
                            helpText: 'Select your preferred language for channel translations. This setting applies to all channels where translations are enabled.',
                            component: TranslationLanguageSetting
                        } as PluginConfigurationCustomSetting
                    ]
                } as PluginConfigurationSection
            ]
        };

        registry.registerUserSettings(userSettings);
    }
}

declare global {
    interface Window {
        registerPlugin(pluginId: string, plugin: Plugin): void
        WebappUtils: any
    }
}

window.registerPlugin(manifest.id, new Plugin());
