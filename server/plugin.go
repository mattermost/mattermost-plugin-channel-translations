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

func (p *Plugin) OnActivate() error {
	p.pluginAPI = pluginapi.NewClient(p.API, p.Driver)
	p.licenseChecker = enterprise.NewLicenseChecker(p.pluginAPI)
	if !p.licenseChecker.IsLicensed() {
		return fmt.Errorf("invalid license, this software requires Mattermost Enterprise")
	}
	return nil
}

func (p *Plugin) translateText(message, requestorID, lang string) (string, error) {
	client := interpluginclient.NewClient(&p.MattermostPlugin)

	promptParameters := map[string]any{
		"Message":  message,
		"Language": lang,
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
