package main

import (
	"embed"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"sync"
	"time"

	"encoding/json"
	"errors"

	sq "github.com/Masterminds/squirrel"
	"github.com/jmoiron/sqlx"
	"github.com/mattermost/mattermost-plugin-ai/server/ai"
	"github.com/mattermost/mattermost-plugin-ai/server/ai/anthropic"
	"github.com/mattermost/mattermost-plugin-ai/server/ai/asksage"
	"github.com/mattermost/mattermost-plugin-ai/server/ai/openai"
	"github.com/mattermost/mattermost-plugin-ai/server/enterprise"
	"github.com/mattermost/mattermost-plugin-ai/server/metrics"
	"github.com/mattermost/mattermost-plugin-ai/server/telemetry"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
	"github.com/mattermost/mattermost/server/public/pluginapi"
	"github.com/mattermost/mattermost/server/public/shared/httpservice"
	"github.com/nicksnyder/go-i18n/v2/i18n"
)

const (
	BotUsername = "ai"

	CallsRecordingPostType = "custom_calls_recording"
	CallsBotUsername       = "calls"
	ZoomBotUsername        = "zoom"

	ffmpegPluginPath = "./plugins/mattermost-ai/server/dist/ffmpeg"
)

//go:embed ai/prompts
var promptsFolder embed.FS

// Plugin implements the interface expected by the Mattermost server to communicate between the server and plugin processes.
type Plugin struct {
	plugin.MattermostPlugin

	// configurationLock synchronizes access to the configuration.
	configurationLock sync.RWMutex

	// configuration is the active plugin configuration. Consult getConfiguration and
	// setConfiguration for usage.
	configuration *configuration

	pluginAPI *pluginapi.Client

	telemetry    *telemetry.Client
	telemetryMut sync.RWMutex

	ffmpegPath string

	db      *sqlx.DB
	builder sq.StatementBuilderType

	prompts *ai.Prompts

	streamingContexts      map[string]PostStreamContext
	streamingContextsMutex sync.Mutex

	// KV store keys
	translationEnabledKey string

	licenseChecker *enterprise.LicenseChecker
	metricsService metrics.Metrics
	metricsHandler http.Handler

	botsLock sync.RWMutex
	bots     []*Bot

	i18n *i18n.Bundle

	llmUpstreamHTTPClient *http.Client
}

func resolveffmpegPath() string {
	_, standardPathErr := exec.LookPath("ffmpeg")
	if standardPathErr != nil {
		_, pluginPathErr := exec.LookPath(ffmpegPluginPath)
		if pluginPathErr != nil {
			return ""
		}
		return ffmpegPluginPath
	}

	return "ffmpeg"
}

func (p *Plugin) getTranslationEnabledKey(channelID string) string {
	return fmt.Sprintf("%s_%s", p.translationEnabledKey, channelID)
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
	p.translationEnabledKey = "translation_enabled"
	p.pluginAPI = pluginapi.NewClient(p.API, p.Driver)

	p.licenseChecker = enterprise.NewLicenseChecker(p.pluginAPI)

	p.metricsService = metrics.NewMetrics(metrics.InstanceInfo{
		InstallationID: os.Getenv("MM_CLOUD_INSTALLATION_ID"),
		PluginVersion:  manifest.Version,
	})
	p.metricsHandler = metrics.NewMetricsHandler(p.GetMetrics())

	p.i18n = i18nInit()

	p.llmUpstreamHTTPClient = httpservice.MakeHTTPServicePlugin(p.API).MakeClient(true)
	p.llmUpstreamHTTPClient.Timeout = time.Minute * 10 // LLM requests can be slow

	if err := p.MigrateServicesToBots(); err != nil {
		p.pluginAPI.Log.Error("failed to migrate services to bots", "error", err)
		// Don't fail on migration errors
	}

	if err := p.EnsureBots(); err != nil {
		p.pluginAPI.Log.Error("Failed to ensure bots", "error", err)
		// Don't fail on ensure bots errors as this leaves the plugin in an awkward state
		// where it can't be configured from the system console.
	}

	if err := p.SetupDB(); err != nil {
		return err
	}

	var err error
	p.prompts, err = ai.NewPrompts(promptsFolder)
	if err != nil {
		return err
	}

	p.ffmpegPath = resolveffmpegPath()
	if p.ffmpegPath == "" {
		p.pluginAPI.Log.Error("ffmpeg not installed, transcriptions will be disabled.", "error", err)
	}

	p.streamingContexts = map[string]PostStreamContext{}

	return nil
}

