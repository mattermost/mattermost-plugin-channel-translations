// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/mattermost/mattermost-plugin-ai/server/llm"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

const (
	ActivateAIProp  = "activate_ai"
	FromWebhookProp = "from_webhook"
	FromBotProp     = "from_bot"
	FromPluginProp  = "from_plugin"
	WranglerProp    = "wrangler"
)

var (
	// ErrNoResponse is returned when no response is posted under a normal condition.
	ErrNoResponse = errors.New("no response")
)

func (p *Plugin) MessageHasBeenPosted(c *plugin.Context, post *model.Post) {
	if err := p.handleMessages(post); err != nil {
		if errors.Is(err, ErrNoResponse) {
			p.pluginAPI.Log.Debug(err.Error())
		} else {
			p.pluginAPI.Log.Error(err.Error())
		}
	}
}

func (p *Plugin) handleMessages(post *model.Post) error {
	// Process translations first
	if err := p.handleTranslations(post); err != nil {
		p.pluginAPI.Log.Error("Failed to handle translations", "error", err)
	}

	// Don't respond to ourselves
	if p.IsAnyBot(post.UserId) {
		return fmt.Errorf("not responding to ourselves: %w", ErrNoResponse)
	}

	// Never respond to remote posts
	if post.RemoteId != nil && *post.RemoteId != "" {
		return fmt.Errorf("not responding to remote posts: %w", ErrNoResponse)
	}

	// Wrangler posts should be ignored
	if post.GetProp(WranglerProp) != nil {
		return fmt.Errorf("not responding to wrangler posts: %w", ErrNoResponse)
	}

	// Don't respond to plugins unless they ask for it
	if post.GetProp(FromPluginProp) != nil && post.GetProp(ActivateAIProp) == nil {
		return fmt.Errorf("not responding to plugin posts: %w", ErrNoResponse)
	}

	// Don't respond to webhooks
	if post.GetProp(FromWebhookProp) != nil {
		return fmt.Errorf("not responding to webhook posts: %w", ErrNoResponse)
	}

	channel, err := p.pluginAPI.Channel.Get(post.ChannelId)
	if err != nil {
		return fmt.Errorf("unable to get channel: %w", err)
	}

	postingUser, err := p.pluginAPI.User.Get(post.UserId)
	if err != nil {
		return err
	}

	// Don't respond to other bots unless they ask for it
	if (postingUser.IsBot || post.GetProp(FromBotProp) != nil) && post.GetProp(ActivateAIProp) == nil {
		return fmt.Errorf("not responding to other bots: %w", ErrNoResponse)
	}

	// Check we are mentioned like @ai
	if bot := p.GetBotMentioned(post.Message); bot != nil {
		return p.handleMentions(bot, post, postingUser, channel)
	}

	// Check if this is post in the DM channel with any bot
	if bot := p.GetBotForDMChannel(channel); bot != nil {
		return p.handleDMs(bot, channel, postingUser, post)
	}

	return nil
}

func (p *Plugin) handleMentions(bot *Bot, post *model.Post, postingUser *model.User, channel *model.Channel) error {
	if err := p.checkUsageRestrictions(postingUser.Id, bot, channel); err != nil {
		return err
	}

	if err := p.processUserRequestToBot(bot, p.MakeConversationContext(bot, postingUser, channel, post)); err != nil {
		return fmt.Errorf("unable to process bot mention: %w", err)
	}

	return nil
}

func (p *Plugin) handleDMs(bot *Bot, channel *model.Channel, postingUser *model.User, post *model.Post) error {
	if err := p.checkUsageRestrictionsForUser(bot, postingUser.Id); err != nil {
		return err
	}

	if err := p.processUserRequestToBot(bot, p.MakeConversationContext(bot, postingUser, channel, post)); err != nil {
		return fmt.Errorf("unable to process bot DM: %w", err)
	}

	return nil
}

// indexOf returns the index of the first instance of substring in s,
// or -1 if substring is not present in s.
func indexOf(s, substr string) int {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return i
		}
	}
	return -1
}

func (p *Plugin) handleTranslations(post *model.Post) error {
	// Skip if global translations are disabled
	if !p.getConfiguration().EnableTranslations {
		return nil
	}

	// Skip empty messages
	if post.Message == "" {
		return nil
	}

	// Skip if already translated
	if _, ok := post.Props["translations"]; ok {
		return nil
	}

	// Check if translations are enabled for this channel
	enabled, err := p.isChannelTranslationEnabled(post.ChannelId)
	if err != nil {
		return fmt.Errorf("failed to check channel translation status: %w", err)
	}
	if !enabled {
		return nil
	}

	// Get configured translation bot
	cfg := p.getConfiguration()
	var bot *Bot
	if cfg.TranslationBotName != "" {
		bot = p.GetBotByUsername(cfg.TranslationBotName)
	}
	if bot == nil {
		// Fallback to first bot if translation bot not found
		bots := p.GetBots()
		if len(bots) > 0 {
			bot = bots[0]
		} else {
			return errors.New("no bot configured for translations")
		}
	}

	user, err := p.pluginAPI.User.Get(bot.mmBot.UserId)
	if err != nil {
		return errors.New("failed to get translation bot user")
	}

	// Get configured languages or use default
	languages := p.getConfiguration().TranslationLanguages
	if languages == "" {
		languages = "english"
	}

	waitGroup := sync.WaitGroup{}
	mutex := sync.Mutex{}
	translations := make(map[string]interface{})

	for _, language := range strings.Split(languages, ",") {
		waitGroup.Add(1)
		go func(lang string) {
			defer waitGroup.Done()
			// Create translation context
			context := p.MakeConversationContext(bot, user, nil, post)
			context.PromptParameters = map[string]string{
				"Message":  post.Message,
				"Language": lang,
			}

			conversation, err := p.prompts.ChatCompletion("translate_message", context, llm.NewNoTools())
			if err != nil {
				p.pluginAPI.Log.Warn(fmt.Sprintf("failed to create translation prompt: %w", err))
				return
			}

			result, err := bot.llm.ChatCompletionNoStream(conversation)
			if err != nil {
				p.pluginAPI.Log.Warn(fmt.Sprintf("failed to get translations: %w", err))
				return
			}

			p.pluginAPI.Log.Debug("Extracted translation raw", "translation", result, "language", lang)

			mutex.Lock()
			translations[lang] = result
			mutex.Unlock()
		}(language)
	}

	waitGroup.Wait()

	// Store translations in post props
	if post.Props == nil {
		post.Props = make(model.StringInterface)
	}
	post.Props["translations"] = translations

	// Update the post
	if err := p.pluginAPI.Post.UpdatePost(post); err != nil {
		return fmt.Errorf("failed to update post with translations: %w", err)
	}

	return nil
}
