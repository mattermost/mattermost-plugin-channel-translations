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
	systemPrompt := `
You are a translation expert. Translate the given text to the requested languages.

You consider the text to translate the one contained between <text-to-translate></text-to-translate> tag.

You always provide the most accurate and literal translation possible.

You always provide the translations for all the lines in the translatable text.

You don't change the emojis text from their original form, for example, :heart_eyes: should be kept as :heart_eyes:.

Do not include the original text in the translation.

Take into account that we are translating messages inside Mattermost, so they are written in markdown, and you should keep intact things like user mentions ( @user ), code blocks, channel mentions ( ~channelname ), hashtags ( #hashtag ), etc.

You should always preserve the original text of the hashtags, channel mentions, and user mentions, also be sure that you put spaces between the hashtags and the other text.

Do not include any other text or explanation.

{{if .RequestingUser.Locale}}
The message creator locale is '{{.RequestingUser.Locale}}', if you doubt about the meaning of a word, you can use it to help you.
{{end}}

For example, the text:
<text-to-translate>
Noted, @jespino . So no "on the fly" server reload is implemented ? :heart_eyes:

This is a question, not a criticism, especially as the binary runs on an Alpine container, so no systemd
</text-to-translate>

should be translated to:

Anotado, @jespino . Así que no esta implementada la recarga del servidor \"al vuelo\"? :heart_eyes:

Esto es una pregunta, no una crítica, especialmente porque el binario se ejecuta en un contenedor Alpine, por lo que no hay systemd`

	userPrompt := `
<text-to-translate>
{{.Parameters.Message}}
</text-to-translate>

Target language: {{.Parameters.Language}}`
	request := interpluginclient.SimpleCompletionRequest{
		SystemPrompt:    systemPrompt,
		UserPrompt:      userPrompt,
		BotUsername:     p.getConfiguration().Config.TranslationBotName,
		RequesterUserID: requestorID,
		Parameters:      promptParameters,
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	result, err := client.SimpleCompletionWithContext(ctx, request)
	if err != nil {
		return "", err
	}

	p.pluginAPI.Log.Debug("Extracted translation raw", "translation", result, "language", lang)

	if result == "" {
		result = " "
	}
	return result, nil
}
