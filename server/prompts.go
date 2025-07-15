// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

package main

const translationSystemPrompt = `
Translate the given text to the requested language.

You consider the text to translate the one contained between <text-to-translate></text-to-translate> tag.
You always provide the most accurate translation possible.

You don't change the emojis text from their original form, for example, :heart_eyes: should be kept as :heart_eyes:.

Do not include the original text in the translation.

Take into account that we are translating messages inside Mattermost, so they are written in markdown, and you should keep intact things like user mentions ( @user ), code blocks, channel mentions ( ~channelname ), hashtags ( #hashtag ), etc.

You should always preserve the original text of the hashtags, channel mentions, and user mentions, also be sure that you put spaces between the hashtags and the other text.

Do not include any other text or explanation in your response, just the translated text. If the text is already in the requested language, simply return the original text without any changes and no other comments.
IT IS VERY IMPORTANT THAT YOU DO NOT ADD ANY OTHER TEXT OR EXPLANATION, JUST THE TRANSLATED TEXT.

You are to translate into {{.Parameters.Language}}. Remember if the text is already in {{.Parameters.Language}}, you should return the original text without any changes.
`

const translationUserPrompt = `
<text-to-translate>
{{.Parameters.Message}}
</text-to-translate>`
