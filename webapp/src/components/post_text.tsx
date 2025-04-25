// Copyright (c) 2023-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useSelector} from 'react-redux';

import {GlobalState} from '@mattermost/types/store';
import {Channel} from '@mattermost/types/channels';
import {Team} from '@mattermost/types/teams';

export type ChannelNamesMap = {
    [name: string]: {
        display_name: string;
        team_name?: string;
    } | Channel;
};

interface Props {
    message: string;
    channelID: string;
    postID: string;
    channelNamesMap?: ChannelNamesMap;
}

const PostText = (props: Props) => {
    const channel = useSelector<GlobalState, Channel | undefined>((state) =>
        state.entities?.channels?.channels?.[props.channelID]);
    const team = useSelector<GlobalState, Team | undefined>((state) =>
        state.entities?.teams?.teams?.[channel?.team_id || '']);
    const siteURL = useSelector<GlobalState, string | undefined>((state) =>
        state.entities?.general?.config?.SiteURL);

    // @ts-ignore
    const {formatText, messageHtmlToComponent} = window.PostUtils;

    const markdownOptions = {
        singleline: false,
        mentionHighlight: true,
        atMentions: true,
        team,
        unsafeLinks: true,
        minimumHashtagLength: 3,
        siteURL,
        channelNamesMap: props.channelNamesMap,
    };

    const messageHtmlToComponentOptions = {
        hasPluginTooltips: true,
        latex: false,
        inlinelatex: false,
        postId: props.postID,
    };

    let text = messageHtmlToComponent(
        formatText(props.message, markdownOptions),
        messageHtmlToComponentOptions,
    );

    if (!text) {
        text = <p/>;
    }

    return (
        <div data-testid='posttext'>
            {text}
        </div>
    );
};

export default PostText;
