// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"fmt"
	"strings"
	"sync"

	"github.com/mattermost/mattermost-plugin-ai/public/bridgeclient"
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
	p.pluginAPI = pluginapi.NewClient(p.API, p.Driver)
	p.licenseChecker = enterprise.NewLicenseChecker(p.pluginAPI)
	if !p.licenseChecker.IsLicensed() {
		return fmt.Errorf("invalid license, this software requires Mattermost Enterprise")
	}
	return nil
}

func (p *Plugin) translateText(message, requestorID, langCode string) (string, error) {
	client := bridgeclient.NewClient(p.API)

	// Get the bot user by username to obtain the bot ID
	botUsername := p.getConfiguration().TranslationBotName
	botUser, err := p.API.GetUserByUsername(botUsername)
	if err != nil {
		return "", fmt.Errorf("failed to get bot user: %w", err)
	}

	// Format the prompts with the parameters
	languageName := p.getLanguageName(langCode)
	systemPrompt := strings.ReplaceAll(translationSystemPrompt, "{{.Parameters.Language}}", languageName)
	userPrompt := strings.ReplaceAll(translationUserPrompt, "{{.Parameters.Message}}", message)

	// Build the completion request with posts
	request := bridgeclient.CompletionRequest{
		Posts: []bridgeclient.Post{
			{Role: "system", Message: systemPrompt},
			{Role: "user", Message: userPrompt},
		},
		UserID: requestorID,
	}

	translation, completionErr := client.AgentCompletion(botUser.Id, request)
	if completionErr != nil {
		return "", completionErr
	}

	if translation == "" {
		translation = " "
	}
	return translation, nil
}