func (p *Plugin) OnDeactivate() error {
	if err := p.uninitTelemetry(); err != nil {
		p.API.LogError(err.Error())
	}
	return nil
}

func (p *Plugin) getLLM(llmBotConfig ai.BotConfig) ai.LanguageModel {
	llmMetrics := p.metricsService.GetMetricsForAIService(llmBotConfig.Name)

	var llm ai.LanguageModel
	switch llmBotConfig.Service.Type {
	case "openai":
		llm = openai.New(llmBotConfig.Service, p.llmUpstreamHTTPClient, llmMetrics)
	case "openaicompatible":
		llm = openai.NewCompatible(llmBotConfig.Service, p.llmUpstreamHTTPClient, llmMetrics)
	case "azure":
		llm = openai.NewAzure(llmBotConfig.Service, p.llmUpstreamHTTPClient, llmMetrics)
	case "anthropic":
		llm = anthropic.New(llmBotConfig.Service, p.llmUpstreamHTTPClient, llmMetrics)
	case "asksage":
		llm = asksage.New(llmBotConfig.Service, p.llmUpstreamHTTPClient, llmMetrics)
	}

	cfg := p.getConfiguration()
	if cfg.EnableLLMTrace {
		llm = NewLanguageModelLogWrapper(p.pluginAPI.Log, llm)
	}

	llm = NewLLMTruncationWrapper(llm)

	return llm
}

func (p *Plugin) getTranscribe() ai.Transcriber {
	cfg := p.getConfiguration()
	var botConfig ai.BotConfig
	for _, bot := range cfg.Bots {
		if bot.Name == cfg.TranscriptGenerator {
			botConfig = bot
			break
		}
	}
	llmMetrics := p.metricsService.GetMetricsForAIService(botConfig.Name)
	switch botConfig.Service.Type {
	case "openai":
		return openai.New(botConfig.Service, p.llmUpstreamHTTPClient, llmMetrics)
	case "openaicompatible":
		return openai.NewCompatible(botConfig.Service, p.llmUpstreamHTTPClient, llmMetrics)
	case "azure":
		return openai.NewAzure(botConfig.Service, p.llmUpstreamHTTPClient, llmMetrics)
	}
	return nil
}

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

const (
	ActivateAIProp  = "activate_ai"
	FromWebhookProp = "from_webhook"
	FromBotProp     = "from_bot"
	FromPluginProp  = "from_plugin"
	WranglerProp    = "wrangler"
)

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

	// Wranger posts should be ignored
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

	p.track(evAIBotMention, map[string]any{
		"actual_user_id":   postingUser.Id,
		"bot_id":           bot.mmBot.UserId,
		"bot_service_type": bot.cfg.Service.Type,
	})

	if err := p.processUserRequestToBot(bot, p.MakeConversationContext(bot, postingUser, channel, post)); err != nil {
		return fmt.Errorf("unable to process bot mention: %w", err)
	}

	return nil
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

	// Create translation context
	context := p.MakeConversationContext(bot, nil, nil, post)
	context.PromptParameters = map[string]string{
		"Message":   post.Message,
		"Languages": "es,fr,en",
	}

	// Get translations
	conversation, err := p.prompts.ChatCompletion("translate_message", context, ai.NewNoTools())
	if err != nil {
		return fmt.Errorf("failed to create translation prompt: %w", err)
	}

	result, err := bot.llm.ChatCompletionNoStream(conversation)
	if err != nil {
		return fmt.Errorf("failed to get translations: %w", err)
	}

	// Parse JSON response
	translations := make(map[string]interface{})
	if err := json.Unmarshal([]byte(result), &translations); err != nil {
		return fmt.Errorf("failed to parse translations: %w", err)
	}

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

func (p *Plugin) handleDMs(bot *Bot, channel *model.Channel, postingUser *model.User, post *model.Post) error {
	if err := p.checkUsageRestrictionsForUser(bot, postingUser.Id); err != nil {
		return err
	}

	if post.RootId == "" {
		p.track(evUserStartedConversation, map[string]any{
			"user_actual_id":   postingUser.Id,
			"bot_id":           bot.mmBot.UserId,
			"bot_service_type": bot.cfg.Service.Type,
		})
	} else {
		p.track(evContinueConversation, map[string]any{
			"user_actual_id":   postingUser.Id,
			"bot_id":           bot.mmBot.UserId,
			"bot_service_type": bot.cfg.Service.Type,
		})
	}

	if err := p.processUserRequestToBot(bot, p.MakeConversationContext(bot, postingUser, channel, post)); err != nil {
		return fmt.Errorf("unable to process bot DM: %w", err)
	}

	return nil
}
