// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

const (
	ContextPostKey    = "post"
	ContextChannelKey = "channel"
	ContextBotKey     = "bot"
)

func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	router := gin.Default()
	router.Use(p.ginlogger)
	router.Use(p.MattermostAuthorizationRequired)

	// Translations endpoints don't require bot authorization
	translationsRouter := router.Group("/channel/:channelid")
	translationsRouter.POST("/translations", p.handleToggleTranslations)
	translationsRouter.GET("/translations", p.handleGetTranslationStatus)

	// Translation language endpoints
	router.GET("/translation/languages", p.handleGetTranslationLanguages)
	router.POST("/translation/user_preference", p.handleSetUserTranslationLanguage)
	
	// Post translation endpoints
	router.POST("/post/:postid/translate", p.handleTranslatePost)

	router.ServeHTTP(w, r)
}

func (p *Plugin) ginlogger(c *gin.Context) {
	c.Next()

	for _, ginErr := range c.Errors {
		p.API.LogError(ginErr.Error())
	}
}

func (p *Plugin) MattermostAuthorizationRequired(c *gin.Context) {
	userID := c.GetHeader("Mattermost-User-Id")
	if userID == "" {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
}

// Translation Language Preferences API
type TranslationLanguagesResponse struct {
	Languages      []string `json:"languages"`
	UserPreference string   `json:"userPreference"`
}

func (p *Plugin) handleGetTranslationLanguages(c *gin.Context) {
	userID := c.GetHeader("Mattermost-User-Id")

	// Get configured languages from the plugin config
	configuredLanguages := []string{}
	if p.getConfiguration().TranslationLanguages != "" {
		configuredLanguages = strings.Split(p.getConfiguration().TranslationLanguages, ",")
		// Trim any whitespace
		for i, lang := range configuredLanguages {
			configuredLanguages[i] = strings.TrimSpace(lang)
		}
	}

	// Get user's preference
	preference, _ := p.API.KVGet(getUserTranslationPreferenceKey(userID))

	response := TranslationLanguagesResponse{
		Languages:      configuredLanguages,
		UserPreference: string(preference),
	}

	c.JSON(http.StatusOK, response)
}

type SetTranslationLanguageRequest struct {
	Language string `json:"language"`
}

func (p *Plugin) handleSetUserTranslationLanguage(c *gin.Context) {
	userID := c.GetHeader("Mattermost-User-Id")

	var req SetTranslationLanguageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Save user preference
	if err := p.API.KVSet(getUserTranslationPreferenceKey(userID), []byte(req.Language)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save preference"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func getUserTranslationPreferenceKey(userID string) string {
	return fmt.Sprintf("user_translation_preference_%s", userID)
}

type TranslatePostRequest struct {
	Lang string `json:"lang"`
}

func (p *Plugin) handleTranslatePost(c *gin.Context) {
	postID := c.Param("postid")
	userID := c.GetHeader("Mattermost-User-Id")

	// Parse request body
	var req TranslatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the post
	post, err := p.API.GetPost(postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get post"})
		return
	}

	// Check if user has read permissions for the channel
	if !p.pluginAPI.User.HasPermissionToChannel(userID, post.ChannelId, model.PermissionReadChannel) {
		c.AbortWithError(http.StatusForbidden, errors.New("user doesn't have permission to read post"))
		return
	}

	// TODO: Implement actual translation logic with a translation service
	// For now, we'll just return a mock translation
	translatedText := fmt.Sprintf("[Translated to %s]: %s", req.Lang, post.Message)

	c.JSON(http.StatusOK, gin.H{
		"translatedText": translatedText,
		"originalText": post.Message,
		"targetLanguage": req.Lang,
	})
}

func (p *Plugin) handleToggleTranslations(c *gin.Context) {
	channelID := c.Param("channelid")
	userID := c.GetHeader("Mattermost-User-Id")

	// Get channel to check its type
	channel, err := p.pluginAPI.Channel.Get(channelID)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	// Check if user has admin permissions based on channel type
	hasPermission := false
	if channel.Type == model.ChannelTypePrivate {
		hasPermission = p.pluginAPI.User.HasPermissionToChannel(userID, channelID, model.PermissionManagePrivateChannelProperties)
	} else {
		hasPermission = p.pluginAPI.User.HasPermissionToChannel(userID, channelID, model.PermissionManagePublicChannelProperties)
	}

	if !hasPermission {
		c.AbortWithError(http.StatusForbidden, errors.New("user doesn't have permission to manage channel"))
		return
	}

	var data struct {
		Enabled bool `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&data); err != nil {
		c.AbortWithError(http.StatusBadRequest, err)
		return
	}

	if err := p.setChannelTranslationEnabled(channelID, data.Enabled); err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	// Return the new status in the response
	c.JSON(http.StatusOK, map[string]bool{
		"enabled": data.Enabled,
	})
}

func (p *Plugin) handleGetTranslationStatus(c *gin.Context) {
	channelID := c.Param("channelid")
	userID := c.GetHeader("Mattermost-User-Id")

	// Check if user has read permissions for the channel
	if !p.pluginAPI.User.HasPermissionToChannel(userID, channelID, model.PermissionReadChannel) {
		c.AbortWithError(http.StatusForbidden, errors.New("user doesn't have permission to read channel"))
		return
	}

	enabled, err := p.isChannelTranslationEnabled(channelID)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

	c.JSON(http.StatusOK, map[string]bool{
		"enabled": enabled,
	})
}
