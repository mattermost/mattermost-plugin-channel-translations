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

type TranslationLanguagesResponse struct {
	Languages      []string `json:"languages"`
	UserPreference string   `json:"userPreference"`
}

type SetTranslationLanguageRequest struct {
	Language string `json:"language"`
}

type TranslatePostRequest struct {
	Lang string `json:"lang"`
}

func (p *Plugin) ServeHTTP(c *plugin.Context, w http.ResponseWriter, r *http.Request) {
	router := gin.Default()
	router.Use(p.ginlogger)
	router.Use(p.MattermostAuthorizationRequired)

	router.POST("/channel/:channelid/translations", p.handleSetChannelTranslations)
	router.GET("/channel/:channelid/translations", p.handleGetChannelTranslationStatus)
	router.GET("/translation/languages", p.handleGetTranslationLanguages)
	router.POST("/translation/user_preference", p.handleSetUserTranslationLanguage)
	router.POST("/post/:postid/translate", p.handleTranslatePost)

	router.ServeHTTP(w, r)
}

func (p *Plugin) ginlogger(c *gin.Context) {
	c.Next()

	for _, ginErr := range c.Errors {
		p.pluginAPI.Log.Error(ginErr.Error())
	}
}

func (p *Plugin) MattermostAuthorizationRequired(c *gin.Context) {
	userID := c.GetHeader("Mattermost-User-Id")
	if userID == "" {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
}

func getUserTranslationPreferenceKey(userID string) string {
	return fmt.Sprintf("user_translation_preference_%s", userID)
}

func (p *Plugin) handleGetTranslationLanguages(c *gin.Context) {
	userID := c.GetHeader("Mattermost-User-Id")
	configuredLanguages := []string{}
	if p.getConfiguration().TranslationLanguages != "" {
		configuredLanguages = strings.Split(p.getConfiguration().TranslationLanguages, ",")
		for i, lang := range configuredLanguages {
			configuredLanguages[i] = strings.TrimSpace(lang)
		}
	}
	var preference string
	_ = p.pluginAPI.KV.Get(getUserTranslationPreferenceKey(userID), &preference)
	response := TranslationLanguagesResponse{
		Languages:      configuredLanguages,
		UserPreference: preference,
	}
	c.JSON(http.StatusOK, response)
}

func (p *Plugin) handleSetUserTranslationLanguage(c *gin.Context) {
	userID := c.GetHeader("Mattermost-User-Id")

	var req SetTranslationLanguageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if _, err := p.pluginAPI.KV.Set(getUserTranslationPreferenceKey(userID), []byte(req.Language)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save preference"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

func (p *Plugin) handleTranslatePost(c *gin.Context) {
	postID := c.Param("postid")
	userID := c.GetHeader("Mattermost-User-Id")

	var req TranslatePostRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post, err := p.pluginAPI.Post.GetPost(postID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get post"})
		return
	}

	if !p.pluginAPI.User.HasPermissionToChannel(userID, post.ChannelId, model.PermissionReadChannel) {
		c.AbortWithError(http.StatusForbidden, errors.New("user doesn't have permission to read post"))
		return
	}

	if post.Message == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot translate empty message"})
		return
	}

	if isSystemMessage(post) && !p.getConfiguration().TranslateSystemMessages {
		c.JSON(http.StatusBadRequest, gin.H{"error": "System messages translation is disabled"})
		return
	}

	translatedText, err := p.translateText(post.Message, userID, req.Lang)
	if err != nil {
		p.pluginAPI.Log.Error("Failed to translate post", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to translate post"})
		return
	}

	if post.Props == nil {
		post.Props = make(model.StringInterface)
	}

	translations, ok := post.Props["translations"].(map[string]interface{})
	if !ok {
		translations = make(map[string]interface{})
	}

	translations[req.Lang] = translatedText
	post.Props["translations"] = translations

	if err := p.pluginAPI.Post.UpdatePost(post); err != nil {
		p.pluginAPI.Log.Error("Failed to update post with translation", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update post with translation"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"translatedText": translatedText,
		"originalText":   post.Message,
		"targetLanguage": req.Lang,
	})
}

func (p *Plugin) handleSetChannelTranslations(c *gin.Context) {
	channelID := c.Param("channelid")
	userID := c.GetHeader("Mattermost-User-Id")

	channel, err := p.pluginAPI.Channel.Get(channelID)
	if err != nil {
		c.AbortWithError(http.StatusInternalServerError, err)
		return
	}

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

func (p *Plugin) handleGetChannelTranslationStatus(c *gin.Context) {
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
