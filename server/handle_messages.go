// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"strings"
	"sync"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

// isSystemMessage checks if a post is a system message
func isSystemMessage(post *model.Post) bool {
	return post.Type != "" && post.Type != "custom_translation"
}

func (p *Plugin) MessageHasBeenUpdated(c *plugin.Context, post *model.Post, oldPost *model.Post) {
	// Only update the translation if the update is made by a user (not a plugin or bot)
	if c.SessionId != "" {
		p.MessageHasBeenPosted(c, post)
	}
}

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

	// Skip system messages if translateSystemMessages is disabled
	if isSystemMessage(post) && !p.getConfiguration().TranslateSystemMessages {
		return post, ""
	}

	// Check if translations are enabled for this channel
	enabled, err := p.isChannelTranslationEnabled(post.ChannelId)
	if err != nil || !enabled {
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

	// Skip system messages if translateSystemMessages is disabled
	if isSystemMessage(post) && !p.getConfiguration().TranslateSystemMessages {
		return
	}

	// Check if translations are enabled for this channel
	enabled, err := p.isChannelTranslationEnabled(post.ChannelId)
	if err != nil || !enabled {
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
		go func(langCode string) {
			defer waitGroup.Done()
			maxRetry := 10

			for {
				result, err := p.translateText(post.Message, post.UserId, langCode)
				if err != nil {
					maxRetry--
					if maxRetry == 0 {
						break
					}
					continue
				}

				mutex.Lock()
				translations[langCode] = result
				// Store translations in post props
				if post.Props == nil {
					post.Props = make(model.StringInterface)
				}
				post.Props["translations"] = translations
				// Ensure the post type remains as custom_translation
				post.Type = "custom_translation"
				_ = p.pluginAPI.Post.UpdatePost(post)
				mutex.Unlock()
				<-waitlist
				break
			}
		}(language)
	}

	waitGroup.Wait()
	close(waitlist)
}
