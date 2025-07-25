// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// LibreTranslateRequest represents the request payload for LibreTranslate API
type LibreTranslateRequest struct {
	Q          string `json:"q"`
	Source     string `json:"source"`
	Target     string `json:"target"`
	Format     string `json:"format,omitempty"`
	APIKey     string `json:"api_key,omitempty"`
	Alternatives int  `json:"alternatives,omitempty"`
}

// LibreTranslateResponse represents the response from LibreTranslate API
type LibreTranslateResponse struct {
	TranslatedText   string                   `json:"translatedText"`
	DetectedLanguage *LibreDetectedLanguage   `json:"detectedLanguage,omitempty"`
	Alternatives     []string                 `json:"alternatives,omitempty"`
	Error           string                   `json:"error,omitempty"`
}

// LibreDetectedLanguage represents detected language information
type LibreDetectedLanguage struct {
	Language   string  `json:"language"`
	Confidence float64 `json:"confidence"`
}

// LibreTranslateClient handles communication with LibreTranslate API
// Supports multiple endpoints: /translate, /languages, /detect, etc.
type LibreTranslateClient struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client
}

// NewLibreTranslateClient creates a new LibreTranslate client
func NewLibreTranslateClient(baseURL, apiKey string) *LibreTranslateClient {
	return &LibreTranslateClient{
		baseURL:    strings.TrimSuffix(baseURL, "/"),
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// Translate translates text using LibreTranslate API
func (c *LibreTranslateClient) Translate(text, sourceLang, targetLang, format string) (*LibreTranslateResponse, error) {
	if text == "" {
		return nil, fmt.Errorf("text cannot be empty")
	}

	if format == "" {
		format = "text"
	}

	request := LibreTranslateRequest{
		Q:      text,
		Source: sourceLang,
		Target: targetLang,
		Format: format,
	}

	if c.apiKey != "" {
		request.APIKey = c.apiKey
	}

	jsonData, err := json.Marshal(request)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	url := fmt.Sprintf("%s/translate", strings.TrimSuffix(c.baseURL, "/"))
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request to %s: %w", url, err)
	}
	defer resp.Body.Close()

	// Read response body for debugging
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Log the raw response for debugging
	fmt.Printf("LibreTranslate URL: %s\n", url)
	fmt.Printf("LibreTranslate Request: %s\n", string(jsonData))
	fmt.Printf("LibreTranslate Response Status: %d\n", resp.StatusCode)
	fmt.Printf("LibreTranslate Response Body: %s\n", string(bodyBytes))

	var response LibreTranslateResponse
	if err := json.Unmarshal(bodyBytes, &response); err != nil {
		return nil, fmt.Errorf("failed to decode response (status %d): %w - body: %s", resp.StatusCode, err, string(bodyBytes))
	}

	// Handle API errors based on status codes
	if resp.StatusCode != http.StatusOK {
		errorMsg := response.Error
		if errorMsg == "" {
			errorMsg = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}

		switch resp.StatusCode {
		case http.StatusBadRequest:
			return nil, fmt.Errorf("invalid request: %s", errorMsg)
		case http.StatusForbidden:
			return nil, fmt.Errorf("access forbidden: %s", errorMsg)
		case http.StatusTooManyRequests:
			return nil, fmt.Errorf("rate limit exceeded: %s", errorMsg)
		case http.StatusInternalServerError:
			return nil, fmt.Errorf("translation service error: %s", errorMsg)
		default:
			return nil, fmt.Errorf("API error: %s", errorMsg)
		}
	}

	return &response, nil
}

// mapMattermostToLibreLanguage maps Mattermost language codes to LibreTranslate language codes
func mapMattermostToLibreLanguage(mattermostLang string) string {
	// Language mapping between Mattermost language codes and LibreTranslate codes
	langMap := map[string]string{
		"bg":    "bg",    // Bulgarian
		"de":    "de",    // German
		"en":    "en",    // English
		"en-AU": "en",    // English (Australia) -> English
		"es":    "es",    // Spanish
		"fa":    "fa",    // Persian
		"fr":    "fr",    // French
		"hu":    "hu",    // Hungarian
		"it":    "it",    // Italian
		"ja":    "ja",    // Japanese
		"ko":    "ko",    // Korean
		"nl":    "nl",    // Dutch
		"pl":    "pl",    // Polish
		"pt-BR": "pt",    // Portuguese (Brazil) -> Portuguese
		"ro":    "ro",    // Romanian
		"ru":    "ru",    // Russian
		"sv":    "sv",    // Swedish
		"tr":    "tr",    // Turkish
		"uk":    "uk",    // Ukrainian
		"vi":    "vi",    // Vietnamese
		"zh-CN": "zh",    // Chinese (Simplified) -> Chinese
		"zh-TW": "zh",    // Chinese (Traditional) -> Chinese
	}

	// Trim whitespace and convert to lowercase
	langCode := strings.ToLower(strings.TrimSpace(mattermostLang))
	
	if mapped, exists := langMap[langCode]; exists {
		return mapped
	}
	
	// If no mapping found, return the original (it might already be a valid LibreTranslate code)
	return langCode
}

// translateWithLibreTranslate translates text using LibreTranslate
func (p *Plugin) translateWithLibreTranslate(message, langCode string) (string, error) {
	config := p.getConfiguration()
	
	if config.LibreTranslateURL == "" {
		return "", fmt.Errorf("LibreTranslate URL not configured")
	}

	client := NewLibreTranslateClient(config.LibreTranslateURL, config.LibreTranslateAPIKey)
	
	targetLang := mapMattermostToLibreLanguage(langCode)
	format := config.LibreTranslateFormat
	if format == "" {
		format = "text"
	}

	response, err := client.Translate(message, "auto", targetLang, format)
	if err != nil {
		return "", fmt.Errorf("LibreTranslate API error: %w", err)
	}

	if response.TranslatedText == "" {
		return "", fmt.Errorf("empty translation received from LibreTranslate")
	}

	return response.TranslatedText, nil
}