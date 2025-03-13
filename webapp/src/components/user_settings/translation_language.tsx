// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {FormattedMessage} from 'react-intl';
import {getTranslationLanguages} from '@/client'

import type {PluginCustomSettingComponent} from '@mattermost/types/plugins/user_settings';

const TranslationLanguageSetting: PluginCustomSettingComponent = ({informChange}) => {
    const [languages, setLanguages] = useState<string[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');

    useEffect(() => {
      getTranslationLanguages().then((data) => {
          if (data && data.languages) {
              setLanguages(data.languages);
              setSelectedLanguage(data.userPreference || '');
          }
      })
      .catch((error) => {
          console.error('Error fetching translation languages:', error);
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
                <option value=''>Default (Auto)</option>
                {languages.map((lang) => (
                    <option key={lang} value={lang}>
                        {lang}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default TranslationLanguageSetting;
