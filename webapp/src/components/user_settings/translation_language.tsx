// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {useSelector} from 'react-redux';

import type {PluginCustomSettingComponent} from '@mattermost/types/plugins/user_settings';

import {getTranslationLanguages} from '@/client';

const TranslationLanguageSetting: PluginCustomSettingComponent = ({informChange}) => {
    const [languages, setLanguages] = useState<string[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const userPreferences = useSelector((state: any) => state.entities.preferences.myPreferences);
    const currentUserTranslationPreference = (userPreferences['pp_mattermost-channel-translatio--translation_language'] || {}).value || 'en';

    useEffect(() => {
        setSelectedLanguage(currentUserTranslationPreference);
        getTranslationLanguages().then((data) => {
            if (data && data.languages) {
                setLanguages(data.languages);
            }
        }).
            catch((error) => {
                // Silent error, will just use default languages
            });
    }, []);

    const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const language = e.target.value;
        setSelectedLanguage(language);
        informChange('translation_language', language);
    };

    return (
        <div className='form-group'>
            <select
                className='form-control'
                value={selectedLanguage}
                onChange={handleLanguageChange}
            >
                <option value=''>{'Default (Auto)'}</option>
                {languages.map((lang) => (
                    <option
                        key={lang}
                        value={lang}
                    >
                        {lang}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default TranslationLanguageSetting;
