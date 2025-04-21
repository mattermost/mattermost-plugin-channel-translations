// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {useSelector} from 'react-redux';
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
import {setupRedux} from './redux';
import {doOpenTranslationsModal, useOpenTranslationsModal} from './hooks';
import { TranslatedPost } from './components/translated_post';
import TranslationsModal from './components/translations_modal';
import {getTranslationsModalPost} from './selectors';


type WebappStore = Store<GlobalState, Action<Record<string, unknown>>>


export default class Plugin {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    public async initialize(registry: any, store: WebappStore) {
        setupRedux(registry, store);
        const TranslationsModalContext = React.createContext({post: null, show: false});

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

        // Register the "Translate again" button
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
        );

        // Register the "View translations" button
        registry.registerPostDropdownMenuAction(
          <>
            <i className='icon icon-globe'/>
            <FormattedMessage defaultMessage='View translations'/>
          </>,
          (postId: any) => {
            // Find the post in the store
            const state = store.getState();
            const postsById = state.entities.posts.posts;
            const post = postsById[postId];

            if (post && post.props?.translations) {
                doOpenTranslationsModal(post, store.dispatch)
            }
          },
          (post: any) => {
            // Only show for posts that have translations
            return post.type !== 'custom_translation';
          },
        );

        // Render the translations modal outside the component tree
        // We use ReactDOM.createPortal to mount it at the root level
        registry.registerRootComponent(() => {
          const post = useSelector(getTranslationsModalPost);
          const openTranslationsModal = useOpenTranslationsModal()

          return (
            <TranslationsModalContext.Provider value={{post: null, show: false}}>
              <TranslationsModal
                  show={!!post}
                  onHide={() => openTranslationsModal(null)}
                  post={post}
              />
            </TranslationsModalContext.Provider>
        )});

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
