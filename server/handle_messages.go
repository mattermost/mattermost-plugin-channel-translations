// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"context"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/mattermost/mattermost-plugin-ai/interpluginclient"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

func (p *Plugin) MessageWillBePosted(c *plugin.Context, post *model.Post) (*model.Post, string) {
	if !p.getConfiguration().EnableTranslations {
		return post, ""
	}

	// Skip empty messages
	if post.Message == "" {
		return post, ""
	}

	// Skip if already translated
	if _, ok := post.Props["translations"]; ok {
		return post, ""
	}

	// Check if translations are enabled for this channel
	enabled, err := p.isChannelTranslationEnabled(post.ChannelId)
	if err != nil {
		return post, ""
	}
	if !enabled {
		return post, ""
	}

	newPost := post.Clone()
	newPost.Type = "custom_translation"
	return newPost, ""
}

func (p *Plugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	// Skip if global translations are disabled
	if !p.getConfiguration().EnableTranslations {
		return
	}

	// Skip empty messages
	if post.Message == "" {
		return
	}

	// Skip if already translated
	if _, ok := post.Props["translations"]; ok {
		return
	}

	// Check if translations are enabled for this channel
	enabled, err := p.isChannelTranslationEnabled(post.ChannelId)
	if err != nil {
		p.pluginAPI.Log.Debug("failed to check channel translation status", "error", err)
		return
	}
	if !enabled {
		return
	}

	// Get configured languages or use default
	languages := p.getConfiguration().TranslationLanguages
	if languages == "" {
		languages = "english"
	}

	waitGroup := sync.WaitGroup{}
	mutex := sync.Mutex{}
	translations := make(map[string]interface{})
	waitlist := make(chan struct{}, 3)

	for _, language := range strings.Split(languages, ",") {
		waitlist <- struct{}{}
		waitGroup.Add(1)
		go func(lang string) {
			defer waitGroup.Done()

			client, err := interpluginclient.NewClient(&p.MattermostPlugin)
			if err != nil {
				p.pluginAPI.Log.Warn(fmt.Sprintf("failed to create AI client: %w", err))
				return
			}

			promptParameters := map[string]any{
				"Message":  post.Message,
				"Language": lang,
			}
			systemPrompt := `
You are a translation expert. Translate the given text to the requested languages.

You consider the text to translate the one contained between <text-to-translate></text-to-translate> tag.

You always provide the most accurate and literal translation possible.

You always provide the translations for all the lines in the translatable text.

You don't change the emojis text from their original form, for example, :heart_eyes: should be kept as :heart_eyes:.

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
			request := interpluginclient.CompletionRequest{
				SystemPrompt:    systemPrompt,
				UserPrompt:      userPrompt,
				BotUsername:     p.getConfiguration().Config.TranslationBotName,
				RequesterUserID: post.UserId,
				Parameters:      promptParameters,
			}

			ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
			defer cancel()

			result, err := client.CompletionWithContext(ctx, request)
			if err != nil {
				p.pluginAPI.Log.Warn(fmt.Sprintf("failed to get translations: %w", err))
				return
			}

			p.pluginAPI.Log.Debug("Extracted translation raw", "translation", result, "language", lang)

			mutex.Lock()
			translations[lang] = result
			// Store translations in post props
			if post.Props == nil {
				post.Props = make(model.StringInterface)
			}
			post.Props["translations"] = translations
			_ = p.pluginAPI.Post.UpdatePost(post)
			mutex.Unlock()
			<-waitlist
		}(language)
	}

	waitGroup.Wait()
	close(waitlist)

	// Store translations in post props
	if post.Props == nil {
		post.Props = make(model.StringInterface)
	}
	post.Props["translations"] = translations

	// Update the post
	if err := p.pluginAPI.Post.UpdatePost(post); err != nil {
		p.pluginAPI.Log.Debug("failed to update post with translations", "error", err)
		return
	}
}
