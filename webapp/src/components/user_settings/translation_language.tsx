// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState, useEffect} from 'react';
import {useSelector} from 'react-redux';

import PropTypes from 'prop-types';

import {getTranslationLanguages} from '@/client';

type Props = {
    informChange: (settingName: string, value: string) => void;
}

const TranslationLanguageSetting = ({informChange}: Props) => {
    const [languages, setLanguages] = useState<string[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const userPreferences = useSelector((state: any) => state.entities.preferences.myPreferences);
    const currentUserTranslationPreference = (userPreferences['pp_mattermost-channel-translatio--translation_language'] || {}).value ?? '';

    useEffect(() => {
        setSelectedLanguage(currentUserTranslationPreference);
        getTranslationLanguages().then((data) => {
            if (data && data.languages) {
                setLanguages(data.languages);
            }
        }).
            catch(() => {
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

TranslationLanguageSetting.propTypes = {
    informChange: PropTypes.func.isRequired,
};

export default TranslationLanguageSetting;
