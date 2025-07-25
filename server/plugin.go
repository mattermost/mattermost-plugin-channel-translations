// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"context"
	"fmt"
	"time"

	"sync"

	"github.com/mattermost/mattermost-plugin-ai/interpluginclient"
	"github.com/mattermost/mattermost-plugin-channel-translations/server/enterprise"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/pluginapi"
)

const (
	translationEnabledKey = "translation_enabled"
)

type Plugin struct {
	plugin.MattermostPlugin
	configurationLock sync.RWMutex
	configuration     *configuration
	pluginAPI         *pluginapi.Client
	licenseChecker    *enterprise.LicenseChecker
}

func (p *Plugin) getTranslationEnabledKey(channelID string) string {
	return fmt.Sprintf("%s_%s", translationEnabledKey, channelID)
}

func (p *Plugin) setChannelTranslationEnabled(channelID string, enabled bool) error {
	key := p.getTranslationEnabledKey(channelID)
	if _, err := p.pluginAPI.KV.Set(key, enabled); err != nil {
		return fmt.Errorf("failed to set channel translation status: %w", err)
	}
	return nil
}

func (p *Plugin) isChannelTranslationEnabled(channelID string) (bool, error) {
	key := p.getTranslationEnabledKey(channelID)
	var enabled bool
	if err := p.pluginAPI.KV.Get(key, &enabled); err != nil {
		// If key doesn't exist, return false without error
		if err.Error() == "not found" {
			return false, nil
		}
		return false, fmt.Errorf("failed to get channel translation status: %w", err)
	}
	return enabled, nil
}

func (p *Plugin) getLanguageName(langCode string) string {
	languageMap := map[string]string{
		"bg":    "Bulgarian",
		"de":    "German",
		"en":    "English",
		"en-AU": "English (Australia)",
		"es":    "Spanish",
		"fa":    "Persian",
		"fr":    "French",
		"hu":    "Hungarian",
		"it":    "Italian",
		"ja":    "Japanese",
		"ko":    "Korean",
		"nl":    "Dutch",
		"pl":    "Polish",
		"pt-BR": "Portuguese (Brazil)",
		"ro":    "Romanian",
		"ru":    "Russian",
		"sv":    "Swedish",
		"tr":    "Turkish",
		"uk":    "Ukrainian",
		"vi":    "Vietnamese",
		"zh-CN": "Chinese (Simplified)",
		"zh-TW": "Chinese (Traditional)",
	}

	if name, exists := languageMap[langCode]; exists {
		return name
	}
	return langCode
}

func (p *Plugin) OnActivate() error {
	p.pluginAPI = pluginapi.NewClient(p.MattermostPlugin.API, p.MattermostPlugin.Driver)
	p.licenseChecker = enterprise.NewLicenseChecker(p.pluginAPI)
	if !p.licenseChecker.IsLicensed() {
		return fmt.Errorf("invalid license, this software requires Mattermost Enterprise")
	}
	return nil
}

func (p *Plugin) translateText(message, requestorID, langCode string) (string, error) {
	config := p.getConfiguration()

	// Route to appropriate translation service
	switch config.TranslationService {
	case "libretranslate":
		result, err := p.translateWithLibreTranslate(message, langCode)
		if err != nil {
			return "", err
		}
		return result, nil
	case "ai", "":
		// Default to AI translation for backward compatibility
		return p.translateWithAI(message, requestorID, langCode)
	default:
		return "", fmt.Errorf("unknown translation service: %s", config.TranslationService)
	}
}

func (p *Plugin) translateWithAI(message, requestorID, langCode string) (string, error) {
	client := interpluginclient.NewClient(&p.MattermostPlugin)

	promptParameters := map[string]any{
		"Message":  message,
		"Language": p.getLanguageName(langCode),
	}
	request := interpluginclient.SimpleCompletionRequest{
		SystemPrompt:    translationSystemPrompt,
		UserPrompt:      translationUserPrompt,
		BotUsername:     p.getConfiguration().TranslationBotName,
		RequesterUserID: requestorID,
		Parameters:      promptParameters,
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	result, err := client.SimpleCompletionWithContext(ctx, request)
	if err != nil {
		return "", err
	}

	if result == "" {
		result = " "
	}
	return result, nil
}
