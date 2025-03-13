// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"fmt"
	"strings"
	"sync"

	"github.com/mattermost/mattermost-plugin-ai/client"
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

	aiClient := client.New()

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

			promptParameters := map[string]string{
				"Message":  post.Message,
				"Language": lang,
			}
			prompt := `
{{define "translate_message.system"}}
You are a translation expert. Translate the given text to the requested languages.

You consider the text to translate the one contained between <text-to-translate></text-to-translate> tag.

You always provide the most accurate and literal translation possible.

You always provide the translations for all the lines in the translatable text.

You don't change the emojis text from their original form, for example, :heart_eyes: should be kept as :heart_eyes:.

Do not include any other text or explanation.

For example, the text:
<text-to-translate>
Noted, @jespino . So no "on the fly" server reload is implemented ? :heart_eyes:

This is a question, not a criticism, especially as the binary runs on an Alpine container, so no systemd
</text-to-translate>

should be translated to:

Anotado, @jespino . Así que no esta implementada la recarga del servidor \"al vuelo\"? :heart_eyes:

Esto es una pregunta, no una crítica, especialmente porque el binario se ejecuta en un contenedor Alpine, por lo que no hay systemd
{{end}}

{{define "translate_message.user"}}
<text-to-translate>
{{.PromptParameters.Message}}
</text-to-translate>

Target language: {{.PromptParameters.Language}}

{{end}}
			`

			result, err := aiClient.Run(p.getConfiguration().Config.TranslationBotName, prompt, promptParameters)
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
