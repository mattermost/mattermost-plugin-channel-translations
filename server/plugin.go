// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"fmt"

	"sync"

	"github.com/mattermost/mattermost-plugin-channel-translations/server/enterprise"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/pluginapi"
)

const (
	translationEnabledKey = "translation_enabled"
)

// Plugin implements the interface expected by the Mattermost server to communicate between the server and plugin processes.
type Plugin struct {
	plugin.MattermostPlugin

	// configurationLock synchronizes access to the configuration.
	configurationLock sync.RWMutex

	// configuration is the active plugin configuration. Consult getConfiguration and
	// setConfiguration for usage.
	configuration *configuration

	pluginAPI *pluginapi.Client

	licenseChecker *enterprise.LicenseChecker
}

func (p *Plugin) getTranslationEnabledKey(channelID string) string {
	return fmt.Sprintf("%s_%s", translationEnabledKey, channelID)
}

func (p *Plugin) setChannelTranslationEnabled(channelID string, enabled bool) error {
	key := p.getTranslationEnabledKey(channelID)
	if _, err := p.pluginAPI.KV.Set(key, enabled); err != nil {
		return fmt.Errorf("failed to set channel translation status: %w", err)
	}
	p.pluginAPI.Log.Debug("channel translation status set", "channelID", channelID, "enabled", enabled)
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
	p.pluginAPI.Log.Debug("channel translation status", "channelID", channelID, "enabled", enabled)
	return enabled, nil
}

func (p *Plugin) OnActivate() error {
	p.pluginAPI = pluginapi.NewClient(p.API, p.Driver)
	p.licenseChecker = enterprise.NewLicenseChecker(p.pluginAPI)
	return nil
}
